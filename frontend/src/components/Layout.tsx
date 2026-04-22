import React, { useMemo, useState } from 'react';
import { UserButton } from '@clerk/react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Lightbulb,
  MessageCircle,
  Menu,
  X,
  Moon,
  Sun
} from 'lucide-react';
import Sidebar from './Sidebar';
import { useTheme } from './ThemeProvider';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { pathname } = useLocation();

  const links = useMemo(
    () => [
      { name: 'Dashboard', to: '/', icon: LayoutDashboard },
      { name: 'Transactions', to: '/transactions', icon: Receipt },
      { name: 'Insights', to: '/insights', icon: Lightbulb },
      { name: 'Chat', to: '/chat', icon: MessageCircle }
    ],
    []
  );

  const activeTitle = useMemo(() => {
    return links.find((link) => link.to === pathname)?.name || 'Dashboard';
  }, [links, pathname]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r md:block">
          <Sidebar links={links} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass-topbar sticky top-0 z-30">
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="glass-surface inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground md:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu size={20} />
                </button>
                <div>
                  <h2 className="text-base font-semibold tracking-tight md:text-lg">{activeTitle}</h2>
                  <p className="hidden text-xs text-muted-foreground sm:block">Spendsy workspace</p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="glass-surface inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <div className="glass-surface flex items-center gap-2 rounded-full px-2 py-1.5">
                  <UserButton />
                  <span className="hidden pr-2 text-xs font-medium text-muted-foreground sm:inline">My Account</span>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto px-4 py-5 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-40 transition-all duration-300 md:hidden ${
          mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-background/50 backdrop-blur-sm transition-opacity duration-300 ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation menu"
        />
        <aside
          className={`glass-surface absolute left-0 top-0 h-full w-72 border-r shadow-lg transition-transform duration-300 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-end p-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="glass-surface inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          </div>
          <Sidebar links={links} onNavigate={() => setMobileMenuOpen(false)} />
        </aside>
      </div>
    </div>
  );
};

export default Layout;
