import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { syncUser } from '../services/auth.service';
import { autoCategorize } from '../services/categorization.service';
import { detectBehaviorInsights } from '../services/behavior.service';

const parseAmountInput = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/[\s,]+/g, '');
    return Number(normalized);
  }
  return Number(value);
};

const getWeekOfMonth = (date: Date): number => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  return Math.ceil((date.getDate() + firstDay) / 7);
};

const toDateLabel = (date: Date): string => {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const user = await syncUser(req);
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const addTransaction = async (req: Request, res: Response) => {
  try {
    const user = await syncUser(req);
    const { amount, note, date, paymentMethod, category } = req.body;
    const parsedAmount = parseAmountInput(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    // Use provided category, or auto-categorize based on note
    const finalCategory = category || (note ? autoCategorize(note) : 'Others');

    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: parsedAmount,
        category: finalCategory,
        note,
        date: new Date(date),
        paymentMethod
      }
    });
    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const user = await syncUser(req);
    const { id } = req.params;
    const { amount, category, note, date, paymentMethod } = req.body;
    const parsedAmount = amount !== undefined ? parseAmountInput(amount) : undefined;

    if (parsedAmount !== undefined && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const result = await prisma.transaction.updateMany({
      where: { id, userId: user.id },
      data: {
        amount: parsedAmount,
        category: category || undefined,
        note: note ?? undefined,
        date: date ? new Date(date) : undefined,
        paymentMethod: paymentMethod ?? undefined
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = await prisma.transaction.findUnique({ where: { id } });
    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const user = await syncUser(req);
    const { id } = req.params;
    const result = await prisma.transaction.deleteMany({
      where: { id, userId: user.id }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const user = await syncUser(req);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const monthlyTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: startOfMonth }
      }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const last30DaysTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: thirtyDaysAgo }
      },
      orderBy: { date: 'asc' }
    });

    const totalSpentThisMonth = monthlyTransactions.reduce((acc, t) => acc + t.amount, 0);
    const remainingBudget = (user.monthlyBudget || 0) - totalSpentThisMonth;

    const categoryBreakdown = monthlyTransactions.reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    const pieChartData = Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value }));

    const spendingByDay = last30DaysTransactions.reduce((acc: Record<string, number>, tx) => {
      const key = tx.date.toISOString().split('T')[0];
      acc[key] = (acc[key] || 0) + tx.amount;
      return acc;
    }, {});

    const dailyTrendData = Object.entries(spendingByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date: toDateLabel(new Date(date)), value }));

    const spendingByWeek = monthlyTransactions.reduce((acc: Record<string, number>, tx) => {
      const week = `Week ${getWeekOfMonth(tx.date)}`;
      acc[week] = (acc[week] || 0) + tx.amount;
      return acc;
    }, {});

    const weeklyTrendData = Object.entries(spendingByWeek).map(([week, value]) => ({ week, value }));

    // Predictive spending
    const daysPassed = now.getDate();
    const dailyAvg = daysPassed > 0 ? totalSpentThisMonth / daysPassed : 0;
    const projectedSpent = dailyAvg * daysInMonth;
    const projectedOverBy = user.monthlyBudget && projectedSpent > user.monthlyBudget
      ? projectedSpent - user.monthlyBudget
      : 0;

    const behaviorFlags = detectBehaviorInsights(last30DaysTransactions, user.monthlyBudget);

    const savingsGoal = user.savingsTarget && user.savingsMonths
      ? {
          targetAmount: user.savingsTarget,
          durationMonths: user.savingsMonths,
          monthlySavingNeeded: user.savingsTarget / user.savingsMonths,
          dailySavingNeeded: user.savingsTarget / (user.savingsMonths * 30)
        }
      : null;

    const daysRemaining = Math.max(1, daysInMonth - daysPassed);
    const dailySpendLimit = remainingBudget / daysRemaining;

    res.json({
      totalSpentThisMonth,
      monthlyBudget: user.monthlyBudget || 0,
      remainingBudget,
      pieChartData,
      dailyTrendData,
      weeklyTrendData,
      recentTransactions: monthlyTransactions.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5),
      projectedSpent,
      projectedOverBy,
      dailyAvg,
      dailySpendLimit,
      behaviorFlags,
      savingsGoal
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
