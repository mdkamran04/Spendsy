export const autoCategorize = (note: string): string => {
  const lowerNote = note.toLowerCase();
  
  const rules = {
    'Food': ['swiggy', 'zomato', 'restaurant', 'cafe', 'mcdonalds', 'kfc', 'food', 'pizza'],
    'Travel': ['uber', 'ola', 'rapido', 'train', 'flight', 'bus', 'petrol', 'fuel', 'metro'],
    'Shopping': ['amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'electronics', 'zara', 'h&m'],
    'Bills': ['electricity', 'water', 'internet', 'wifi', 'recharge', 'jio', 'airtel', 'rent'],
    'Entertainment': ['netflix', 'spotify', 'movie', 'cinema', 'bookmyshow', 'prime'],
  };

  for (const [category, keywords] of Object.entries(rules)) {
    if (keywords.some(keyword => lowerNote.includes(keyword))) {
      return category;
    }
  }

  return 'Others';
};
