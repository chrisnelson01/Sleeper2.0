import { Users, BarChart3, FileText, Activity, Settings, User } from "lucide-react";
import { motion } from "motion/react";

interface TopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "my-team", icon: User, label: "My Team" },
  { id: "all-teams", icon: Users, label: "Teams" },
  { id: "cap-outlook", icon: BarChart3, label: "Cap" },
  { id: "contracts", icon: FileText, label: "Contracts" },
  { id: "activity", icon: Activity, label: "Activity" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function TopNav({ activeTab, onTabChange }: TopNavProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <div className="max-w-[430px] mx-auto">
        {/* Liquid Glass Nav Bar */}
        <nav className="relative bg-card/40 backdrop-blur-2xl border border-border/50 rounded-[28px] shadow-2xl shadow-black/20 overflow-hidden">
          {/* Subtle gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          
          {/* Nav content */}
          <div className="relative flex items-center justify-between px-3 py-2.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className="relative flex flex-col items-center justify-center flex-1 py-2 px-1 transition-all"
                >
                  {/* Active indicator with liquid glass effect */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-accent/20 backdrop-blur-xl rounded-2xl border border-accent/30"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  
                  {/* Icon and label */}
                  <div className="relative z-10 flex flex-col items-center gap-0.5">
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        isActive ? "text-accent" : "text-muted-foreground"
                      }`}
                    />
                    <span
                      className={`text-[10px] font-medium transition-colors ${
                        isActive ? "text-accent" : "text-muted-foreground"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
