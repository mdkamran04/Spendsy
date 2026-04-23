type TransactionLike = {
  amount: number;
  category: string;
  date: Date;
};

export type CategoryTotal = {
  category: string;
  total: number;
  share: number;
};

export type DailySpendPoint = {
  date: string;
  amount: number;
  isWeekend: boolean;
};

export type TrendSummary = {
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  recentAverage: number;
  baselineAverage: number;
};

export type AggregatedSpending = {
  totalSpent: number;
  transactionCount: number;
  categoryTotals: CategoryTotal[];
  dailySeries: DailySpendPoint[];
  dailyAverage: number;
  weekdayDailyAverage: number;
  weekendDailyAverage: number;
  trends: TrendSummary;
};

const round2 = (value: number): number => Number(value.toFixed(2));

const toDateKey = (date: Date): string => date.toISOString().split('T')[0];

const buildTrendSummary = (dailySeries: DailySpendPoint[]): TrendSummary => {
  if (!dailySeries.length) {
    return {
      direction: 'stable',
      changePercent: 0,
      recentAverage: 0,
      baselineAverage: 0
    };
  }

  const latest = dailySeries.slice(-7);
  const baseline = dailySeries.slice(-14, -7);

  const recentAverage = latest.length
    ? latest.reduce((sum, day) => sum + day.amount, 0) / latest.length
    : 0;
  const baselineAverage = baseline.length
    ? baseline.reduce((sum, day) => sum + day.amount, 0) / baseline.length
    : recentAverage;

  const changePercent = baselineAverage > 0
    ? ((recentAverage - baselineAverage) / baselineAverage) * 100
    : 0;

  const direction: TrendSummary['direction'] =
    changePercent > 8 ? 'up' : changePercent < -8 ? 'down' : 'stable';

  return {
    direction,
    changePercent: round2(changePercent),
    recentAverage: round2(recentAverage),
    baselineAverage: round2(baselineAverage)
  };
};

export const aggregateSpending = (transactions: TransactionLike[]): AggregatedSpending => {
  if (!transactions.length) {
    return {
      totalSpent: 0,
      transactionCount: 0,
      categoryTotals: [],
      dailySeries: [],
      dailyAverage: 0,
      weekdayDailyAverage: 0,
      weekendDailyAverage: 0,
      trends: {
        direction: 'stable',
        changePercent: 0,
        recentAverage: 0,
        baselineAverage: 0
      }
    };
  }

  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  const categoryMap = new Map<string, number>();
  const dailyMap = new Map<string, { amount: number; isWeekend: boolean }>();

  for (const tx of transactions) {
    const category = tx.category || 'Others';
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + tx.amount);

    const dateKey = toDateKey(tx.date);
    const prev = dailyMap.get(dateKey);
    dailyMap.set(dateKey, {
      amount: (prev?.amount ?? 0) + tx.amount,
      isWeekend: new Date(dateKey).getDay() === 0 || new Date(dateKey).getDay() === 6
    });
  }

  const categoryTotals: CategoryTotal[] = Array.from(categoryMap.entries())
    .map(([category, total]) => ({
      category,
      total: round2(total),
      share: totalSpent > 0 ? round2((total / totalSpent) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total);

  const dailySeries: DailySpendPoint[] = Array.from(dailyMap.entries())
    .map(([date, value]) => ({ date, amount: round2(value.amount), isWeekend: value.isWeekend }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const dayCount = dailySeries.length;
  const dailyAverage = dayCount ? totalSpent / dayCount : 0;

  const weekendDays = dailySeries.filter((d) => d.isWeekend);
  const weekdayDays = dailySeries.filter((d) => !d.isWeekend);

  const weekendDailyAverage = weekendDays.length
    ? weekendDays.reduce((sum, d) => sum + d.amount, 0) / weekendDays.length
    : 0;
  const weekdayDailyAverage = weekdayDays.length
    ? weekdayDays.reduce((sum, d) => sum + d.amount, 0) / weekdayDays.length
    : 0;

  return {
    totalSpent: round2(totalSpent),
    transactionCount: transactions.length,
    categoryTotals,
    dailySeries,
    dailyAverage: round2(dailyAverage),
    weekdayDailyAverage: round2(weekdayDailyAverage),
    weekendDailyAverage: round2(weekendDailyAverage),
    trends: buildTrendSummary(dailySeries)
  };
};