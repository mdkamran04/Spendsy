import prisma from '../utils/prisma';
import { Request } from 'express';

export const syncUser = async (req: Request) => {
  const userId = req.auth?.()?.userId;
  if (!userId) throw new Error('Unauthorized');

  // Upsert user to ensure they exist in our DB
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    // We might not have email if not using Clerk Webhooks, but we need an email.
    // For now, let's use a dummy email if we can't fetch it, or rely on Clerk SDK.
    // In a real app we'd use a webhook, but for MVP we just create the user with the ID.
    user = await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@spendsy.app`, // Placeholder email
        monthlyBudget: 1000, // Default budget
        monthlyIncome: 3000, // Default income
      }
    });
  }
  return user;
};
