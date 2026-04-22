import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireAuth } from '@clerk/express';
import transactionRoutes from './routes/transaction.routes';
import insightRoutes from './routes/insight.routes';
import userRoutes from './routes/user.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Extend express request with Clerk auth prop
declare global {
  namespace Express {
    interface Request {
      auth?: () => {
        userId?: string | null;
      };
    }
  }
}

// Routes
app.use('/api/transactions', requireAuth(), transactionRoutes);
app.use('/api/insights', requireAuth(), insightRoutes);
app.use('/api/user', requireAuth(), userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  const statusCode = err?.status || err?.statusCode || 500;
  const message = err?.message || 'Internal Server Error';
  res.status(statusCode).json({ error: statusCode >= 500 ? 'Internal Server Error' : 'Request Failed', message });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
