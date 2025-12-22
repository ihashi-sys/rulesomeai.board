
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export async function callGemini(prompt: string, fileData: { mimeType: string, data: string } | null = null): Promise<string | null> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing");
    return null;
  }

  // Correct initialization with named parameter
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const contents: any[] = [{ parts: [{ text: prompt }] }];
    
    if (fileData) {
      contents[0].parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.data
        }
      });
    }

    // Using gemini-3-flash-preview for general text tasks like summarization and task extraction
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents[0],
    });

    // Access text as a property
    return response.text || "";
  } catch (error) {
    console.error("AI Generation failed:", error);
    return null;
  }
}

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
  });
};
