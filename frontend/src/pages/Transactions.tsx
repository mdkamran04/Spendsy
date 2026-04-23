import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../services/api';
import { useAuth } from '@clerk/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ReceiptScanner } from '../components/ReceiptScanner';
import {
  Plus,
  Trash2,
  Download,
  Pencil,
  Filter,
  X,
  Sparkles,
  Utensils,
  Car,
  ShoppingBag,
  Receipt,
  Clapperboard,
  CircleHelp,
  Lightbulb
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToast } from '../components/ToastContext';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';

type Transaction = {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  paymentMethod?: string;
};

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'category-asc';

const CATEGORY_OPTIONS = ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Others'] as const;
type CategoryName = (typeof CATEGORY_OPTIONS)[number];

const KEYWORD_CATEGORY_MAP: Record<CategoryName, string[]> = {
  Food: ['swiggy', 'zomato', 'food', 'restaurant', 'pani puri', 'pancake', 'pizza', 'lunch', 'dinner'],
  Travel: ['uber', 'ola', 'rapido', 'train', 'flight', 'bus', 'fuel', 'petrol', 'metro'],
  Shopping: ['amazon', 'flipkart', 'myntra', 'shopping', 'clothes', 'electronics'],
  Bills: ['bill', 'electricity', 'water', 'wifi', 'internet', 'recharge', 'rent'],
  Entertainment: ['netflix', 'spotify', 'movie', 'cinema', 'bookmyshow', 'concert'],
  Others: []
};

const CATEGORY_META: Record<CategoryName, { icon: LucideIcon; badgeClass: string; chartColor: string }> = {
  Food: {
    icon: Utensils,
    badgeClass: 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
    chartColor: '#f97316'
  },
  Travel: {
    icon: Car,
    badgeClass: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
    chartColor: '#0ea5e9'
  },
  Shopping: {
    icon: ShoppingBag,
    badgeClass: 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300',
    chartColor: '#8b5cf6'
  },
  Bills: {
    icon: Receipt,
    badgeClass: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
    chartColor: '#ef4444'
  },
  Entertainment: {
    icon: Clapperboard,
    badgeClass: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    chartColor: '#10b981'
  },
  Others: {
    icon: CircleHelp,
    badgeClass: 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300',
    chartColor: '#64748b'
  }
};

const normalizeCategory = (value?: string): CategoryName => {
  const lower = (value || '').trim().toLowerCase();
  return CATEGORY_OPTIONS.find((categoryName) => categoryName.toLowerCase() === lower) ?? 'Others';
};

const getCategoryMeta = (value?: string) => {
  return CATEGORY_META[normalizeCategory(value)];
};

const suggestCategoryFromNote = (value: string): CategoryName | null => {
  const lower = value.trim().toLowerCase();
  if (!lower) return null;

  for (const categoryName of CATEGORY_OPTIONS) {
    const keywords = KEYWORD_CATEGORY_MAP[categoryName];
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return categoryName;
    }
  }

  return null;
};

const formatDateKey = (value: string) => new Date(value).toISOString().split('T')[0];

