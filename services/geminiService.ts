// FIX: Replaced GenerateContentRequest with GenerateContentParameters, which is the correct type.
import { GoogleGenAI, Modality, GenerateContentResponse, GenerateContentParameters } from '@google/genai';
import { API_KEY } from '../config';

// Helper to extract base64 data from a data URL
const getBase64Data = (dataUrl: string) => dataUrl.split(',')[1];
const getMimeType = (dataUrl: string) => dataUrl.split(';')[0].split(':')[1];

const IMAGE_PROMPT = `Create a photorealistic image in a portrait 9:16 aspect ratio where the person from the second image (the adult) is tenderly hugging the person from the first image (the child). This should look like an adult embracing their younger self in a timeless moment. Render the scene with soft, natural lighting against a smooth, plain, off-white background to evoke a sense of warmth and memory.`;
const VIDEO_PROMPT = `Animate this image with subtle, gentle motion. This is a short, heartwarming video where the adult gently hugs their younger self. Add a gentle sway, a soft blink, or a hint of a smile. The animation should be slow and serene, emphasizing the emotional connection. The lighting and background should remain soft and natural as in the source image.`;


export const generateHugImage = async (childPhotoBase64: string, adultPhotoBase64: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: getBase64Data(childPhotoBase64), mimeType: getMimeType(childPhotoBase64) } },
        { inlineData: { data: getBase64Data(adultPhotoBase64), mimeType: getMimeType(adultPhotoBase64) } },
        { text: IMAGE_PROMPT },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const base64ImageBytes: string = part.inlineData.data;
      const mimeType = part.inlineData.mimeType;
      return `data:${mimeType};base64,${base64ImageBytes}`;
    }
  }

  throw new Error('Image generation failed: no image data received.');
};

export const generateHugVideo = async (childPhotoBase64: string, adultPhotoBase64: string): Promise<string> => {
    const baseImage = await generateHugImage(childPhotoBase64, adultPhotoBase64);
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: VIDEO_PROMPT,
      image: {
        imageBytes: getBase64Data(baseImage),
        mimeType: getMimeType(baseImage),
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16',
      },
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error('Video generation failed: no download link received.');
    }

    const apiKey = API_KEY;
    const response = await fetch(`${downloadLink}&key=${apiKey}`);
    if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
    }
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
};

export const generateImageWithImagen = async (prompt: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: prompt,
    config: {
      numberOfImages: 4,
      outputMimeType: 'image/png',
      aspectRatio: '1:1',
    },
  });

  return response.generatedImages.map(img => {
    const base64ImageBytes: string = img.image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
  });
};

export const editImage = async (imageBase64: string, prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: getBase64Data(imageBase64), mimeType: getMimeType(imageBase64) } },
        { text: prompt },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const base64ImageBytes: string = part.inlineData.data;
      const mimeType = part.inlineData.mimeType;
      return `data:${mimeType};base64,${base64ImageBytes}`;
    }
  }

  throw new Error('Image editing failed: no image data received.');
};

export const groundedSearch = async (prompt: string, tool: 'googleSearch' | 'googleMaps', location: {latitude: number, longitude: number} | null = null): Promise<GenerateContentResponse> => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const request: GenerateContentParameters = {
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: tool === 'googleSearch' ? [{googleSearch: {}}] : [{googleMaps: {}}],
        },
    };

    if (tool === 'googleMaps' && location) {
        request.config.toolConfig = {
            retrievalConfig: {
                latLng: location,
            }
        };
    }

    const response = await ai.models.generateContent(request);
    return response;
};