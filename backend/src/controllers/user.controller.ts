import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { syncUser } from '../services/auth.service';

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const user = await syncUser(req);
    res.json({
      id: user.id,
      email: user.email,
      monthlyIncome: user.monthlyIncome,
      monthlyBudget: user.monthlyBudget,
      savingsTarget: user.savingsTarget,
      savingsMonths: user.savingsMonths,
      createdAt: user.createdAt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const user = await syncUser(req);
    const { monthlyIncome, monthlyBudget } = req.body;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        monthlyIncome: monthlyIncome !== undefined ? Number(monthlyIncome) : undefined,
        monthlyBudget: monthlyBudget !== undefined ? Number(monthlyBudget) : undefined
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSavingsGoal = async (req: Request, res: Response) => {
  try {
    const user = await syncUser(req);
    const { targetAmount, durationMonths } = req.body;

    const parsedTarget = Number(targetAmount);
    const parsedDuration = Number(durationMonths);

    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      return res.status(400).json({ error: 'targetAmount must be a positive number' });
    }

    if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
      return res.status(400).json({ error: 'durationMonths must be a positive integer' });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        savingsTarget: parsedTarget,
        savingsMonths: parsedDuration
      }
    });

    const monthlySavingNeeded = parsedTarget / parsedDuration;
    const dailySavingNeeded = parsedTarget / (parsedDuration * 30);

    return res.json({
      ...updated,
      savingsPlan: {
        monthlySavingNeeded,
        dailySavingNeeded
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