export default function Transactions() {
  const api = useApi();
  const { isLoaded, userId } = useAuth();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCategoryManuallySet, setIsCategoryManuallySet] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');

  const resetForm = () => {
    setEditingId(null);
    setAmount('');
    setCategory('');
    setNote('');
    setPaymentMethod('');
    setDate(new Date().toISOString().split('T')[0]);
    setIsCategoryManuallySet(false);
  };

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/transactions');
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
      toast('Failed to fetch transactions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !userId) {
      return;
    }
    fetchTransactions();
  }, [isLoaded, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !note) {
      toast('Amount and description are required.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        amount: Number(amount),
        category,
        note,
        date,
        paymentMethod
      };

      if (editingId) {
        await api.put(`/transactions/${editingId}`, payload);
        toast('Transaction updated successfully!', 'success');
      } else {
        await api.post('/transactions', payload);
        toast('Transaction added successfully!', 'success');
      }

      resetForm();
      await fetchTransactions();
    } catch (err) {
      console.error(err);
      toast('Failed to save transaction.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setAmount(String(tx.amount));
    setCategory(tx.category || '');
    setNote(tx.note || '');
    setPaymentMethod(tx.paymentMethod || '');
    setDate(new Date(tx.date).toISOString().split('T')[0]);
    setIsCategoryManuallySet(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await api.delete(`/transactions/${id}`);
      await fetchTransactions();
      toast('Transaction deleted.', 'success');
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      console.error(err);
      toast('Failed to delete transaction.', 'error');
    }
  };

  const categories = useMemo(() => {
    return Array.from(new Set([...CATEGORY_OPTIONS, ...transactions.map((t) => normalizeCategory(t.category))]));
  }, [transactions]);

  const suggestedCategory = useMemo(() => suggestCategoryFromNote(note), [note]);

  useEffect(() => {
    if (editingId || isCategoryManuallySet) {
      return;
    }

    setCategory(suggestedCategory ?? '');
  }, [suggestedCategory, editingId, isCategoryManuallySet]);

  const filteredTransactions = useMemo(() => {
    const start = filterStartDate ? new Date(`${filterStartDate}T00:00:00`) : null;
    const end = filterEndDate ? new Date(`${filterEndDate}T23:59:59`) : null;

    const next = transactions.filter((t) => {
      const txDate = new Date(t.date);
      const categoryMatch = filterCategory === 'all' || t.category === filterCategory;
      const dateMatch = (!start || txDate >= start) && (!end || txDate <= end);
      const query = searchQuery.trim().toLowerCase();
      const textMatch =
        !query ||
        t.note?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query) ||
        t.paymentMethod?.toLowerCase().includes(query);

      return categoryMatch && dateMatch && textMatch;
    });

    next.sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      return (a.category || '').localeCompare(b.category || '');
    });

    return next;
  }, [transactions, filterCategory, filterStartDate, filterEndDate, searchQuery, sortBy]);

  const totalFilteredSpend = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const topCategory = useMemo(() => {
    if (!filteredTransactions.length) return null;
    const byCategory = new Map<string, number>();
    filteredTransactions.forEach((t) => {
      const key = t.category || 'Uncategorized';
      byCategory.set(key, (byCategory.get(key) ?? 0) + t.amount);
    });
    const winner = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])[0];
    return winner ? { name: winner[0], value: winner[1] } : null;
  }, [filteredTransactions]);

  const pieData = useMemo(() => {
    const byCategory = new Map<string, number>();
    filteredTransactions.forEach((t) => {
      const key = t.category || 'Uncategorized';
      byCategory.set(key, (byCategory.get(key) ?? 0) + t.amount);
    });

    return Array.from(byCategory.entries())
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const dailyBarData = useMemo(() => {
    const byDate = new Map<string, number>();
    filteredTransactions.forEach((t) => {
      const key = formatDateKey(t.date);
      byDate.set(key, (byDate.get(key) ?? 0) + t.amount);
    });

    return Array.from(byDate.entries())
      .map(([dateKey, value]) => ({
        dateKey,
        label: new Date(dateKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: Number(value.toFixed(2))
      }))
      .sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime());
  }, [filteredTransactions]);

  const peakDay = useMemo(() => {
    if (!dailyBarData.length) return null;
    return [...dailyBarData].sort((a, b) => b.value - a.value)[0];
  }, [dailyBarData]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCategory('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setSortBy('date-desc');
  };

  const applyQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setFilterStartDate(start.toISOString().split('T')[0]);
    setFilterEndDate(end.toISOString().split('T')[0]);
  };

  const exportCSV = () => {
    if (!filteredTransactions.length) return;
    const headers = ['Date', 'Description', 'Category', 'Payment Method', 'Amount'];
    const csvRows = [
      headers.join(','),
      ...filteredTransactions.map((t) => [
        new Date(t.date).toISOString().split('T')[0],
        `"${t.note || ''}"`,
        `"${t.category || ''}"`,
        `"${t.paymentMethod || ''}"`,
        t.amount
      ].join(','))
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spendsy_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground mt-1">Track, edit, and export your spending records.</p>
      </div>

      {/* Receipt Scanner Section */}
      <ReceiptScanner
        onTransactionCreate={() => {
          toast('Transaction created from receipt!', 'success');
          loadTransactions();
        }}
      />

      <Card className="border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-orange-50 dark:border-slate-700/80 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Filter className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            Smart Filters & Sorting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-slate-800 dark:text-slate-100">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label htmlFor="searchQuery" className="text-slate-700 dark:text-slate-200">Search</Label>
              <Input
                id="searchQuery"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Note, category, payment"
                className="bg-white/95 text-slate-900 placeholder:text-slate-500 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="filterCategory" className="text-slate-700 dark:text-slate-200">Category</Label>
              <select
                id="filterCategory"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-white/95 px-3 py-1 text-sm text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="filterStartDate" className="text-slate-700 dark:text-slate-200">From</Label>
              <Input
                id="filterStartDate"
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="bg-white/95 text-slate-900 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="filterEndDate" className="text-slate-700 dark:text-slate-200">To</Label>
              <Input
                id="filterEndDate"
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="bg-white/95 text-slate-900 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="sortBy" className="text-slate-700 dark:text-slate-200">Sort</Label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="flex h-9 w-full rounded-md border border-input bg-white/95 px-3 py-1 text-sm text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="amount-desc">Amount high to low</option>
                <option value="amount-asc">Amount low to high</option>
                <option value="category-asc">Category A to Z</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => applyQuickRange(7)}>Last 7 days</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyQuickRange(30)}>Last 30 days</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyQuickRange(90)}>Last 90 days</Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              <X className="mr-2 h-4 w-4" />
              Reset filters
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-white/80 p-3 dark:bg-slate-900/70">
              <p className="text-xs text-slate-600 dark:text-slate-300">Visible transactions</p>
              <p className="mt-1 text-2xl font-bold">{filteredTransactions.length}</p>
            </div>
            <div className="rounded-lg border bg-white/80 p-3 dark:bg-slate-900/70">
              <p className="text-xs text-slate-600 dark:text-slate-300">Total spending in view</p>
              <p className="mt-1 text-2xl font-bold text-destructive">Rs {totalFilteredSpend.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border bg-white/80 p-3 dark:bg-slate-900/70">
              <p className="text-xs text-slate-600 dark:text-slate-300">Top category</p>
              <p className="mt-1 text-lg font-semibold">{topCategory ? `${topCategory.name} (Rs ${topCategory.value.toFixed(0)})` : 'No data yet'}</p>
            </div>
          </div>

          <div className="rounded-lg border bg-white/70 p-3 text-sm dark:bg-slate-900/70">
            <div className="flex items-center gap-2 font-medium text-sky-700 dark:text-sky-300">
              <Sparkles className="h-4 w-4" />
              Spend insight
            </div>
            <p className="mt-1 text-slate-700 dark:text-slate-300">
              {peakDay
                ? `Your highest spend day in this view was ${peakDay.label} with Rs ${peakDay.value.toFixed(2)}. Use this to spot repeat expense spikes.`
                : 'Add more transactions to unlock personalized spending insights.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {pieData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="pieGlow" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    innerRadius={62}
                    outerRadius={102}
                    paddingAngle={3}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`pie-${index}`} fill={getCategoryMeta(entry.name).chartColor} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `Rs ${value.toFixed(2)}`} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No chart data for current filters</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Spending</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {dailyBarData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyBarData}>
                  <defs>
                    <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.72} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={(v) => `Rs ${v}`} width={70} />
                  <Tooltip formatter={(value: number) => `Rs ${value.toFixed(2)}`} />
                  <Legend />
                  <Bar name="Spend" dataKey="value" fill="url(#barFill)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No daily trend for current filters</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Transaction' : 'Add Transaction'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (Rs)</Label>
                <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Description / Note</Label>
                <Input id="note" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Swiggy Lunch" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setIsCategoryManuallySet(e.target.value !== '');
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Auto-categorize</option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {!!suggestedCategory && !isCategoryManuallySet && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    Suggested: {suggestedCategory}. You can still override this.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method (Optional)</Label>
                <Input
                  id="paymentMethod"
                  type="text"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="UPI, Card, Cash"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  <Plus className="mr-2 h-4 w-4" />
                  {submitting ? 'Saving...' : editingId ? 'Update Record' : 'Add Record'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>History</CardTitle>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filteredTransactions.length}>
              <Download className="mr-2 h-4 w-4" /> Export Filtered CSV
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading transactions...</div>
            ) : !filteredTransactions.length ? (
              <div className="text-center py-8 text-muted-foreground">No transactions yet. Add your first one.</div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[760px]">
                  <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((t) => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-3">{new Date(t.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-medium">{t.note}</td>
                        <td className="px-4 py-3">
                          {(() => {
                            const meta = getCategoryMeta(t.category);
                            const CategoryIcon = meta.icon;
                            return (
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}>
                                <CategoryIcon className="h-3.5 w-3.5" />
                                {normalizeCategory(t.category)}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{t.paymentMethod || '-'}</td>
                        <td className="px-4 py-3 text-right font-medium text-destructive">-Rs {t.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => startEdit(t)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
