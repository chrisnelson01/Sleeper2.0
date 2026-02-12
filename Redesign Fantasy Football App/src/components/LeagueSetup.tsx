import { useState } from "react";
import { motion } from "motion/react";
import { Trophy, DollarSign, Users, BookOpen, Check, ChevronDown } from "lucide-react";
import { AnimatePresence } from "motion/react";
import footballImg from "../assets/d67f0282907cd80b21bf6f1a8efcd581573a39b7.png";

interface LeagueSettings {
  money_per_team: number;
  max_contract_length: number;
  rfa_length: number;
  is_keeper: number;
  is_auction: number;
  taxi_length: number;
  rfa_allowed: number;
  extension_allowed: number;
  amnesty_allowed: number;
  rollover_every: number;
}

interface LeagueSetupProps {
  leagueName: string;
  onComplete: (settings: LeagueSettings) => Promise<void>;
}

interface SettingGroup {
  id: string;
  title: string;
  icon: typeof DollarSign;
  fields: SettingField[];
}

interface SettingField {
  key: keyof LeagueSettings;
  label: string;
  type: "number" | "boolean";
  description?: string;
  min?: number;
  max?: number;
}

const settingGroups: SettingGroup[] = [
  {
    id: "salary-cap",
    title: "Salary Cap Rules",
    icon: DollarSign,
    fields: [
      {
        key: "money_per_team",
        label: "Salary Cap",
        type: "number",
        description: "Total salary cap per team",
        min: 0,
      },
      {
        key: "max_contract_length",
        label: "Max Contract Length",
        type: "number",
        description: "Maximum years for a contract",
        min: 1,
        max: 20,
      },
      {
        key: "rfa_length",
        label: "RFA Length",
        type: "number",
        description: "Length of RFA contracts in years",
        min: 1,
        max: 10,
      },
    ],
  },
  {
    id: "roster",
    title: "Roster Rules",
    icon: Users,
    fields: [
      {
        key: "is_keeper",
        label: "Keeper League",
        type: "boolean",
        description: "Allow players to be kept year-over-year",
      },
      {
        key: "is_auction",
        label: "Auction League",
        type: "boolean",
        description: "Use auction draft format",
      },
      {
        key: "taxi_length",
        label: "Taxi Squad Size",
        type: "number",
        description: "Number of taxi squad spots",
        min: 0,
        max: 10,
      },
    ],
  },
  {
    id: "transactions",
    title: "Transaction Rules",
    icon: BookOpen,
    fields: [
      {
        key: "rfa_allowed",
        label: "RFAs Allowed",
        type: "number",
        description: "Number of RFAs allowed per team per season",
        min: 0,
        max: 10,
      },
      {
        key: "extension_allowed",
        label: "Extensions Allowed",
        type: "number",
        description: "Number of extensions allowed per team per season",
        min: 0,
        max: 10,
      },
      {
        key: "amnesty_allowed",
        label: "Amnesties Allowed",
        type: "number",
        description: "Number of amnesty cuts allowed per team per season",
        min: 0,
        max: 10,
      },
      {
        key: "rollover_every",
        label: "Rollover Period",
        type: "number",
        description: "How often unused resources rollover (in years)",
        min: 0,
        max: 5,
      },
    ],
  },
];

export function LeagueSetup({ leagueName, onComplete }: LeagueSetupProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>("salary-cap");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<LeagueSettings>({
    money_per_team: 260,
    max_contract_length: 10,
    rfa_length: 1,
    is_keeper: 1,
    is_auction: 0,
    taxi_length: 3,
    rfa_allowed: 2,
    extension_allowed: 2,
    amnesty_allowed: 1,
    rollover_every: 1,
  });

  const handleFieldChange = (key: keyof LeagueSettings, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onComplete(settings);
    } catch (error) {
      console.error("Failed to save league settings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-start overflow-y-auto z-50 px-5 py-8">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 backdrop-blur-sm border border-accent/20 mb-4"
          >
            <img
              src={footballImg}
              alt="Football"
              className="w-12 h-12 object-contain"
              style={{ filter: "brightness(0) saturate(100%) invert(70%) sepia(48%) saturate(2476%) hue-rotate(86deg) brightness(98%) contrast(119%)" }}
            />
          </motion.div>
          <h1 className="text-3xl font-bold mb-2">League Setup</h1>
          <p className="text-sm text-muted-foreground mb-1">
            Configure rules for
          </p>
          <p className="text-base font-semibold text-accent">{leagueName}</p>
        </div>

        {/* Info Banner */}
        <div className="relative bg-card/40 backdrop-blur-xl rounded-xl border border-border/50 overflow-hidden shadow-lg shadow-black/5 mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 backdrop-blur-sm border border-accent/20 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">First Time Setup</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  As league commissioner, you need to configure these settings before your league members can access the app.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Groups */}
        <div className="space-y-3 mb-6">
          {settingGroups.map((group) => (
            <SettingGroupCard
              key={group.id}
              group={group}
              settings={settings}
              isExpanded={expandedGroup === group.id}
              onToggle={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
              onFieldChange={handleFieldChange}
            />
          ))}
        </div>

        {/* Submit Button */}
        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          className="relative w-full py-4 rounded-xl font-semibold text-base transition-all overflow-hidden bg-accent hover:bg-accent/90 text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-center gap-2">
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
              />
            ) : (
              <Check className="w-5 h-5" />
            )}
            <span>{loading ? "Creating League..." : "Complete Setup"}</span>
          </div>
        </motion.button>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          You can change these settings later from the Settings screen
        </div>
      </motion.div>
    </div>
  );
}

interface SettingGroupCardProps {
  group: SettingGroup;
  settings: LeagueSettings;
  isExpanded: boolean;
  onToggle: () => void;
  onFieldChange: (key: keyof LeagueSettings, value: number) => void;
}

function SettingGroupCard({
  group,
  settings,
  isExpanded,
  onToggle,
  onFieldChange,
}: SettingGroupCardProps) {
  const Icon = group.icon;

  return (
    <div className="relative bg-card/40 backdrop-blur-xl rounded-xl border border-border/50 overflow-hidden shadow-lg shadow-black/5">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {/* Header */}
      <button
        onClick={onToggle}
        className="relative w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/30 backdrop-blur-sm flex items-center justify-center">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
          <h4 className="font-semibold text-foreground">{group.title}</h4>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="relative px-4 pb-4 pt-2 border-t border-border/30 space-y-4">
              {group.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-foreground">
                        {field.label}
                      </label>
                      {field.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {field.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {field.type === "boolean" ? (
                    <select
                      value={String(settings[field.key])}
                      onChange={(e) => onFieldChange(field.key, e.target.value === "1" ? 1 : 0)}
                      className="w-full px-3 py-2.5 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
                    >
                      <option value="1">Yes</option>
                      <option value="0">No</option>
                    </select>
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={settings[field.key]}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        const clampedValue = Math.max(
                          field.min ?? 0,
                          Math.min(field.max ?? Number.MAX_SAFE_INTEGER, value)
                        );
                        onFieldChange(field.key, clampedValue);
                      }}
                      min={field.min}
                      max={field.max}
                      className="w-full px-3 py-2.5 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
