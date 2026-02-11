import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Shield,
  DollarSign,
  Users,
  Trophy,
  BookOpen,
  LogOut,
  Bell,
  Edit2,
  Check,
  X,
  Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../context/AppContext";
import { CommissionerSuperView } from "./CommissionerSuperView";

interface SettingSection {
  id: string;
  title: string;
  icon: typeof Shield;
  items: SettingItem[];
  editable?: boolean;
}

interface SettingItem {
  label: string;
  value: string | number | boolean;
  description?: string;
  key: string;
}

interface SettingsProps {
  onLogout?: () => void;
  onCommissionerSaved?: () => void;
}

export function Settings({ onLogout, onCommissionerSaved }: SettingsProps) {
  const {
    rostersData,
    leagueInfo,
    leagues,
    selectedLeagueId,
    logout,
    currentSeason,
    userId,
    updateLeague,
  } = useAppContext();
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "league-info"
  );
  const [settings, setSettings] = useState<SettingSection[]>([]);
  const [showCommissionerView, setShowCommissionerView] = useState(false);
  const booleanKeys = new Set(["is_keeper", "is_auction"]);
  const numberKeys = new Set([
    "money_per_team",
    "extension_length",
    "max_contract_length",
    "rfa_length",
    "rfa_allowed",
    "amnesty_allowed",
    "extension_allowed",
    "taxi_length",
    "rollover_every",
  ]);

  const league = useMemo(
    () => leagues.find((l) => String(l.league_id) === String(selectedLeagueId)),
    [leagues, selectedLeagueId]
  );

  const isLeagueAdmin = useMemo(() => {
    const team = rostersData.find(
      (t) => String(t.owner_id) === String(userId)
    );
    return Boolean(team?.is_owner);
  }, [rostersData, userId]);

  const buildSettings = () => {
    return [
      {
        id: "league-info",
        title: "League Information",
        icon: Trophy,
        editable: false,
        items: [
          { key: "leagueName", label: "League Name", value: league?.name || "Unknown" },
          { key: "season", label: "Season", value: currentSeason || "-" },
          { key: "teams", label: "Teams", value: rostersData.length || 0 },
          { key: "commissioner", label: "Commissioner", value: leagueInfo?.commissioner || "-" },
          { key: "creation_date", label: "Creation Date", value: leagueInfo?.creation_date || "-" },
        ],
      },
      {
        id: "salary-cap",
        title: "Salary Cap Rules",
        icon: DollarSign,
        editable: true,
        items: [
          {
            key: "money_per_team",
            label: "Salary Cap",
            value:
              Number(leagueInfo?.money_per_team || 0) > 0
                ? Number(leagueInfo?.money_per_team)
                : 260,
          },
          {
            key: "max_contract_length",
            label: "Max Contract Length",
            value: leagueInfo?.max_contract_length ?? 0,
          },
          { key: "rfa_length", label: "RFA Length", value: leagueInfo?.rfa_length ?? 1 },
        ],
      },
      {
        id: "roster",
        title: "Roster Rules",
        icon: Users,
        editable: true,
        items: [
          {
            key: "is_keeper",
            label: "Keeper League",
            value: Number(leagueInfo?.is_keeper) > 0 ? 1 : 0,
          },
          {
            key: "is_auction",
            label: "Auction League",
            value: Number(leagueInfo?.is_auction) > 0 ? 1 : 0,
          },
          { key: "taxi_length", label: "Taxi Length", value: leagueInfo?.taxi_length ?? 0 },
        ],
      },
      {
        id: "transactions",
        title: "Transaction Rules",
        icon: BookOpen,
        editable: true,
        items: [
          { key: "rfa_allowed", label: "RFAs Allowed", value: leagueInfo?.rfa_allowed ?? 0 },
          { key: "extension_allowed", label: "Extensions Allowed", value: leagueInfo?.extension_allowed ?? 0 },
          { key: "amnesty_allowed", label: "Amnesties Allowed", value: leagueInfo?.amnesty_allowed ?? 0 },
          { key: "rollover_every", label: "Rollover Every", value: leagueInfo?.rollover_every ?? 0 },
        ],
      },
    ] as SettingSection[];
  };

  useEffect(() => {
    setSettings(buildSettings());
  }, [league, leagueInfo, rostersData.length, currentSeason]);


  const handleUpdateSection = async (sectionId: string, updatedItems: SettingItem[]) => {
    const updates: Record<string, any> = {};
    updatedItems.forEach((item) => {
      updates[item.key] = item.value;
    });
    await updateLeague(updates);
    setSettings((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, items: updatedItems } : section
      )
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          League rules and preferences
        </p>
      </div>

      {/* User Profile Card */}
      <div className="px-5 pb-4">
        <div className="relative bg-card/40 backdrop-blur-xl rounded-2xl p-4 border border-border/50 overflow-hidden shadow-lg shadow-black/5">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent/10 backdrop-blur-sm border border-accent/20 flex items-center justify-center">
              <span className="text-3xl font-bold">FB</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground">
                {league?.name || "Your League"}
              </h3>
              <p className="text-sm text-muted-foreground">League Overview</p>
              <p className="text-xs text-muted-foreground mt-1">
                Teams: {rostersData.length || 0}
                {isLeagueAdmin ? " - League Admin" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Toggle */}
      <div className="px-5 pb-4">
        <div className="relative bg-card/40 backdrop-blur-xl rounded-xl p-4 border border-border/50 flex items-center justify-between overflow-hidden shadow-lg shadow-black/5">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 backdrop-blur-sm border border-accent/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="font-semibold text-foreground">Push Notifications</div>
              <div className="text-xs text-muted-foreground">
                Get alerts for trades and signings
              </div>
            </div>
          </div>
          <button className="relative w-12 h-7 rounded-full bg-secondary/30 transition-colors">
            <div className="absolute left-1 top-1 w-5 h-5 rounded-full bg-background/70 shadow-lg" />
          </button>
        </div>
      </div>

      {/* League Rules Sections */}
      <div className="px-5 pb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          League Rules
        </h3>
        <div className="space-y-3">
          {settings.map((section) => (
            <SettingSection
              key={section.id}
              section={section}
              isExpanded={expandedSection === section.id}
              onToggle={() =>
                setExpandedSection(expandedSection === section.id ? null : section.id)
              }
              isAdmin={isLeagueAdmin}
              onUpdate={(updatedItems) => handleUpdateSection(section.id, updatedItems)}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-6 space-y-3">
        {isLeagueAdmin && (
          <button
            onClick={() => setShowCommissionerView(true)}
            className="relative w-full bg-accent/10 backdrop-blur-xl hover:bg-accent/20 rounded-xl p-4 border border-accent/30 text-left transition-colors overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-3">
              <Crown className="w-5 h-5 text-accent" />
              <div>
                <div className="font-semibold text-foreground">Commissioner Tools</div>
                <div className="text-xs text-muted-foreground">
                  Manage contract actions for all teams
                </div>
              </div>
            </div>
          </button>
        )}

        <button
          className="relative w-full bg-destructive/10 backdrop-blur-sm hover:bg-destructive/20 rounded-xl p-4 border border-destructive/30 text-left transition-colors overflow-hidden"
          onClick={onLogout || logout}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <LogOut className="w-5 h-5 text-destructive" />
            <div>
              <div className="font-semibold text-destructive">Logout</div>
              <div className="text-xs text-destructive/70">Sign out of your account</div>
            </div>
          </div>
        </button>
      </div>

      <div className="px-5 pb-6 text-center text-xs text-muted-foreground">
        Fantasy Football Pro - Version 2.4.1
      </div>

      <CommissionerSuperView
        isOpen={showCommissionerView}
        onClose={() => setShowCommissionerView(false)}
        onSaved={onCommissionerSaved}
      />
    </div>
  );
}

interface SettingSectionProps {
  section: SettingSection;
  isExpanded: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  onUpdate: (updatedItems: SettingItem[]) => void;
}

function SettingSection({ section, isExpanded, onToggle, isAdmin, onUpdate }: SettingSectionProps) {
  const Icon = section.icon;
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<SettingItem[]>(section.items);
  const booleanKeys = new Set(["is_keeper", "is_auction"]);
  const numberKeys = new Set([
    "money_per_team",
    "extension_length",
    "rfa_length",
    "rfa_allowed",
    "amnesty_allowed",
    "extension_allowed",
    "taxi_length",
    "rollover_every",
  ]);

  const canEdit = isAdmin && section.editable;

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditedItems(section.items);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedItems(section.items);
  };

  const handleSaveEdit = () => {
    onUpdate(editedItems);
    setIsEditing(false);
  };

  const handleItemChange = (index: number, newValue: string, key: string) => {
    const updated = [...editedItems];
    let value: string | number = newValue;
    if (booleanKeys.has(key)) {
      value = newValue === "1" ? 1 : 0;
    } else if (numberKeys.has(key)) {
      const parsed = parseInt(newValue, 10);
      value = Number.isNaN(parsed) ? 0 : parsed;
    }
    updated[index] = { ...updated[index], value };
    setEditedItems(updated);
  };

  return (
    <div className="relative bg-card/40 backdrop-blur-xl rounded-xl border border-border/50 overflow-hidden shadow-lg shadow-black/5">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative w-full p-4 flex items-center justify-between">
        <button
          onClick={onToggle}
          className="flex-1 text-left flex items-center gap-3 hover:bg-white/5 transition-colors rounded-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-secondary/30 backdrop-blur-sm flex items-center justify-center">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
          <h4 className="font-semibold text-foreground">{section.title}</h4>
        </button>
        <div className="flex items-center gap-2 pl-2">
          {canEdit && isExpanded && !isEditing && (
            <button
              onClick={handleStartEdit}
              className="w-8 h-8 rounded-lg bg-accent/20 hover:bg-accent/30 flex items-center justify-center transition-colors border border-accent/30"
            >
              <Edit2 className="w-4 h-4 text-accent" />
            </button>
          )}
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="relative px-4 pb-4 pt-2 border-t border-border/30 space-y-3">
              {isEditing ? (
                <>
                  {editedItems.map((item, index) => (
                    <div key={item.key} className="flex items-start justify-between py-2 gap-3">
                      <div className="flex-1">
                      <div className="text-sm text-foreground mb-1">{item.label}</div>
                      {booleanKeys.has(item.key) ? (
                        <select
                          value={String(item.value ?? 0)}
                          onChange={(e) => handleItemChange(index, e.target.value, item.key)}
                          className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
                        >
                          <option value="1">Yes</option>
                          <option value="0">No</option>
                        </select>
                      ) : (
                        <input
                          type={numberKeys.has(item.key) ? "number" : "text"}
                          inputMode={numberKeys.has(item.key) ? "numeric" : "text"}
                          value={item.value.toString()}
                          onChange={(e) => handleItemChange(index, e.target.value, item.key)}
                          className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
                        />
                      )}
                    </div>
                  </div>
                ))}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 py-2 px-4 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 py-2 px-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 text-foreground text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-border/30"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                section.items.map((item, index) => (
                  <div key={index} className="flex items-start justify-between py-2">
                    <div className="flex-1">
                      <div className="text-sm text-foreground">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-muted-foreground ml-4">
                      {booleanKeys.has(item.key)
                        ? Number(item.value) > 0
                          ? "Yes"
                          : "No"
                        : item.value}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
