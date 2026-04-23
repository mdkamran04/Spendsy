import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

type ScoreDetails = {
  budgetAdherence: number;
  categoryDistribution: number;
  spendingPatternStability: number;
};

type SpendingScoreData = {
  score: number;
  details: ScoreDetails;
  feedback: string;
};

type SpendingScoreProps = {
  data?: SpendingScoreData;
  loading?: boolean;
  error?: string;
};

const getScoreColor = (score: number): string => {
  if (score >= 85) return 'text-green-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 85) return 'bg-green-50';
  if (score >= 70) return 'bg-blue-50';
  if (score >= 50) return 'bg-yellow-50';
  return 'bg-red-50';
};

const getScoreIcon = (score: number) => {
  if (score >= 85) return <CheckCircle className="w-6 h-6 text-green-600" />;
  if (score >= 70) return <TrendingUp className="w-6 h-6 text-blue-600" />;
  return <AlertCircle className="w-6 h-6 text-yellow-600" />;
};

export const SpendingScore = ({ data, loading, error }: SpendingScoreProps) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (data?.score) {
      // Animate score count-up
      let current = 0;
      const increment = data.score / 30;
      const timer = setInterval(() => {
        current += increment;
        if (current >= data.score) {
          setDisplayScore(data.score);
          clearInterval(timer);
        } else {
          setDisplayScore(Math.round(current));
        }
      }, 20);

      return () => clearInterval(timer);
    }
  }, [data?.score]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Spending Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Spending Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error || 'Unable to load score'}</p>
        </CardContent>
      </Card>
    );
  }

  const score = data.score;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getScoreIcon(score)}
          Spending Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`p-6 rounded-lg ${getScoreBgColor(score)} mb-6`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-center"
          >
            <div className={`text-5xl font-bold ${getScoreColor(score)} mb-2`}>
              {displayScore}
              <span className="text-2xl">/100</span>
            </div>
            <p className="text-sm text-gray-600 font-medium">{data.feedback}</p>
          </motion.div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-700">
                Budget Adherence
              </span>
              <span className={`text-sm font-bold ${getScoreColor(data.details.budgetAdherence)}`}>
                {data.details.budgetAdherence}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.details.budgetAdherence}%` }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="bg-blue-500 h-2 rounded-full"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-700">
                Category Distribution
              </span>
              <span className={`text-sm font-bold ${getScoreColor(data.details.categoryDistribution)}`}>
                {data.details.categoryDistribution}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.details.categoryDistribution}%` }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="bg-purple-500 h-2 rounded-full"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-700">
                Spending Stability
              </span>
              <span className={`text-sm font-bold ${getScoreColor(data.details.spendingPatternStability)}`}>
                {data.details.spendingPatternStability}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.details.spendingPatternStability}%` }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="bg-orange-500 h-2 rounded-full"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
