import React from 'react';
import {
  Timer,
  Zap,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  LogOut,
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
  profile,
  onSignOut,
}) {
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
        {!collapsed && profile?.username && (
          <div className="sidebar-user">{profile.username}</div>
        )}
        {onSignOut && (
          <button type="button" className="sidebar-link" onClick={onSignOut} title="Log out">
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Log out</span>}
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
