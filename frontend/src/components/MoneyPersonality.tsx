import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Zap, BookOpen, Target, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

type PersonalityType =
  | 'Impulse Spender'
  | 'Weekend Spender'
  | 'Disciplined Saver'
  | 'Balanced User';

type PersonalityDetails = {
  impulseScore: number;
  weekendVsWeekdayRatio: number;
  budgetCompliance: number;
  categoryFocus: string;
};

type MoneyPersonalityData = {
  personalityType: PersonalityType;
  explanation: string;
  details: PersonalityDetails;
};

type MoneyPersonalityProps = {
  data?: MoneyPersonalityData;
  loading?: boolean;
  error?: string;
};

const getPersonalityIcon = (type: PersonalityType) => {
  switch (type) {
    case 'Impulse Spender':
      return <Zap className="w-6 h-6 text-orange-600" />;
    case 'Weekend Spender':
      return <Lightbulb className="w-6 h-6 text-purple-600" />;
    case 'Disciplined Saver':
      return <Target className="w-6 h-6 text-green-600" />;
    case 'Balanced User':
      return <BookOpen className="w-6 h-6 text-blue-600" />;
    default:
      return <Lightbulb className="w-6 h-6 text-gray-600" />;
  }
};

const getPersonalityColor = (type: PersonalityType): string => {
  switch (type) {
    case 'Impulse Spender':
      return 'bg-orange-50 border-orange-200';
    case 'Weekend Spender':
      return 'bg-purple-50 border-purple-200';
    case 'Disciplined Saver':
      return 'bg-green-50 border-green-200';
    case 'Balanced User':
      return 'bg-blue-50 border-blue-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

const getPersonalityTextColor = (type: PersonalityType): string => {
  switch (type) {
    case 'Impulse Spender':
      return 'text-orange-700';
    case 'Weekend Spender':
      return 'text-purple-700';
    case 'Disciplined Saver':
      return 'text-green-700';
    case 'Balanced User':
      return 'text-blue-700';
    default:
      return 'text-gray-700';
  }
};

export const MoneyPersonality = ({
  data,
  loading,
  error,
}: MoneyPersonalityProps) => {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Money Personality
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
            Money Personality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error || 'Unable to load personality'}</p>
        </CardContent>
      </Card>
    );
  }

  const personality = data.personalityType;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getPersonalityIcon(personality)}
          Money Personality
        </CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`p-4 rounded-lg border-2 mb-4 ${getPersonalityColor(
            personality
          )}`}
        >
          <h3
            className={`text-lg font-bold ${getPersonalityTextColor(
              personality
            )} mb-2`}
          >
            {personality}
          </h3>
          <p className="text-sm text-gray-700">{data.explanation}</p>
        </motion.div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-700">
                Impulse Score
              </span>
              <span className="text-sm font-bold text-gray-900">
                {data.details.impulseScore}/100
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.details.impulseScore}%` }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="bg-orange-500 h-2 rounded-full"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-700">
                Weekend vs Weekday
              </span>
              <span className="text-sm font-bold text-gray-900">
                {data.details.weekendVsWeekdayRatio}x
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {data.details.weekendVsWeekdayRatio > 1.2
                ? "You spend significantly more on weekends"
                : "You spend consistently throughout the week"}
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-700">
                Budget Compliance
              </span>
              <span className="text-sm font-bold text-gray-900">
                {data.details.budgetCompliance}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.details.budgetCompliance}%` }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="bg-green-500 h-2 rounded-full"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-700">
                Top Category
              </span>
              <span className="inline-block bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium">
                {data.details.categoryFocus}
              </span>
            </div>
          </div>
        </div>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-gray-200"
          >
            <p className="text-xs text-gray-600 leading-relaxed">
              Based on {data.details.impulseScore > 70 ? "your frequent small purchases" : "your spending behavior"}, the
              system has identified you as a <strong>{personality}</strong>. This
              classification helps personalize financial recommendations for
              better money management.
            </p>
          </motion.div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {expanded ? 'Show less' : 'Learn more'}
        </button>
      </CardContent>
    </Card>
  );
};
