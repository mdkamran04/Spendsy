import { useEffect, useRef, useState } from 'react';
import { useApi } from '../services/api';
import { useAuth } from '@clerk/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { MessageCircle, Send } from 'lucide-react';

type ChatMessage = {
  role: 'user' | 'ai';
  content: string;
};

export default function Chat() {
  const api = useApi();
  const { isLoaded, userId } = useAuth();

  const [chatLog, setChatLog] = useState<ChatMessage[]>([
    {
      role: 'ai',
      content:
        'Hi, I am your Spendsy coach. Ask about your habits, budgets, or what to improve this week.'
    }
  ]);
  const [query, setQuery] = useState('');
  const [chatting, setChatting] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, chatting]);

  if (!isLoaded || !userId) {
    return <div className="flex h-full items-center justify-center">Loading chat...</div>;
  }

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      return;
    }

    const userQ = query.trim();
    setQuery('');
    setChatLog((prev) => [...prev, { role: 'user', content: userQ }]);
    setChatting(true);

    try {
      const res = await api.post('/insights/chat', { query: userQ });
      setChatLog((prev) => [...prev, { role: 'ai', content: res.data.reply }]);
    } catch (error) {
      console.error(error);
      setChatLog((prev) => [
        ...prev,
        { role: 'ai', content: 'I could not fetch a response right now. Please try again.' }
      ]);
    } finally {
      setChatting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chat</h1>
        <p className="mt-1 text-muted-foreground">
          Talk to your finance coach for contextual spending advice.
        </p>
      </div>

      <Card className="mx-auto flex h-[calc(100vh-13rem)] w-full max-w-4xl flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-5 w-5 text-primary" />
            Spendsy Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
            {chatLog.map((msg, i) => (
              <div key={`${msg.role}-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed md:max-w-[75%] ${
                    msg.role === 'user'
                      ? 'rounded-tr-sm bg-primary text-primary-foreground'
                      : 'rounded-tl-sm bg-muted text-foreground'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {chatting && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm text-foreground">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleChat} className="flex gap-2 border-t p-3 md:p-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about overspending, categories, or budgets"
              className="flex-1"
              disabled={chatting}
            />
            <Button type="submit" size="icon" disabled={!query.trim() || chatting}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
