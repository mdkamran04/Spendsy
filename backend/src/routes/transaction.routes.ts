import { Router } from 'express';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, getDashboardStats } from '../controllers/transaction.controller';

const router = Router();

router.get('/', getTransactions);
router.post('/', addTransaction);
router.get('/dashboard', getDashboardStats);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
