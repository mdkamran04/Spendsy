import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { syncUser } from '../services/auth.service';
import { calculateSpendingScore } from '../services/spending-score.service';
import {
  classifyMoneyPersonality,
  type MoneyPersonalityResult,
} from '../services/money-personality.service';
import { categorizeExpenseNoteWithAI, analyzeReceiptImage } from '../services/ai.service';

export const calculateAndSaveSpendingScore = async (
  req: Request,
  res: Response
) => {
  try {
    const user = await syncUser(req);

    // Fetch last 30 days transactions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate spending score
    const scoreResult = calculateSpendingScore(transactions, user.monthlyBudget);

    // Upsert spending profile with score
    const profile = await prisma.spendingProfile.upsert({
      where: { userId: user.id },
      update: {
        spendingScore: scoreResult.score,
        scoreDetails: JSON.stringify(scoreResult.details),
        scoreFeedback: scoreResult.feedback,
        lastCalculatedAt: new Date(),
      },
      create: {
        userId: user.id,
        spendingScore: scoreResult.score,
        scoreDetails: JSON.stringify(scoreResult.details),
        scoreFeedback: scoreResult.feedback,
        personalityType: 'Balanced User',
        personalityDetails: '{}',
        personalityExplanation: '',
      },
    });

    res.json({
      score: scoreResult.score,
      details: scoreResult.details,
      feedback: scoreResult.feedback,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const calculateAndSaveMoneyPersonality = async (
  req: Request,
  res: Response
) => {
  try {
    const user = await syncUser(req);

    // Fetch last 90 days transactions for more comprehensive personality analysis
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: ninetyDaysAgo },
      },
      orderBy: { date: 'asc' },
    });

    // Classify money personality
    const personalityResult = classifyMoneyPersonality(
      transactions,
      user.monthlyBudget
    );

    // Upsert spending profile with personality
    const profile = await prisma.spendingProfile.upsert({
      where: { userId: user.id },
      update: {
        personalityType: personalityResult.personalityType,
        personalityDetails: JSON.stringify(personalityResult.details),
        personalityExplanation: personalityResult.explanation,
        lastCalculatedAt: new Date(),
      },
      create: {
        userId: user.id,
        personalityType: personalityResult.personalityType,
        personalityDetails: JSON.stringify(personalityResult.details),
        personalityExplanation: personalityResult.explanation,
        spendingScore: 50,
        scoreDetails: '{}',
        scoreFeedback: '',
      },
    });

    res.json({
      personalityType: personalityResult.personalityType,
      explanation: personalityResult.explanation,
      details: personalityResult.details,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSpendingProfile = async (req: Request, res: Response) => {
  try {
    const user = await syncUser(req);

    let profile = await prisma.spendingProfile.findUnique({
      where: { userId: user.id },
    });

    // If no profile exists, calculate both score and personality
    if (!profile) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const transactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          date: { gte: thirtyDaysAgo },
        },
      });

      const scoreResult = calculateSpendingScore(transactions, user.monthlyBudget);
      const personalityResult = classifyMoneyPersonality(
        transactions,
        user.monthlyBudget
      );

      profile = await prisma.spendingProfile.create({
        data: {
          userId: user.id,
          spendingScore: scoreResult.score,
          scoreDetails: JSON.stringify(scoreResult.details),
          scoreFeedback: scoreResult.feedback,
          personalityType: personalityResult.personalityType,
          personalityDetails: JSON.stringify(personalityResult.details),
          personalityExplanation: personalityResult.explanation,
        },
      });
    }

    res.json({
      score: profile.spendingScore,
      scoreDetails: JSON.parse(profile.scoreDetails),
      scoreFeedback: profile.scoreFeedback,
      personalityType: profile.personalityType,
      personalityDetails: JSON.parse(profile.personalityDetails),
      personalityExplanation: profile.personalityExplanation,
      lastCalculatedAt: profile.lastCalculatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const scanReceipt = async (req: Request, res: Response) => {
  try {
    const user = await syncUser(req);

    // Check if file is attached
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Convert buffer to base64
    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    // Analyze receipt image using AI Vision API
    const analysisResult = await analyzeReceiptImage(imageBase64, mimeType);

    // Return analyzed data with confidence level
    res.json({
      amount: analysisResult.amount,
      merchant: analysisResult.merchant,
      date: analysisResult.date,
      category: analysisResult.category,
      description: analysisResult.description,
      confidence: analysisResult.confidence,
      requiresManualEntry: analysisResult.confidence < 70 || !analysisResult.amount,
      message:
        analysisResult.confidence < 70
          ? 'Low confidence - please verify details before saving'
          : 'Receipt analyzed successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createTransactionFromReceipt = async (
  req: Request,
  res: Response
) => {
  try {
    const user = await syncUser(req);
    const { amount, merchant, date, category, note } = req.body;

    // Validate required fields
    if (!amount || !date) {
      return res.status(400).json({ error: 'Amount and date are required' });
    }

    // Auto-categorize if not provided
    let finalCategory = category || 'Others';
    if (!category && (merchant || note)) {
      const description = `${merchant || ''} ${note || ''}`.trim();
      const categorized = await categorizeExpenseNoteWithAI(description);
      finalCategory = categorized || 'Others';
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: parseFloat(amount.toString()),
        category: finalCategory,
        date: new Date(date),
        note: `${merchant || ''} ${note || ''}`.trim() || undefined,
        paymentMethod: 'Receipt',
      },
    });

    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
