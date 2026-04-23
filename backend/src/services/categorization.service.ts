import { categorizeExpenseNoteWithAI } from './ai.service';

export const ALLOWED_CATEGORIES = [
  'Food',
  'Travel',
  'Shopping',
  'Bills',
  'Entertainment',
  'Others'
] as const;

export type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number];

const CATEGORY_KEYWORDS: Record<AllowedCategory, string[]> = {
  Food: [
    'swiggy', 'zomato', 'restaurant', 'cafe', 'mcdonalds', 'kfc', 'food', 'pizza',
    'pancake', 'pani puri', 'biryani', 'breakfast', 'lunch', 'dinner'
  ],
  Travel: ['uber', 'ola', 'rapido', 'train', 'flight', 'bus', 'petrol', 'fuel', 'metro', 'taxi'],
  Shopping: ['amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'electronics', 'zara', 'h&m'],
  Bills: ['electricity', 'water', 'internet', 'wifi', 'recharge', 'jio', 'airtel', 'rent', 'bill'],
  Entertainment: ['netflix', 'spotify', 'movie', 'cinema', 'bookmyshow', 'prime', 'game', 'concert'],
  Others: []
};

const toCanonicalCategory = (value: string): AllowedCategory | null => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const found = ALLOWED_CATEGORIES.find((category) => category.toLowerCase() === trimmed);
  return found ?? null;
};

export const isValidCategory = (value: unknown): value is AllowedCategory => {
  return typeof value === 'string' && toCanonicalCategory(value) !== null;
};

export const normalizeCategoryInput = (value?: string | null): AllowedCategory | null => {
  if (!value) {
    return null;
  }
  return toCanonicalCategory(value);
};

export const inferCategoryFromKeywords = (note: string): AllowedCategory | null => {
  const lowerNote = note.toLowerCase();

  for (const category of ALLOWED_CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords.some((keyword) => lowerNote.includes(keyword))) {
      return category;
    }
  }

  return null;
};

export const autoCategorize = async (note?: string): Promise<AllowedCategory> => {
  if (!note?.trim()) {
    return 'Others';
  }

  const keywordCategory = inferCategoryFromKeywords(note);
  if (keywordCategory) {
    return keywordCategory;
  }

  const aiCategory = await categorizeExpenseNoteWithAI(note);
  return aiCategory ?? 'Others';
};
