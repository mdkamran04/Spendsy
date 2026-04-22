import { useEffect, useState } from 'react';
import { useApi } from '../services/api';
import { useAuth } from '@clerk/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Sparkles, AlertTriangle, TrendingDown, Lightbulb } from 'lucide-react';

export default function Insights() {
  const api = useApi();
  const { isLoaded, userId } = useAuth();
  const [insights, setInsights] = useState<any[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  useEffect(() => {
    if (!isLoaded || !userId) {
      return;
    }
    fetchInsights();
  }, [isLoaded, userId]);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await api.get('/insights');
      setInsights(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const generateNewInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await api.post('/insights/generate');
      setInsights(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type.toLowerCase()) {
      case 'warning': return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'trend': return <TrendingDown className="h-5 w-5 text-blue-500" />;
      case 'suggestion': return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      default: return <Sparkles className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Insights</h1>
        <p className="text-muted-foreground mt-1">Automated behavior analysis and spending guidance.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card className="flex flex-col md:col-span-2 xl:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Latest Insights
            </CardTitle>
            <Button variant="outline" size="sm" onClick={generateNewInsights} disabled={loadingInsights}>
              {loadingInsights ? 'Generating...' : 'Refresh Insights'}
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {insights.length === 0 && !loadingInsights ? (
              <div className="text-center py-10 text-muted-foreground">
                <p>No insights generated yet.</p>
                <Button variant="link" onClick={generateNewInsights}>Analyze my data now</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {insights.map(insight => (
                  <div key={insight.id} className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                    <div className="mt-0.5 p-2 bg-muted rounded-full">
                      {getIconForType(insight.type)}
                    </div>
                    <div>
                      <p className="font-medium text-sm leading-relaxed">{insight.content}</p>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-2 block">
                        {insight.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
