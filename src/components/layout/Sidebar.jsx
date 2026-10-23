import React from 'react';
import {
  Timer,
  Zap,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LogIn,
  User,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'timer', label: 'Speed Timer', icon: Timer },
  { id: 'trainer', label: 'Algo Studio', icon: Zap },
  { id: 'teacher', label: 'CFOP Library', icon: GraduationCap },
];

function Sidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  session,
  profile,
  onOpenAuth,
  onSignOut,
}) {
  const displayName = profile?.username || session?.user?.email?.split('@')[0] || '';

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        {!collapsed && <span className="sidebar-logo">CubeSense</span>}
        {collapsed && <span className="sidebar-logo-compact">CS</span>}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`sidebar-link ${activeTab === id ? 'active' : ''}`}
            onClick={() => onTabChange(id)}
            title={label}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {session?.user ? (
          <>
            <button
              type="button"
              className="sidebar-link sidebar-user-btn"
              onClick={onOpenAuth}
              title={displayName ? `Signed in as ${displayName}` : 'Account Settings'}
            >
              <div className="w-5 h-5 rounded-full bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/40 flex items-center justify-center text-[10px] font-bold shrink-0">
                {displayName.charAt(0).toUpperCase() || 'U'}
              </div>
              {!collapsed && <span className="truncate">{displayName || 'Account'}</span>}
            </button>
            {onSignOut && (
              <button type="button" className="sidebar-link" onClick={onSignOut} title="Log out">
                <LogOut className="w-5 h-5 shrink-0" />
                {!collapsed && <span>Log out</span>}
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            className="sidebar-link sidebar-auth-btn text-white bg-white/5 hover:bg-white/10"
            onClick={onOpenAuth}
            title="Sign In with Google or Email"
          >
            <LogIn className="w-5 h-5 shrink-0 text-[var(--accent-cyan)]" />
            {!collapsed && <span className="font-medium">Sign In / Sync</span>}
          </button>
        )}

        <button
          type="button"
          className="sidebar-link sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
