import React, { useState, useEffect, useRef } from 'react';
// FIX: Removed LiveSession as it's not an exported member from @google/genai.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { API_KEY } from '../config';

type ConversationState = 'idle' | 'connecting' | 'active' | 'error';
interface TranscriptEntry {
    speaker: 'user' | 'model';
    text: string;
}

// FIX: Added a local interface for LiveSession for type safety since it's not exported.
interface LiveSession {
    sendRealtimeInput(input: { media: Blob }): void;
    close(): void;
}

// Audio helper functions
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

const UserIcon = () => (
    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
      U
    </div>
);

const ModelIcon = () => (
    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
    </div>
);


export default function AICompanion() {
    const [conversationState, setConversationState] = useState<ConversationState>('idle');
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [error, setError] = useState<string | null>(null);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    const connectAndListen = async () => {
        setConversationState('connecting');
        setError(null);
        setTranscript([]);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const ai = new GoogleGenAI({ apiKey: API_KEY });
            // FIX: Use a compatibility variable for AudioContext to support older browsers and satisfy TypeScript.
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const outputAudioContext = new AudioContext({ sampleRate: 24000 });
            const outputNode = outputAudioContext.createGain();
            outputNode.connect(outputAudioContext.destination);
            let nextStartTime = 0;

            sessionPromiseRef.current = ai.live.connect({
                // FIX: Corrected typo in model name.
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setConversationState('active');
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
                        // FIX: Use refs to correctly accumulate transcription across multiple messages.
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                        }
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                        }

                        if (message.serverContent?.turnComplete) {
                            const fullInput = currentInputTranscriptionRef.current;
                            const fullOutput = currentOutputTranscriptionRef.current;

                            if (fullInput) {
                                setTranscript(prev => [...prev, { speaker: 'user', text: fullInput }]);
                            }
                            if (fullOutput) {
                                setTranscript(prev => [...prev, { speaker: 'model', text: fullOutput }]);
                            }
                            
                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio) {
                            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                            const source = outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputNode);
                            // FIX: Manage audio sources for proper cleanup and interruption handling.
                            source.addEventListener('ended', () => {
                                audioSourcesRef.current.delete(source);
                            });
                            source.start(nextStartTime);
                            nextStartTime += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }

                        // FIX: Handle conversation interruptions gracefully.
                        if (message.serverContent?.interrupted) {
                            for (const source of audioSourcesRef.current) {
                                source.stop();
                            }
                            audioSourcesRef.current.clear();
                            nextStartTime = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        setError('An error occurred during the session.');
                        console.error(e);
                        setConversationState('error');
                    },
                    onclose: () => {
                        setConversationState('idle');
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                },
            });

        } catch (err) {
            setError('Could not start the microphone. Please grant permission.');
            setConversationState('error');
            console.error(err);
        }
    };

    const stopConversation = () => {
        sessionPromiseRef.current?.then((session) => {
            session.close();
        });
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        audioContextRef.current?.close();
        
        for (const source of audioSourcesRef.current) {
            source.stop();
        }
        audioSourcesRef.current.clear();

        sessionPromiseRef.current = null;
        setConversationState('idle');
    };
    
    useEffect(() => {
        return () => {
            // Cleanup on component unmount
            if (conversationState === 'active' || conversationState === 'connecting') {
                stopConversation();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationState]);


    return (
        <div>
            <p className="text-center text-lg md:text-xl mb-8 text-gray-600 dark:text-gray-400">
                Talk with a friendly AI companion in real-time. Start the conversation and see what you can discover together.
            </p>

            <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-lg">
                <div className="flex flex-col items-center mb-4">
                    {conversationState === 'idle' || conversationState === 'error' ? (
                        <button onClick={connectAndListen} className="bg-green-500 text-white font-bold py-3 px-8 rounded-full hover:bg-green-600 transition-all duration-300 transform hover:scale-105">
                            Start Conversation
                        </button>
                    ) : (
                        <button onClick={stopConversation} className="bg-red-500 text-white font-bold py-3 px-8 rounded-full hover:bg-red-600 transition-all duration-300 transform hover:scale-105">
                            Stop Conversation
                        </button>
                    )}
                    
                    <div className="mt-4 flex items-center h-8">
                        {conversationState === 'connecting' && <span className="text-gray-500 dark:text-gray-400">Connecting...</span>}
                        {conversationState === 'active' && (
                            <div className="flex items-center space-x-3">
                                <div className="relative w-8 h-8 flex items-center justify-center">
                                    <div className="absolute w-full h-full rounded-full bg-green-500/50 animate-ping"></div>
                                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                                </div>
                                <span className="text-green-400 font-semibold text-lg">Listening...</span>
                            </div>
                        )}
                        {conversationState === 'error' && <span className="text-red-500 font-semibold">{error}</span>}
                    </div>
                </div>

                <div className="h-96 overflow-y-auto p-4 bg-light-bg dark:bg-dark-bg rounded-lg space-y-6">
                    {transcript.length === 0 && <p className="text-gray-500 text-center self-center h-full flex items-center justify-center">Conversation will appear here...</p>}
                    {transcript.map((entry, index) => (
                        <div key={index} className={`flex items-start gap-3 ${entry.speaker === 'user' ? 'flex-row-reverse' : ''}`}>
                            {entry.speaker === 'user' ? <UserIcon /> : <ModelIcon />}
                            <div className={`rounded-xl px-4 py-2 max-w-[80%] shadow ${entry.speaker === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                <p className="text-base">{entry.text}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={transcriptEndRef} />
                </div>
            </div>
        </div>
    );
}