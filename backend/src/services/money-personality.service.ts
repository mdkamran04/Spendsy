import type { Transaction } from '@prisma/client';

export type PersonalityType =
  | 'Impulse Spender'
  | 'Weekend Spender'
  | 'Disciplined Saver'
  | 'Balanced User';

type PersonalityDetails = {
  impulseScore: number;
  weekendVsWeekdayRatio: number;
  budgetCompliance: number;
  categoryFocus: string;
};

export type MoneyPersonalityResult = {
  personalityType: PersonalityType;
  explanation: string;
  details: PersonalityDetails;
};

/**
 * Calculate impulse spending score
 * High number of small transactions = high impulse score
 */
const calculateImpulseScore = (transactions: Transaction[]): number => {
  if (transactions.length === 0) return 0;

  const sortedByAmount = transactions.sort((a, b) => a.amount - b.amount);
  const smallTransactionThreshold =
    sortedByAmount[Math.floor(transactions.length / 2)].amount * 0.5; // median * 0.5

  const smallTransactions = transactions.filter(
    (tx) => tx.amount < smallTransactionThreshold
  ).length;
  const ratio = smallTransactions / transactions.length;

  // 70%+ small transactions = impulse score of 80+
  // 30% small transactions = impulse score of 40
  const score = Math.round(ratio * 100 + 10);

  return Math.min(100, score);
};

/**
 * Calculate weekend vs weekday spending ratio
 * Returns ratio: weekendSpending / weekdaySpending
 * 1.0 = equal, 2.0 = 2x more on weekends
 */
const calculateWeekendSpending = (transactions: Transaction[]): number => {
  if (transactions.length === 0) return 1;

  let weekendSpent = 0;
  let weekdaySpent = 0;

  for (const tx of transactions) {
    const dayOfWeek = new Date(tx.date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Sunday or Saturday
      weekendSpent += tx.amount;
    } else {
      weekdaySpent += tx.amount;
    }
  }

  if (weekdaySpent === 0) return weekendSpent > 0 ? 2 : 1;

  return weekendSpent / weekdaySpent;
};

/**
 * Calculate budget compliance score (0-100)
 */
const calculateBudgetCompliance = (
  transactions: Transaction[],
  monthlyBudget: number | undefined | null
): number => {
  if (!monthlyBudget || monthlyBudget <= 0) return 50;

  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const ratio = totalSpent / monthlyBudget;

  if (ratio <= 1) return 100;
  if (ratio <= 1.2) return 80;
  if (ratio <= 1.5) return 50;
  return 20;
};

/**
 * Determine dominant spending category
 */
const getDominantCategory = (transactions: Transaction[]): string => {
  if (transactions.length === 0) return 'N/A';

  const categoryTotals = new Map<string, number>();

  for (const tx of transactions) {
    const current = categoryTotals.get(tx.category) || 0;
    categoryTotals.set(tx.category, current + tx.amount);
  }

  let maxCategory = 'Others';
  let maxAmount = 0;

  for (const [category, amount] of categoryTotals) {
    if (amount > maxAmount) {
      maxAmount = amount;
      maxCategory = category;
    }
  }

  return maxCategory;
};

/**
 * Classify user into money personality type
 */
export const classifyMoneyPersonality = (
  transactions: Transaction[],
  monthlyBudget: number | undefined | null
): MoneyPersonalityResult => {
  if (transactions.length === 0) {
    return {
      personalityType: 'Balanced User',
      explanation: 'Start tracking transactions to discover your money personality.',
      details: {
        impulseScore: 0,
        weekendVsWeekdayRatio: 1,
        budgetCompliance: 50,
        categoryFocus: 'N/A',
      },
    };
  }

  const impulseScore = calculateImpulseScore(transactions);
  const weekendRatio = calculateWeekendSpending(transactions);
  const budgetCompliance = calculateBudgetCompliance(transactions, monthlyBudget);
  const categoryFocus = getDominantCategory(transactions);

  const details: PersonalityDetails = {
    impulseScore,
    weekendVsWeekdayRatio: Math.round(weekendRatio * 100) / 100,
    budgetCompliance,
    categoryFocus,
  };

  let personalityType: PersonalityType;
  let explanation: string;

  // Decision tree for personality classification
  if (impulseScore > 70) {
    // High impulse spending
    personalityType = 'Impulse Spender';
    explanation = `You tend to make frequent, smaller purchases. While this can be fun, consider setting transaction limits to maintain better control over your spending.`;
  } else if (weekendRatio > 1.4) {
    // Heavy weekend spending
    personalityType = 'Weekend Spender';
    explanation = `You spend significantly more on weekends (${Math.round(weekendRatio)}x more than weekdays). Plan weekend activities with a budget to keep things in check.`;
  } else if (budgetCompliance >= 80) {
    // Stays within budget
    personalityType = 'Disciplined Saver';
    explanation = `Excellent! You maintain strong budget discipline. Keep leveraging this habit while ensuring you're also enjoying your money responsibly.`;
  } else {
    // Default to balanced
    personalityType = 'Balanced User';
    explanation = `You maintain a relatively balanced spending pattern. Your primary focus is ${categoryFocus}. Keep monitoring your spending trends.`;
  }

  return {
    personalityType,
    explanation,
    details,
  };
};
