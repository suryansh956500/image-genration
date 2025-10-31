import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from '@google/genai';
import { MainTab } from '../types';
import { API_KEY } from '../config';

interface GlobalVoiceAssistantProps {
    onNavigate: (tab: MainTab) => void;
    onGenerateImage: (prompt: string) => void;
}

interface LiveSession {
    sendRealtimeInput(input: { media: Blob }): void;
    sendToolResponse(response: any): void;
    close(): void;
}

type AssistantState = 'idle' | 'listening' | 'processing';

// Audio helper functions (copied from AICompanion for now, could be refactored into a utils file)
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}


const navigateFunctionDeclaration: FunctionDeclaration = {
    name: 'navigate',
    parameters: {
        type: Type.OBJECT,
        description: 'Navigate to a specific tab in the application.',
        properties: {
            tab: {
                type: Type.STRING,
                description: "The tab to navigate to. Can be 'timeless', 'studio', 'companion', or 'explorer'.",
            },
        },
        required: ['tab'],
    },
};

const generateImageFunctionDeclaration: FunctionDeclaration = {
    name: 'generateImage',
    parameters: {
        type: Type.OBJECT,
        description: "Generate an image based on a user's text prompt.",
        properties: {
            prompt: {
                type: Type.STRING,
                description: "The user's description of the image they want to generate.",
            },
        },
        required: ['prompt'],
    },
};

const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07z" clipRule="evenodd" /></svg>;

const GlobalVoiceAssistant: React.FC<GlobalVoiceAssistantProps> = ({ onNavigate, onGenerateImage }) => {
    const [assistantState, setAssistantState] = useState<AssistantState>('idle');
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

    const toggleAssistant = () => {
        if (assistantState === 'idle') {
            startAssistant();
        } else {
            stopAssistant();
        }
    };
    
    const startAssistant = async () => {
        setAssistantState('listening');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const ai = new GoogleGenAI({ apiKey: API_KEY });
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const outputAudioContext = new AudioContext({ sampleRate: 24000 });
            const outputNode = outputAudioContext.createGain();
            outputNode.connect(outputAudioContext.destination);
            let nextStartTime = 0;

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        const inputAudioContext = new AudioContext({ sampleRate: 16000 });
                        audioContextRef.current = inputAudioContext;
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                let result = 'OK';
                                if (fc.name === 'navigate') {
                                    onNavigate(fc.args.tab as MainTab);
                                } else if (fc.name === 'generateImage') {
                                    // FIX: Cast the 'prompt' argument to a string to satisfy the onGenerateImage prop's type.
                                    onGenerateImage(fc.args.prompt as string);
                                } else {
                                    result = 'Function not found';
                                }
                                sessionPromiseRef.current?.then((session) => {
                                    session.sendToolResponse({
                                        functionResponses: {
                                            id: fc.id,
                                            name: fc.name,
                                            response: { result: result },
                                        }
                                    });
                                });
                            }
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio) {
                            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                            const source = outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputNode);
                            source.start(nextStartTime);
                            nextStartTime += audioBuffer.duration;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Assistant error:', e);
                        stopAssistant();
                    },
                    onclose: () => {
                       stopAssistant();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    tools: [{ functionDeclarations: [navigateFunctionDeclaration, generateImageFunctionDeclaration] }],
                    systemInstruction: "You are a helpful voice assistant for a web application called 'Gemini Creative Suite'. You can navigate between tabs and help generate images. Be concise and confirm actions. The tabs are 'timeless', 'studio', 'companion', and 'explorer'.",
                },
            });

        } catch (err) {
            console.error('Could not start microphone:', err);
            setAssistantState('idle');
        }
    };
    
    const stopAssistant = () => {
        if (assistantState === 'idle') return;

        sessionPromiseRef.current?.then((session) => session.close()).catch(e => console.error("Error closing session:", e));
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        audioContextRef.current?.close().catch(e => console.error("Error closing audio context:", e));
        
        sessionPromiseRef.current = null;
        setAssistantState('idle');
    };
    
    useEffect(() => {
        return () => stopAssistant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <button
            onClick={toggleAssistant}
            className={`fixed bottom-6 right-6 w-16 h-16 rounded-full text-white shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-offset-2 dark:focus:ring-offset-dark-bg focus:ring-light-accent dark:focus:ring-dark-accent ${
                assistantState === 'listening' 
                ? 'bg-red-500 animate-pulse'
                : 'bg-gradient-to-r from-purple-500 to-indigo-600'
            }`}
            aria-label="Toggle Voice Assistant"
        >
            <MicIcon />
        </button>
    );
};

export default GlobalVoiceAssistant;