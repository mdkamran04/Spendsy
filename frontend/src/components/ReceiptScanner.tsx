import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, X, Check, AlertCircle, Loader, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

type ReceiptData = {
  amount: number | null;
  merchant: string;
  date: string;
  category: string;
  description: string;
  confidence?: number;
};

type ReceiptScannerProps = {
  onTransactionCreate?: (transaction: any) => void;
};

const CATEGORIES = [
  'Food',
  'Travel',
  'Shopping',
  'Bills',
  'Entertainment',
  'Others',
];

export const ReceiptScanner = ({ onTransactionCreate }: ReceiptScannerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'confirm' | 'success'>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [receiptData, setReceiptData] = useState<ReceiptData>({
    amount: null,
    merchant: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Others',
    description: '',
    confidence: 0,
  });

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);
    setLoading(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('receipt', file);

      // Call backend to analyze receipt
      const response = await fetch('/api/premium/receipt/scan', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze receipt');
      }

      const analysisResult = await response.json();

      setReceiptData({
        amount: analysisResult.amount,
        merchant: analysisResult.merchant,
        date: analysisResult.date,
        category: analysisResult.category,
        description: analysisResult.description,
        confidence: analysisResult.confidence || 0,
      });

      setStep('confirm');
    } catch (err: any) {
      setError(err.message || 'Failed to process receipt. Please enter details manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof ReceiptData,
    value: string | number
  ) => {
    setReceiptData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFileSelect(file || null);
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFileSelect(file || null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = async () => {
    if (!receiptData.amount) {
      setError('Please enter an amount');
      return;
    }

    if (!receiptData.merchant.trim()) {
      setError('Please enter a merchant name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call API to create transaction
      const response = await fetch('/api/premium/receipt/create-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: receiptData.amount,
          merchant: receiptData.merchant,
          date: receiptData.date,
          category: receiptData.category,
          note: receiptData.description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create transaction');
      }

      const transaction = await response.json();
      onTransactionCreate?.(transaction);

      // Reset form
      setStep('success');
      setTimeout(() => {
        setStep('upload');
        setReceiptData({
          amount: null,
          merchant: '',
          date: new Date().toISOString().split('T')[0],
          category: 'Others',
          description: '',
          confidence: 0,
        });
        setPreviewImage(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-700 border-green-300';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-orange-100 text-orange-700 border-orange-300';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'High confidence';
    if (confidence >= 60) return 'Medium confidence';
    return 'Low confidence - review details';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          AI Receipt Scanner
          <Sparkles className="w-4 h-4 text-purple-500 ml-auto" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              >
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Drag receipt image here
                </p>
                <p className="text-xs text-gray-600 mb-4">
                  AI will auto-extract amount, merchant, and category
                </p>

                <div className="flex gap-2 justify-center flex-wrap">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Choose File
                  </button>

                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Take Photo
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraCapture}
                  className="hidden"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </motion.div>
              )}

              {loading && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  <p className="text-sm text-gray-600">
                    Analyzing receipt with AI...
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              {previewImage && (
                <div className="mb-4">
                  <img
                    src={previewImage}
                    alt="Receipt preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                </div>
              )}

              {/* Confidence indicator */}
              {receiptData.confidence > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg border ${getConfidenceColor(
                    receiptData.confidence
                  )} flex items-center justify-between`}
                >
                  <div>
                    <p className="font-medium text-sm">
                      {getConfidenceLabel(receiptData.confidence)}
                    </p>
                    <p className="text-xs opacity-75">
                      AI extracted data from receipt image
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{receiptData.confidence}%</p>
                  </div>
                </motion.div>
              )}

              <div>
                <Label htmlFor="amount" className="text-sm font-medium">
                  Amount * {receiptData.amount && <Sparkles className="w-3 h-3 text-purple-500 inline ml-1" />}
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={receiptData.amount || ''}
                  onChange={(e) =>
                    handleInputChange(
                      'amount',
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className={receiptData.amount ? 'mt-1 bg-purple-50 border-purple-300' : 'mt-1'}
                />
              </div>

              <div>
                <Label htmlFor="merchant" className="text-sm font-medium">
                  Merchant * {receiptData.merchant && <Sparkles className="w-3 h-3 text-purple-500 inline ml-1" />}
                </Label>
                <Input
                  id="merchant"
                  type="text"
                  placeholder="Store or merchant name"
                  value={receiptData.merchant}
                  onChange={(e) =>
                    handleInputChange('merchant', e.target.value)
                  }
                  className={receiptData.merchant ? 'mt-1 bg-purple-50 border-purple-300' : 'mt-1'}
                />
              </div>

              <div>
                <Label htmlFor="date" className="text-sm font-medium">
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={receiptData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="category" className="text-sm font-medium">
                  Category {receiptData.category !== 'Others' && <Sparkles className="w-3 h-3 text-purple-500 inline ml-1" />}
                </Label>
                <select
                  id="category"
                  value={receiptData.category}
                  onChange={(e) =>
                    handleInputChange('category', e.target.value)
                  }
                  className={`w-full mt-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    receiptData.category !== 'Others'
                      ? 'bg-purple-50 border-purple-300'
                      : ''
                  }`}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium">
                  Description (optional)
                </Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="e.g., groceries, weekly shopping"
                  value={receiptData.description}
                  onChange={(e) =>
                    handleInputChange('description', e.target.value)
                  }
                  className="mt-1"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </motion.div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    setStep('upload');
                    setPreviewImage(null);
                    setError(null);
                  }}
                  variant="outline"
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save Transaction
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-8"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6 }}
                className="inline-block mb-4"
              >
                <Check className="w-16 h-16 text-green-600" />
              </motion.div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                Transaction Created!
              </p>
              <p className="text-sm text-gray-600">
                Receipt data saved: Rs {receiptData.amount} from {receiptData.merchant}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
