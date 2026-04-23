import { aggregateSpending } from './aggregation.service';

type TransactionLike = {
  amount: number;
  category: string;
  date: Date;
};

type InsightLike = {
  content: string;
  type: 'trend' | 'warning' | 'suggestion';
};

export const detectBehaviorInsights = (transactions: TransactionLike[], monthlyBudget?: number | null): InsightLike[] => {
  if (!transactions.length) {
    return [];
  }

  const insights: InsightLike[] = [];
  const aggregation = aggregateSpending(transactions);

  // Rule 1: weekend overspending (daily basis)
  if (
    aggregation.weekendDailyAverage > 0 &&
    aggregation.weekdayDailyAverage > 0 &&
    aggregation.weekendDailyAverage > aggregation.weekdayDailyAverage * 1.2
  ) {
    insights.push({
      content: `Weekend spend is ${Math.round(((aggregation.weekendDailyAverage / aggregation.weekdayDailyAverage) - 1) * 100)}% higher than weekdays.`,
      type: 'warning'
    });
  }

  // Rule 2: category dominance
  const dominantCategory = aggregation.categoryTotals[0];
  if (dominantCategory && dominantCategory.share > 40) {
    insights.push({
      content: `${dominantCategory.category} contributes ${Math.round(dominantCategory.share)}% of your spending. Consider setting a category cap.`,
      type: 'suggestion'
    });
  }

  // Rule 3: spending spikes (daily values using average baseline)
  if (aggregation.dailySeries.length >= 7) {
    const baselineAverage = aggregation.dailyAverage;
    const peakDay = [...aggregation.dailySeries].sort((a, b) => b.amount - a.amount)[0];

    if (baselineAverage > 0 && peakDay && peakDay.amount > baselineAverage * 1.9) {
      insights.push({
        content: `Spending spike detected on ${peakDay.date}: Rs ${peakDay.amount.toFixed(0)} vs your daily average Rs ${baselineAverage.toFixed(0)}.`,
        type: 'warning'
      });
    }
  }

  // Rule 4: trend acceleration
  if (aggregation.trends.direction === 'up' && aggregation.trends.changePercent > 20) {
    insights.push({
      content: `Recent spending trend is up by ${Math.round(aggregation.trends.changePercent)}% compared to the prior period.`,
      type: 'trend'
    });
  }

  // Rule 5: predictive overspend against budget
  if (monthlyBudget && monthlyBudget > 0) {
    const now = new Date();
    const daysPassed = Math.max(1, now.getDate());
    const projected = (aggregation.totalSpent / daysPassed) * 30;
    if (projected > monthlyBudget) {
      insights.push({
        content: `At this pace, you may exceed your budget by Rs ${(projected - monthlyBudget).toFixed(0)} this month.`,
        type: 'warning'
      });
    }
  }

  return insights;
};
