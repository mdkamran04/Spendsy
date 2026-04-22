type TransactionLike = {
  amount: number;
  category: string;
  date: Date;
};

type InsightLike = {
  content: string;
  type: 'trend' | 'warning' | 'suggestion';
};

const toDateKey = (date: Date): string => date.toISOString().split('T')[0];

export const detectBehaviorInsights = (transactions: TransactionLike[], monthlyBudget?: number | null): InsightLike[] => {
  if (!transactions.length) {
    return [];
  }

  const insights: InsightLike[] = [];

  // Rule 1: weekend spending vs weekday average
  let weekendTotal = 0;
  let weekendDays = 0;
  let weekdayTotal = 0;
  let weekdayDays = 0;

  for (const tx of transactions) {
    const day = tx.date.getDay();
    if (day === 0 || day === 6) {
      weekendTotal += tx.amount;
      weekendDays += 1;
    } else {
      weekdayTotal += tx.amount;
      weekdayDays += 1;
    }
  }

  const weekendAvg = weekendDays ? weekendTotal / weekendDays : 0;
  const weekdayAvg = weekdayDays ? weekdayTotal / weekdayDays : 0;

  if (weekendAvg > 0 && weekdayAvg > 0 && weekendAvg > weekdayAvg * 1.2) {
    insights.push({
      content: `You spend about ${Math.round(((weekendAvg / weekdayAvg) - 1) * 100)}% more per transaction on weekends than weekdays.`,
      type: 'warning'
    });
  }

  // Rule 2: one category dominates spending
  const totalSpent = transactions.reduce((acc, tx) => acc + tx.amount, 0);
  const categoryTotals = transactions.reduce((acc: Record<string, number>, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
    return acc;
  }, {});

  const dominant = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  if (dominant && totalSpent > 0) {
    const share = dominant[1] / totalSpent;
    if (share > 0.4) {
      insights.push({
        content: `${dominant[0]} contributes ${Math.round(share * 100)}% of your spending. Consider a cap for this category.`,
        type: 'suggestion'
      });
    }
  }

  // Rule 3: sudden spike detection (last 7 days vs previous 7 days)
  const dailyTotals = transactions.reduce((acc: Record<string, number>, tx) => {
    const key = toDateKey(tx.date);
    acc[key] = (acc[key] || 0) + tx.amount;
    return acc;
  }, {});

  const sortedDayKeys = Object.keys(dailyTotals).sort();
  const last14 = sortedDayKeys.slice(-14);
  if (last14.length >= 10) {
    const previous7Keys = last14.slice(0, Math.max(0, last14.length - 7));
    const latest7Keys = last14.slice(-7);
    const previous7Total = previous7Keys.reduce((acc, key) => acc + dailyTotals[key], 0);
    const latest7Total = latest7Keys.reduce((acc, key) => acc + dailyTotals[key], 0);
    const previousAvg = previous7Keys.length ? previous7Total / previous7Keys.length : 0;
    const latestAvg = latest7Keys.length ? latest7Total / latest7Keys.length : 0;

    if (previousAvg > 0 && latestAvg > previousAvg * 1.4) {
      insights.push({
        content: `Your recent daily spend increased by ${Math.round(((latestAvg / previousAvg) - 1) * 100)}% compared to the prior week.`,
        type: 'warning'
      });
    }
  }

  // Rule 4: predictive overspend against budget
  if (monthlyBudget && monthlyBudget > 0) {
    const now = new Date();
    const daysPassed = Math.max(1, now.getDate());
    const projected = (totalSpent / daysPassed) * 30;
    if (projected > monthlyBudget) {
      insights.push({
        content: `At this pace, you may exceed your budget by Rs ${(projected - monthlyBudget).toFixed(0)} this month.`,
        type: 'warning'
      });
    }
  }

  return insights;
};
