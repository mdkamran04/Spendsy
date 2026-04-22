import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../services/api';
import { useAuth } from '@clerk/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import { IndianRupee, TrendingUp, AlertCircle, CreditCard, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../components/ToastContext';

type InsightFlag = {
  content: string;
  type: 'trend' | 'warning' | 'suggestion';
};

type TrendPoint = {
  date?: string;
  week?: string;
  value: number;
};

type SavingsGoal = {
  targetAmount: number;
  durationMonths: number;
  monthlySavingNeeded: number;
  dailySavingNeeded: number;
};

type DashboardStats = {
  totalSpentThisMonth: number;
  monthlyBudget: number;
  remainingBudget: number;
  pieChartData: { name: string; value: number }[];
  dailyTrendData: TrendPoint[];
  weeklyTrendData: TrendPoint[];
  recentTransactions: Array<{ id: string; note?: string; category: string; amount: number; date: string }>;
  projectedSpent: number;
  projectedOverBy: number;
  dailyAvg: number;
  dailySpendLimit: number;
  behaviorFlags: InsightFlag[];
  savingsGoal: SavingsGoal | null;
};

type Profile = {
  monthlyIncome: number | null;
  monthlyBudget: number | null;
  savingsTarget: number | null;
  savingsMonths: number | null;
};

const COLORS = ['#4f8cfb', '#8b9ab3', '#f1b24a', '#ef5d5d', '#7e8aa3', '#aab7cf'];

export default function Dashboard() {
  const api = useApi();
  const { isLoaded, userId } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);

  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [durationMonths, setDurationMonths] = useState('6');

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, profileRes] = await Promise.all([
        api.get('/transactions/dashboard'),
        api.get('/user/profile')
      ]);

      setStats(statsRes.data);
      setProfile(profileRes.data);

      setMonthlyIncome(String(profileRes.data.monthlyIncome ?? ''));
      setMonthlyBudget(String(profileRes.data.monthlyBudget ?? ''));
      setTargetAmount(String(profileRes.data.savingsTarget ?? ''));
      setDurationMonths(String(profileRes.data.savingsMonths ?? 6));
    } catch (error) {
      console.error(error);
      toast('Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !userId) {
      return;
    }
    loadDashboard();
  }, [isLoaded, userId]);

  const projectedStatus = useMemo(() => {
    if (!stats) {
      return { label: 'No projection yet', danger: false };
    }

    if (stats.projectedOverBy > 0) {
      return {
        label: `Likely to exceed budget by Rs ${stats.projectedOverBy.toFixed(0)}`,
        danger: true
      };
    }

    return {
      label: 'Projection is within your current budget',
      danger: false
    };
  }, [stats]);

  const saveProfile = async () => {
    try {
      setSavingProfile(true);
      await api.patch('/user/profile', {
        monthlyIncome: monthlyIncome ? Number(monthlyIncome) : null,
        monthlyBudget: monthlyBudget ? Number(monthlyBudget) : null
      });
      toast('Profile budget settings saved.', 'success');
      await loadDashboard();
    } catch (error) {
      console.error(error);
      toast('Failed to save profile settings.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveSavingsGoal = async () => {
    if (!targetAmount || !durationMonths) {
      toast('Please enter target amount and duration.', 'error');
      return;
    }

    try {
      setSavingGoal(true);
      await api.patch('/user/savings-goal', {
        targetAmount: Number(targetAmount),
        durationMonths: Number(durationMonths)
      });
      toast('Savings goal updated.', 'success');
      await loadDashboard();
    } catch (error) {
      console.error(error);
      toast('Failed to update savings goal.', 'error');
    } finally {
      setSavingGoal(false);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your financial intelligence snapshot for this month.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs {stats?.totalSpentThisMonth?.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs {stats?.remainingBudget?.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Budget: Rs {stats?.monthlyBudget?.toFixed(2)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Avg</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs {stats?.dailyAvg?.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Daily spend limit: Rs {stats?.dailySpendLimit?.toFixed(2)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projected Spend</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${projectedStatus.danger ? 'text-destructive' : ''}`}>
                Rs {stats?.projectedSpent?.toFixed(2)}
              </div>
              <p className={`text-xs ${projectedStatus.danger ? 'text-destructive' : 'text-muted-foreground'}`}>
                {projectedStatus.label}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-full">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {stats?.pieChartData?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.pieChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `Rs ${value}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No category data yet</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 h-full">
          <CardHeader>
            <CardTitle>Daily Spending Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {stats?.dailyTrendData?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip formatter={(value) => `Rs ${value}`} />
                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Add more transactions to view trend</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Spend Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {stats?.weeklyTrendData?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weeklyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip formatter={(value) => `Rs ${value}`} />
                  <Bar dataKey="value" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Weekly trend will appear soon</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentTransactions?.map((t) => (
                <div key={t.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{t.note || t.category}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString()}</p>
                  </div>
                  <div className="font-medium text-destructive">-Rs {t.amount.toFixed(2)}</div>
                </div>
              ))}
              {(!stats?.recentTransactions || stats.recentTransactions.length === 0) && (
                <div className="text-sm text-muted-foreground text-center py-4">No recent transactions</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2" id="goals">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Profile Budget Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="income">Monthly Income (Rs)</Label>
                <Input
                  id="income"
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  placeholder="e.g. 50000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Monthly Budget (Rs)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  placeholder="e.g. 25000"
                />
              </div>
            </div>
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Savings Goal Planner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="target">Target Amount (Rs)</Label>
                <Input
                  id="target"
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="e.g. 120000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (months)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  placeholder="e.g. 12"
                />
              </div>
            </div>

            {stats?.savingsGoal && (
              <div className="rounded-md border p-3 bg-muted/30 text-sm">
                <p>Monthly saving needed: <span className="font-semibold">Rs {stats.savingsGoal.monthlySavingNeeded.toFixed(2)}</span></p>
                <p>Daily saving target: <span className="font-semibold">Rs {stats.savingsGoal.dailySavingNeeded.toFixed(2)}</span></p>
              </div>
            )}

            <Button onClick={saveSavingsGoal} disabled={savingGoal}>
              {savingGoal ? 'Updating...' : 'Update Goal'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Behavior Detection Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.behaviorFlags?.length ? (
            <div className="space-y-3">
              {stats.behaviorFlags.map((flag, idx) => (
                <div key={`${flag.type}-${idx}`} className="rounded-md border p-3 bg-muted/20">
                  <p className="text-sm font-medium">{flag.content}</p>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{flag.type}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No behavioral anomalies detected yet.</p>
          )}
        </CardContent>
      </Card>

      {profile && (
        <p className="text-xs text-muted-foreground">Profile synced for {profile.monthlyIncome !== null ? 'configured user' : 'new user'}.</p>
      )}
    </div>
  );
}
