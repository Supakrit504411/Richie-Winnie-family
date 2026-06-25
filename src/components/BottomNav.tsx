'use client';

interface BottomNavProps {
  tabs: Array<{
    id: string;
    label: string;
    icon: string;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function BottomNav({ tabs, activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
