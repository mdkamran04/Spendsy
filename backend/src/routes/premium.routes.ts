import { Router } from 'express';
import multer from 'multer';
import {
  calculateAndSaveSpendingScore,
  calculateAndSaveMoneyPersonality,
  getSpendingProfile,
  scanReceipt,
  createTransactionFromReceipt,
} from '../controllers/premium.controller';

const router = Router();

// Configure multer for image upload (max 5MB, only images)
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Spending Score endpoints
router.post('/spending-score', calculateAndSaveSpendingScore);

// Money Personality endpoints
router.post('/money-personality', calculateAndSaveMoneyPersonality);

// Get complete spending profile
router.get('/profile', getSpendingProfile);

// Receipt Scanner endpoints
router.post('/receipt/scan', upload.single('receipt'), scanReceipt);
router.post('/receipt/create-transaction', createTransactionFromReceipt);

export default router;
