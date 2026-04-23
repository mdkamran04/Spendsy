import type { Transaction } from '@prisma/client';

type ScoreDetails = {
  budgetAdherence: number; // 0-100
  categoryDistribution: number; // 0-100
  spendingPatternStability: number; // 0-100
};

type SpendingScoreResult = {
  score: number; // 0-100
  details: ScoreDetails;
  feedback: string;
};

/**
 * Calculate budget adherence score
 * 100 = within budget, 50 = 20% over, 0 = double the budget
 */
const calculateBudgetAdherence = (
  totalSpent: number,
  monthlyBudget: number | undefined | null
): number => {
  if (!monthlyBudget || monthlyBudget <= 0) {
    return 50; // Neutral score if no budget set
  }

  const ratio = totalSpent / monthlyBudget;

  if (ratio <= 1) {
    // Within or under budget: scale 50-100 based on how much under
    return Math.min(100, 50 + (1 - ratio) * 50);
  } else if (ratio <= 1.5) {
    // 0-50% over budget: scale 25-50
    return Math.max(25, 50 - (ratio - 1) * 50);
  } else {
    // More than 50% over: 0-25
    return Math.max(0, 25 - Math.min((ratio - 1.5) * 50, 25));
  }
};

/**
 * Calculate category distribution score
 * Higher score = better diversification (no single category dominates)
 */
const calculateCategoryDistribution = (transactions: Transaction[]): number => {
  if (transactions.length === 0) return 50;

  const categoryTotals = new Map<string, number>();
  let totalAmount = 0;

  for (const tx of transactions) {
    const current = categoryTotals.get(tx.category) || 0;
    categoryTotals.set(tx.category, current + tx.amount);
    totalAmount += tx.amount;
  }

  if (totalAmount === 0) return 50;

  // Calculate Herfindahl-Hirschman Index (HHI) as concentration measure
  let hhi = 0;
  for (const total of categoryTotals.values()) {
    const share = total / totalAmount;
    hhi += share * share;
  }

  // HHI ranges from 1/n to 1
  // Convert to score: lower concentration = higher score
  // If one category is 100%, HHI = 1 (very bad, score = 10)
  // If all equal, HHI = 1/categories (good, score = 90)
  const maxCategories = categoryTotals.size;
  const idealHhi = 1 / maxCategories;
  const worstHhi = 1;

  // Normalize: 0-1 scale where 0 = worst (score 10), 1 = ideal (score 90)
  const normalized =
    maxCategories === 1 ? 0 : (worstHhi - hhi) / (worstHhi - idealHhi);
  const score = Math.max(10, Math.min(100, 50 + normalized * 50));

  return Math.round(score);
};

/**
 * Calculate spending pattern stability score
 * Higher score = consistent spending (less volatility)
 */
const calculateSpendingPatternStability = (transactions: Transaction[]): number => {
  if (transactions.length < 7) return 50; // Not enough data

  // Group by date and sum daily spending
  const dailySpending = new Map<string, number>();

  for (const tx of transactions) {
    const dateKey = tx.date.toISOString().split('T')[0];
    const current = dailySpending.get(dateKey) || 0;
    dailySpending.set(dateKey, current + tx.amount);
  }

  const amounts = Array.from(dailySpending.values());
  if (amounts.length < 2) return 50;

  // Calculate coefficient of variation
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  if (mean === 0) return 50;

  const variance =
    amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    amounts.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean; // Coefficient of variation

  // Convert CV to score (lower CV = higher score)
  // CV of 0 = score 100, CV of 2+ = score 10
  const score = Math.max(10, Math.min(100, 100 - cv * 40));

  return Math.round(score);
};

/**
 * Generate feedback based on score and components
 */
const generateFeedback = (
  score: number,
  details: ScoreDetails,
  totalSpent: number,
  monthlyBudget: number | undefined | null
): string => {
  if (score >= 85) {
    return "Excellent spending habits! Keep up the disciplined approach.";
  } else if (score >= 70) {
    const weakest = Math.min(
      details.budgetAdherence,
      details.categoryDistribution,
      details.spendingPatternStability
    );

    if (weakest === details.budgetAdherence) {
      return "Good balance overall. Try to stick closer to your budget.";
    } else if (weakest === details.categoryDistribution) {
      return "Good consistency. Consider diversifying across categories more.";
    } else {
      return "Good financial health. Try to stabilize your daily spending.";
    }
  } else if (score >= 50) {
    const issues = [];
    if (details.budgetAdherence < 50) issues.push("budget control");
    if (details.categoryDistribution < 50) issues.push("category balance");
    if (details.spendingPatternStability < 50)
      issues.push("spending consistency");

    return `Room for improvement in ${issues.join(", ")}. Let's work on these areas.`;
  } else {
    return "Your spending needs attention. Focus on budgeting and pattern consistency.";
  }
};

/**
 * Calculate comprehensive spending score (0-100)
 */
export const calculateSpendingScore = (
  transactions: Transaction[],
  monthlyBudget: number | undefined | null
): SpendingScoreResult => {
  if (transactions.length === 0) {
    return {
      score: 75,
      details: {
        budgetAdherence: 50,
        categoryDistribution: 50,
        spendingPatternStability: 50,
      },
      feedback: "Start tracking transactions to get insights on your spending.",
    };
  }

  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  const details: ScoreDetails = {
    budgetAdherence: calculateBudgetAdherence(totalSpent, monthlyBudget),
    categoryDistribution: calculateCategoryDistribution(transactions),
    spendingPatternStability: calculateSpendingPatternStability(transactions),
  };

  // Weighted average (equal weights)
  const score = Math.round(
    (details.budgetAdherence +
      details.categoryDistribution +
      details.spendingPatternStability) /
      3
  );

  const feedback = generateFeedback(score, details, totalSpent, monthlyBudget);

  return {
    score,
    details,
    feedback,
  };
};
