import { GoogleGenAI, ThinkingLevel, Modality } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const generateContent = async (prompt: string, model: string, config: any) => {
  return await ai.models.generateContent({
    model,
    contents: prompt,
    config
  });
};

export const generateImage = async (prompt: string, model: string, config: any) => {
  return await ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config
  });
};
