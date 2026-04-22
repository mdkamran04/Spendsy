import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { generateInsightsFromData, chatWithAi } from '../services/ai.service';
import { syncUser } from '../services/auth.service';
import { detectBehaviorInsights } from '../services/behavior.service';

export const generateInsights = async (req: Request, res: Response) => {
  try {
    const user = await syncUser(req);

    // Fetch last 30 days transactions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: thirtyDaysAgo }
      }
    });

    if (transactions.length === 0) {
      return res.json([]);
    }

    // Basic summary for AI
    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const categoryTotals = transactions.reduce((acc: any, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    const context = {
      monthlyBudget: user.monthlyBudget,
      totalSpent,
      categoryTotals,
      transactionsCount: transactions.length
    };

    const aiInsights = await generateInsightsFromData(context);
    const behaviorInsights = detectBehaviorInsights(transactions, user.monthlyBudget);

    const allInsights = [...behaviorInsights, ...aiInsights]
      .filter((insight: any) => insight?.content && insight?.type)
      .slice(0, 8);

    // Save to DB
    const savedInsights = await Promise.all(
      allInsights.map((insight: any) =>
        prisma.insight.create({
          data: {
            userId: user.id,
            content: insight.content,
            type: insight.type
          }
        })
      )
    );

    res.json(savedInsights);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getInsights = async (req: Request, res: Response) => {
  try {
    const user = await syncUser(req);
    const insights = await prisma.insight.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    res.json(insights);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const handleChat = async (req: Request, res: Response) => {
  try {
    const user = await syncUser(req);
    const { query } = req.body;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: thirtyDaysAgo }
      }
    });

    const context = {
      budget: user.monthlyBudget,
      income: user.monthlyIncome,
      recentTransactions: transactions.map(t => ({ amount: t.amount, category: t.category, date: t.date }))
    };

    const reply = await chatWithAi(context, query);
    res.json({ reply });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
