import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Shield, Plus, Trash2, Save, AlertTriangle, Search, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../context/AppContext";
import { api } from "../lib/api";

interface Player {
  id: string;
  name: string;
  position: string;
  amount: number;
}

interface ContractAction {
  id: string;
  playerId: string;
  playerName: string;
  playerPosition: string;
  type: "rfa" | "amnesty" | "contract" | "extension";
  contractLength?: number;
}

interface TeamActions {
  teamId: string;
  teamName: string;
  teamEmoji: string;
  teamOwner: string;
  players: Player[];
  actions: ContractAction[];
}

interface CommissionerSuperViewProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function CommissionerSuperView({ isOpen, onClose, onSaved }: CommissionerSuperViewProps) {
  if (typeof document === "undefined") return null;
  const { rostersData, selectedLeagueId } = useAppContext();
  const [teamActions, setTeamActions] = useState<TeamActions[]>([]);
  const [originalTeamActions, setOriginalTeamActions] = useState<TeamActions[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addActionTeamId, setAddActionTeamId] = useState<string | null>(null);

  const teamsFromRoster = useMemo(() => {
    return (rostersData || [])
      .map((team) => {
        const teamName = team.display_name || "Unknown";
        const initials = teamName
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2);
        const teamId = String(team.roster_id ?? team.owner_id ?? "");
        if (!teamId) return null;
        const players: Player[] = (team.players || []).map((player: any) => ({
          id: String(player.player_id),
          name: `${player.first_name} ${player.last_name}`,
          position: player.position || "N/A",
          amount: Number(player.amount || 0),
        }));
        return {
          teamId,
          teamName,
          teamEmoji: initials || "FB",
          teamOwner: teamName,
          players,
          actions: [] as ContractAction[],
        };
      })
      .filter(Boolean) as TeamActions[];
  }, [rostersData]);

  const loadActions = useCallback(async () => {
    if (!selectedLeagueId) return;
    setIsLoading(true);
    setError(null);
    try {
      const contractData = await api.getAllContracts(selectedLeagueId);
      const contractList = Array.isArray(contractData) ? contractData : [];
      const actionsByTeam: Record<string, ContractAction[]> = {};

      teamsFromRoster.forEach((team) => {
        const rosterPlayerIds = new Set(team.players.map((p) => p.id));
        const actions: ContractAction[] = [];
        const seenKeys = new Set<string>();

        contractList.forEach((contract: any) => {
          if (String(contract.team_id) !== String(team.teamId)) return;
          if (!rosterPlayerIds.has(String(contract.player_id))) return;

          const playerName = `${contract.first_name} ${contract.last_name}`;
          const playerPosition = contract.position || "N/A";
          const status = String(contract.status || "").toLowerCase();
          const baseLength = Number(contract.contract_length || 0);
          const extensionYears = Number(contract.extension_years || 0);

          if (status === "rfa") {
            const key = `rfa-${contract.player_id}`;
            if (!seenKeys.has(key)) {
              actions.push({
                id: key,
                playerId: String(contract.player_id),
                playerName,
                playerPosition,
                type: "rfa",
                contractLength: baseLength || 1,
              });
              seenKeys.add(key);
            }
          } else if (status === "amnestied") {
            const key = `amnesty-${contract.player_id}`;
            if (!seenKeys.has(key)) {
              actions.push({
                id: key,
                playerId: String(contract.player_id),
                playerName,
                playerPosition,
                type: "amnesty",
              });
              seenKeys.add(key);
            }
          } else {
            const contractKey = `contract-${contract.player_id}`;
            if (!seenKeys.has(contractKey)) {
              actions.push({
                id: contractKey,
                playerId: String(contract.player_id),
                playerName,
                playerPosition,
                type: "contract",
                contractLength: baseLength || 0,
              });
              seenKeys.add(contractKey);
            }

            if (extensionYears > 0) {
              const extKey = `extension-${contract.player_id}`;
              if (!seenKeys.has(extKey)) {
                actions.push({
                  id: extKey,
                  playerId: String(contract.player_id),
                  playerName,
                  playerPosition,
                  type: "extension",
                  contractLength: extensionYears,
                });
                seenKeys.add(extKey);
              }
            }
          }
        });

        actionsByTeam[String(team.teamId)] = actions;
      });

      const merged = teamsFromRoster.map((team) => ({
        ...team,
        actions: actionsByTeam[String(team.teamId)] || [],
      }));
      setOriginalTeamActions(merged);
      setTeamActions(merged);
      setHasChanges(false);
    } catch (err: any) {
      setError(err?.message || "Failed to load commissioner actions");
    } finally {
      setIsLoading(false);
    }
  }, [selectedLeagueId, teamsFromRoster]);

  useEffect(() => {
    if (!isOpen) return;
    loadActions();
  }, [isOpen, loadActions]);

  const actionKey = (action: Pick<ContractAction, "playerId" | "type" | "contractLength">) =>
    `${action.type}:${action.playerId}:${action.contractLength ?? ""}`;

  const syncHasChanges = useCallback((next: TeamActions[]) => {
    const buildKeySet = (actions: TeamActions[]) => {
      const map = new Map<string, Set<string>>();
      actions.forEach((team) => {
        const set = new Set<string>();
        team.actions.forEach((action) => set.add(actionKey(action)));
        map.set(team.teamId, set);
      });
      return map;
    };

    const original = buildKeySet(originalTeamActions);
    const current = buildKeySet(next);

    let changed = false;
    const teamIds = new Set<string>([
      ...Array.from(original.keys()),
      ...Array.from(current.keys()),
    ]);
    for (const teamId of teamIds) {
      const origSet = original.get(teamId) || new Set<string>();
      const currSet = current.get(teamId) || new Set<string>();
      if (origSet.size !== currSet.size) {
        changed = true;
        break;
      }
      for (const key of origSet) {
        if (!currSet.has(key)) {
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
    setHasChanges(changed);
  }, [originalTeamActions]);

  const handleRemoveAction = (teamId: string, action: ContractAction) => {
    setTeamActions((prev) => {
      const updated = prev.map((team) => {
        if (team.teamId !== teamId) return team;
        return {
          ...team,
          actions: team.actions.filter(
            (a) => actionKey(a) !== actionKey(action)
          ),
        };
      });
      syncHasChanges(updated);
      return updated;
    });
  };

  const handleAddAction = (teamId: string, action: Omit<ContractAction, "id">) => {
    setTeamActions((prev) => {
      const updated = prev.map((team) => {
        if (team.teamId !== teamId) return team;
        const nextAction: ContractAction = {
          id: `pending-${action.type}-${action.playerId}`,
          ...action,
        };
        const exists = team.actions.some(
          (a) => actionKey(a) === actionKey(nextAction)
        );
        return exists
          ? team
          : { ...team, actions: [...team.actions, nextAction] };
      });
      syncHasChanges(updated);
      return updated;
    });
  };

  const handleDiscardChanges = () => {
    setTeamActions(originalTeamActions);
    setHasChanges(false);
    setError(null);
  };

  const handleSaveChanges = async () => {
    if (!selectedLeagueId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const buildActionMap = (actions: TeamActions[]) => {
        const map = new Map<string, Map<string, ContractAction>>();
        actions.forEach((team) => {
          const teamMap = new Map<string, ContractAction>();
          team.actions.forEach((action) => teamMap.set(actionKey(action), action));
          map.set(team.teamId, teamMap);
        });
        return map;
      };

      const original = buildActionMap(originalTeamActions);
      const current = buildActionMap(teamActions);

      const teamIds = new Set<string>([
        ...Array.from(original.keys()),
        ...Array.from(current.keys()),
      ]);

      for (const teamId of teamIds) {
        const origMap = original.get(teamId) || new Map<string, ContractAction>();
        const currMap = current.get(teamId) || new Map<string, ContractAction>();

        for (const [key, action] of origMap.entries()) {
          if (!currMap.has(key)) {
            await api.removeCommissionerAction({
              league_id: selectedLeagueId,
              team_id: teamId,
              player_id: action.playerId,
              action_type: action.type,
            });
          }
        }

        for (const [key, action] of currMap.entries()) {
          if (!origMap.has(key)) {
            await api.addCommissionerAction({
              league_id: selectedLeagueId,
              team_id: teamId,
              player_id: action.playerId,
              action_type: action.type,
              contract_length: action.contractLength,
            });
          }
        }
      }

      setOriginalTeamActions(teamActions);
      setHasChanges(false);
      onClose();
      onSaved?.();
    } catch (err: any) {
      setError(err?.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const activeAddTeam = addActionTeamId
    ? teamActions.find((team) => team.teamId === addActionTeamId) || null
    : null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            style={{ zIndex: 50 }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 60, padding: "1rem" }}
          >
            <div
              className="w-full bg-card/95 backdrop-blur-2xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden flex flex-col"
              style={{ maxWidth: "36rem", maxHeight: "100%" }}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

              {/* Header */}
              <div className="relative border-b border-border/30 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 backdrop-blur-sm border border-accent/30 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-foreground">Commissioner Tools</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage player contract actions for all teams</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-xl bg-secondary/50 hover:bg-secondary/70 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Warning Banner */}
                <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-200/90">
                    Use this tool carefully. Changes here will affect league balance and team resources.
                  </p>
                </div>
                {error && (
                  <div className="mt-3 text-sm text-destructive">{error}</div>
                )}
              </div>

              {/* Teams List */}
              <div className="relative flex-1 overflow-y-auto p-5 space-y-3">
                {isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading commissioner tools…</div>
                ) : (
                  teamActions.map((team) => (
                    <TeamActionsEditor
                      key={team.teamId}
                      team={team}
                      isExpanded={expandedTeam === team.teamId}
                      onToggle={() => setExpandedTeam(expandedTeam === team.teamId ? null : team.teamId)}
                      onRemoveAction={handleRemoveAction}
                      onOpenAddModal={() => setAddActionTeamId(team.teamId)}
                    />
                  ))
                )}
              </div>

              {/* Footer Actions */}
              <div className="relative border-t border-border/30 p-4 flex gap-2">
                <button
                  onClick={handleDiscardChanges}
                  disabled={!hasChanges}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 text-foreground text-sm font-semibold transition-colors border border-border/30"
                >
                  <X className="w-4 h-4" />
                  Discard Changes
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={!hasChanges || isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-accent-foreground text-sm font-semibold transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </motion.div>

          <AddActionModal
            isOpen={!!activeAddTeam}
            onClose={() => setAddActionTeamId(null)}
            teamName={activeAddTeam?.teamName || ""}
            players={activeAddTeam?.players || []}
            onAdd={(action) => {
              if (!activeAddTeam) return;
              handleAddAction(activeAddTeam.teamId, action);
              setAddActionTeamId(null);
            }}
          />
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

interface TeamActionsEditorProps {
  team: TeamActions;
  isExpanded: boolean;
  onToggle: () => void;
  onRemoveAction: (teamId: string, action: ContractAction) => void;
  onOpenAddModal: () => void;
}

function TeamActionsEditor({ team, isExpanded, onToggle, onRemoveAction, onOpenAddModal }: TeamActionsEditorProps) {
  const actionsByType = {
    rfa: team.actions.filter((a) => a.type === "rfa"),
    amnesty: team.actions.filter((a) => a.type === "amnesty"),
    contract: team.actions.filter((a) => a.type === "contract"),
    extension: team.actions.filter((a) => a.type === "extension"),
  };

  const totalActions = team.actions.length;

  return (
    <div className="relative bg-card/40 backdrop-blur-xl rounded-xl border border-border/50 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      {/* Team Header */}
      <button
        onClick={onToggle}
        className="relative w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">{team.teamEmoji}</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h4 className="font-bold text-foreground truncate">{team.teamName}</h4>
            <p className="text-xs text-muted-foreground">
              {team.teamOwner} • {totalActions} {totalActions === 1 ? "action" : "actions"}
            </p>
          </div>
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
            <div className="relative border-t border-border/30 p-4 space-y-4">
              {/* RFA Section */}
              <ActionTypeSection
                title="RFA"
                actions={actionsByType.rfa}
                teamId={team.teamId}
                onRemoveAction={onRemoveAction}
              />

              {/* Amnesty Section */}
              <ActionTypeSection
                title="Amnesty"
                actions={actionsByType.amnesty}
                teamId={team.teamId}
                onRemoveAction={onRemoveAction}
              />

              {/* Contracts Section */}
              <ActionTypeSection
                title="Contracts"
                actions={actionsByType.contract}
                teamId={team.teamId}
                onRemoveAction={onRemoveAction}
              />

              {/* Extensions Section */}
              <ActionTypeSection
                title="Extensions"
                actions={actionsByType.extension}
                teamId={team.teamId}
                onRemoveAction={onRemoveAction}
              />

              {/* Add Player Button */}
              <button
                onClick={onOpenAddModal}
                className="w-full py-2.5 px-4 rounded-lg bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Player Action
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ActionTypeSectionProps {
  title: string;
  actions: ContractAction[];
  teamId: string;
  onRemoveAction: (teamId: string, action: ContractAction) => void;
}

function ActionTypeSection({ title, actions, teamId, onRemoveAction }: ActionTypeSectionProps) {
  if (actions.length === 0) {
    return (
      <div>
        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {title}
        </h5>
        <div className="text-xs text-muted-foreground/60 italic">No players</div>
      </div>
    );
  }

  return (
    <div>
      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </h5>
      <div className="space-y-2">
        {actions.map((action) => (
          <div
            key={action.id}
            className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/30"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">{action.playerName}</span>
                <span className="text-xs text-muted-foreground">{action.playerPosition}</span>
              </div>
              {action.contractLength && (
                <div className="text-xs text-muted-foreground mt-0.5">{action.contractLength} years</div>
              )}
            </div>
            <button
              onClick={() => onRemoveAction(teamId, action)}
              className="ml-3 w-8 h-8 rounded-lg bg-destructive/20 hover:bg-destructive/30 flex items-center justify-center transition-colors border border-destructive/30 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AddActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  players: Player[];
  onAdd: (action: Omit<ContractAction, "id">) => void;
}

function AddActionModal({ isOpen, onClose, teamName, players, onAdd }: AddActionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [actionType, setActionType] = useState<"rfa" | "amnesty" | "contract" | "extension">("contract");
  const [contractLength, setContractLength] = useState<number | null>(null);

  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    if (!selectedPlayer) return;

    onAdd({
      playerId: selectedPlayer.id,
      playerName: selectedPlayer.name,
      playerPosition: selectedPlayer.position,
      type: actionType,
      contractLength: actionType === "contract" && contractLength ? contractLength : undefined,
    });

    setSearchQuery("");
    setSelectedPlayer(null);
    setActionType("contract");
    setContractLength(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            style={{ zIndex: 70 }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 80, padding: "1rem" }}
          >
            <div
              className="w-full bg-card/95 backdrop-blur-2xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden flex flex-col"
              style={{ maxWidth: "30rem", maxHeight: "37.5rem" }}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

              {/* Header */}
              <div className="relative border-b border-border/30 p-5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-bold text-foreground">Add Player Action</h3>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl bg-secondary/50 hover:bg-secondary/70 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{teamName}</p>
              </div>

              {/* Content */}
              <div className="relative flex-1 overflow-y-auto p-5 space-y-4">
                {/* Player Search */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Select Player
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search players..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                  {searchQuery && (
                    <div className="mt-2 max-h-48 overflow-y-auto bg-secondary/20 border border-border/30 rounded-lg">
                      {filteredPlayers.map((player) => (
                        <button
                          key={player.id}
                          onClick={() => {
                            setSelectedPlayer(player);
                            setSearchQuery("");
                          }}
                          className="w-full p-3 text-left hover:bg-white/5 transition-colors border-b border-border/20 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-foreground">{player.name}</span>
                            <span className="text-xs text-muted-foreground">{player.position}</span>
                          </div>
                        </button>
                      ))}
                      {filteredPlayers.length === 0 && (
                        <div className="p-3 text-center text-xs text-muted-foreground">No players found</div>
                      )}
                    </div>
                  )}
                  {selectedPlayer && (
                    <div className="mt-2 p-3 rounded-lg bg-accent/10 border border-accent/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-sm text-foreground">{selectedPlayer.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{selectedPlayer.position}</span>
                        </div>
                        <button
                          onClick={() => setSelectedPlayer(null)}
                          className="w-6 h-6 rounded-lg bg-secondary/50 hover:bg-secondary/70 flex items-center justify-center transition-colors"
                        >
                          <X className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Type */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Action Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["rfa", "amnesty", "contract", "extension"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setActionType(type);
                          if (type !== "contract") {
                            setContractLength(null);
                          }
                        }}
                        className={`py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors border ${
                          actionType === type
                            ? "bg-accent/20 border-accent/30 text-accent"
                            : "bg-secondary/20 border-border/30 text-muted-foreground hover:bg-secondary/30"
                        }`}
                      >
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contract Length (for contracts only) */}
                {actionType === "contract" && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Contract Length (Years)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      placeholder="e.g., 3"
                      value={contractLength !== null ? contractLength.toString() : ""}
                      onChange={(e) => setContractLength(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-2.5 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="relative border-t border-border/30 p-4 flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 text-foreground text-sm font-semibold transition-colors border border-border/30"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!selectedPlayer || (actionType === "contract" && !contractLength)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-accent-foreground text-sm font-semibold transition-colors"
                >
                  Add Action
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
