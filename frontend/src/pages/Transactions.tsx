import { useEffect, useState } from 'react';
import { useApi } from '../services/api';
import { useAuth } from '@clerk/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Plus, Trash2, Download, Pencil } from 'lucide-react';
import { useToast } from '../components/ToastContext';

type Transaction = {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  paymentMethod?: string;
};

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

  const resetForm = () => {
    setEditingId(null);
    setAmount('');
    setCategory('');
    setNote('');
    setPaymentMethod('');
    setDate(new Date().toISOString().split('T')[0]);
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

  const exportCSV = () => {
    if (!transactions.length) return;
    const headers = ['Date', 'Description', 'Category', 'Payment Method', 'Amount'];
    const csvRows = [
      headers.join(','),
      ...transactions.map((t) => [
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
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Auto-categorize</option>
                  <option value="Food">Food</option>
                  <option value="Travel">Travel</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Bills">Bills</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Others">Others</option>
                </select>
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
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!transactions.length}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading transactions...</div>
            ) : !transactions.length ? (
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
                    {transactions.map((t) => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-3">{new Date(t.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-medium">{t.note}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                            {t.category}
                          </span>
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
