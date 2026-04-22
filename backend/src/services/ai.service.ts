import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});


const modelCandidates = [
  process.env.GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-1.5-pro',
].filter((model): model is string => Boolean(model));


const withTimeout = (promise: Promise<any>, ms = 8000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI request timeout')), ms)
    ),
  ]);


const generateWithFallback = async (prompt: string): Promise<string> => {
  let lastError: unknown = null;

  for (const modelName of modelCandidates) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: modelName,
          contents: prompt,
        })
      );

      if (!response?.text) {
        throw new Error('Empty response from model');
      }

      return response.text;
    } catch (error: any) {
      lastError = error;
      const status = error?.status;
      const message = error?.message || 'Unknown error';

      console.warn(
        `[AI] Model ${modelName} failed (${status || 'n/a'}): ${message}`
      );
    }
  }

  throw lastError;
};


const safeJsonParseArray = (text: string): any[] => {
  try {
    // Remove markdown wrappers if present
    const cleaned = text.replace(/```json|```/g, '').trim();

    // Extract JSON array
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) return [];

    return JSON.parse(match[0]);
  } catch (err) {
    console.warn('[AI] JSON parse failed:', err);
    return [];
  }
};


export const generateInsightsFromData = async (
  transactionsContext: any
) => {
  const prompt = `
You are an expert AI financial coach. Analyze the following user transaction data for the last 30 days and provide 3-5 concise, actionable financial insights.

Data: ${JSON.stringify(transactionsContext)}

Return ONLY a valid JSON array of objects. Each object should have:
- "content": the insight text
- "type": one of "trend", "warning", or "suggestion"

Example:
[
  { "content": "You spend 40% more on weekends.", "type": "warning" },
  { "content": "Great job keeping food expenses low this week!", "type": "trend" }
]
`;

  try {
    const text = await generateWithFallback(prompt);
    return safeJsonParseArray(text);
  } catch (error) {
    console.error('AI Generation Error:', error);
    return [];
  }
};


export const chatWithAi = async (
  transactionsContext: any,
  userQuery: string
) => {
  const prompt = `
You are Spendsy, a helpful AI financial assistant.

Here is the user's recent financial context:
${JSON.stringify(transactionsContext)}

User Query: "${userQuery}"

Provide a concise, helpful, and friendly response based strictly on their data if applicable.
Return plain text only. No markdown.
`;

  try {
    return await generateWithFallback(prompt);
  } catch (error) {
    console.error('AI Chat Error:', error);
    return "I'm having trouble analyzing your request right now. Please try again.";
  }
};