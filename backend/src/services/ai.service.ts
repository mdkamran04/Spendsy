import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const AI_ALLOWED_CATEGORIES = ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Others'] as const;
type AICategory = (typeof AI_ALLOWED_CATEGORIES)[number];

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

export const categorizeExpenseNoteWithAI = async (note: string): Promise<AICategory | null> => {
  if (!note.trim()) {
    return 'Others';
  }

  const prompt = `
Categorize the following expense note into exactly one category from this list:
${AI_ALLOWED_CATEGORIES.join(', ')}

Expense note: "${note}"

Rules:
- Return only one category name from the list.
- No explanation.
- If uncertain, return Others.
`;

  try {
    const text = await generateWithFallback(prompt);
    const cleaned = text.trim().replace(/[^a-zA-Z]/g, '');
    const match = AI_ALLOWED_CATEGORIES.find((category) => category.toLowerCase() === cleaned.toLowerCase());
    return match ?? 'Others';
  } catch (error) {
    console.error('AI Categorization Error:', error);
    return null;
  }
};

type ReceiptAnalysisResult = {
  amount: number | null;
  merchant: string;
  date: string;
  category: AICategory;
  description: string;
  confidence: number; // 0-100
};

/**
 * Analyze receipt image using Gemini Vision API
 * Extracts: amount, merchant, date, category
 */
export const analyzeReceiptImage = async (
  imageBase64: string,
  mimeType: string
): Promise<ReceiptAnalysisResult> => {
  const defaultResult: ReceiptAnalysisResult = {
    amount: null,
    merchant: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Others',
    description: '',
    confidence: 0,
  };

  if (!imageBase64) {
    return defaultResult;
  }

  try {
    // Try with vision model
    const visionModels = [
      process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash',
      'gemini-2.5-flash',
      'gemini-1.5-pro',
    ].filter((m): m is string => Boolean(m));

    let lastError: unknown = null;

    for (const modelName of visionModels) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Analyze this receipt image and extract the following information:
1. Total amount (number only, without currency symbol)
2. Merchant/Store name
3. Transaction date (YYYY-MM-DD format, use today if not visible)
4. Item description or what was purchased
5. Confidence level (0-100, 100 = very clear receipt)

Return ONLY a valid JSON object, no explanation:
{
  "amount": 450.50,
  "merchant": "Starbucks",
  "date": "2025-04-23",
  "description": "Coffee and pastry",
  "confidence": 95
}

If you cannot read the receipt clearly, set confidence to a lower value and return your best guess.
If the amount is unclear, set amount to null.`,
                  },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: imageBase64,
                    },
                  },
                ],
              },
            ],
          })
        );

        if (!response?.text) {
          throw new Error('Empty response from vision model');
        }

        const text = response.text;
        const cleaned = text.replace(/```json|```/g, '').trim();

        // Extract JSON object
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Could not extract JSON from response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Auto-categorize based on description and merchant
        let category: AICategory = 'Others';
        const searchText = `${parsed.merchant} ${parsed.description}`.toLowerCase();

        const categoryKeywords: Record<AICategory, string[]> = {
          Food: ['food', 'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'grocery', 'supermarket', 'zomato', 'swiggy'],
          Travel: ['uber', 'ola', 'taxi', 'gas', 'petrol', 'fuel', 'hotel', 'airline', 'train'],
          Shopping: ['store', 'shop', 'amazon', 'flipkart', 'mall', 'clothes', 'electronics'],
          Bills: ['electricity', 'water', 'internet', 'bill', 'utility', 'phone', 'recharge'],
          Entertainment: ['cinema', 'movie', 'netflix', 'spotify', 'gaming', 'ticket', 'concert'],
          Others: [],
        };

        for (const [cat, keywords] of Object.entries(categoryKeywords)) {
          if (keywords.some((kw) => searchText.includes(kw))) {
            category = cat as AICategory;
            break;
          }
        }

        const result: ReceiptAnalysisResult = {
          amount: parsed.amount ? parseFloat(parsed.amount) : null,
          merchant: parsed.merchant || '',
          date: parsed.date || new Date().toISOString().split('T')[0],
          category,
          description: parsed.description || '',
          confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
        };

        return result;
      } catch (error: any) {
        lastError = error;
        console.warn(`[AI] Vision model ${modelName} failed:`, error.message);
      }
    }

    console.error('[AI] All vision models failed:', lastError);
    return defaultResult;
  } catch (error) {
    console.error('[AI] Receipt Analysis Error:', error);
    return defaultResult;
  }
};