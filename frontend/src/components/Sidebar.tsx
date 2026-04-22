import { NavLink } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

type NavigationItem = {
  name: string;
  to: string;
  icon: LucideIcon;
};

type SidebarProps = {
  links: NavigationItem[];
  onNavigate?: () => void;
};

const Sidebar = ({ links, onNavigate }: SidebarProps) => {
  return (
    <div className="glass-surface flex h-full flex-col p-4">
      <div className="mb-8 flex items-center gap-3 px-2 pt-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/90 text-base font-bold text-primary-foreground shadow-sm">
          S
        </div>
        <div>
          <h1 className="font-semibold tracking-tight text-foreground">Spendsy</h1>
          <p className="text-xs text-muted-foreground">Finance OS</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`
              }
            >
              <Icon size={18} />
              <span className="font-medium">{link.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
