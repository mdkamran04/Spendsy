import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Show, SignInButton, SignUpButton } from '@clerk/react';
import Layout from './components/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Insights = lazy(() => import('./pages/Insights'));
const Chat = lazy(() => import('./pages/Chat'));

function App() {
  return (
    <Router>
      <Show when="signed-in">
        <Layout>
          <Suspense fallback={<div className="flex h-[60vh] items-center justify-center text-muted-foreground">Loading...</div>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Layout>
      </Show>

      <Show when="signed-out">
        <div className="flex items-center justify-center min-h-screen bg-background px-4">
          <div className="text-center max-w-xl">
            <h1 className="text-5xl font-bold text-primary mb-6">Spendsy</h1>
            <p className="text-muted-foreground mb-8 text-lg">AI-powered financial behavior coach for young adults.</p>
            <div className="flex justify-center gap-4">
              <div className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition">
                <SignInButton />
              </div>
              <div className="bg-secondary text-secondary-foreground px-6 py-2 rounded-md hover:bg-secondary/80 transition">
                <SignUpButton />
              </div>
            </div>
          </div>
        </div>
      </Show>
    </Router>
  );
}

export default App;
