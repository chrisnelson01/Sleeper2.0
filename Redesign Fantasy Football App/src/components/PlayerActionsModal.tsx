import { X, UserPlus, Ban, FileText, FileSignature } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "./ui/badge";
import { useMemo, useState } from "react";
import { AddContractModal } from "./AddContractModal";
import { useAppContext } from "../context/AppContext";
import { api } from "../lib/api";

interface Player {
  id: string;
  name: string;
  position: string;
  salary: number;
  years: number;
  capHit: number;
  status: "active" | "injured" | "amnestied";
}

interface PlayerActionsModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  rfaLeft: number;
  amnestyLeft: number;
  teamId: string | number | null;
  extensionLeft: number;
}

export function PlayerActionsModal({
  player,
  isOpen,
  onClose,
  rfaLeft,
  amnestyLeft,
  teamId,
  extensionLeft,
}: PlayerActionsModalProps) {
  const [showAddContract, setShowAddContract] = useState(false);
  const [showAmnestyConfirm, setShowAmnestyConfirm] = useState(false);
  const [showRfaConfirm, setShowRfaConfirm] = useState(false);
  const [showExtensionConfirm, setShowExtensionConfirm] = useState(false);
  const [isSubmittingAmnesty, setIsSubmittingAmnesty] = useState(false);
  const [isSubmittingRfa, setIsSubmittingRfa] = useState(false);
  const [isSubmittingExtension, setIsSubmittingExtension] = useState(false);
  const [amnestyError, setAmnestyError] = useState<string | null>(null);
  const [rfaError, setRfaError] = useState<string | null>(null);
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const hasActiveContract = player.years > 0;
  const yearsDisplay = player.years > 0 ? `${player.years}yr` : "N/A";
  const canRfa = rfaLeft > 0;
  const canAmnesty = amnestyLeft > 0;
  const canExtend = extensionLeft > 0;
  const { selectedLeagueId, refreshLeagueData, leagueInfo } = useAppContext();
  const extensionLength = useMemo(() => {
    const raw = Number(leagueInfo?.extension_length ?? 1);
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  }, [leagueInfo?.extension_length]);

  const handleAddContract = () => {
    onClose();
    setShowAddContract(true);
  };

  const handleStartAmnesty = () => {
    if (!canAmnesty) return;
    setAmnestyError(null);
    setShowAmnestyConfirm(true);
  };

  const handleStartRfa = () => {
    if (!canRfa) return;
    setRfaError(null);
    setShowRfaConfirm(true);
  };

  const handleStartExtension = () => {
    if (!canExtend) return;
    setExtensionError(null);
    setShowExtensionConfirm(true);
  };

  const handleConfirmAmnesty = async () => {
    if (!selectedLeagueId || isSubmittingAmnesty) return;
    if (!teamId) {
      setAmnestyError("Team not found");
      return;
    }
    setIsSubmittingAmnesty(true);
    setAmnestyError(null);
    try {
      await api.addAmnesty({
        league_id: selectedLeagueId,
        player_id: player.id,
        team_id: String(teamId),
      });
      await refreshLeagueData();
      setShowAmnestyConfirm(false);
      onClose();
    } catch (err: any) {
      setAmnestyError(err?.message || "Failed to amnesty player");
    } finally {
      setIsSubmittingAmnesty(false);
    }
  };

  const handleConfirmRfa = async () => {
    if (!selectedLeagueId || isSubmittingRfa) return;
    if (!teamId) {
      setRfaError("Team not found");
      return;
    }
    setIsSubmittingRfa(true);
    setRfaError(null);
    try {
      await api.addRfa({
        league_id: selectedLeagueId,
        player_id: player.id,
        team_id: String(teamId),
      });
      await refreshLeagueData();
      setShowRfaConfirm(false);
      onClose();
    } catch (err: any) {
      setRfaError(err?.message || "Failed to add RFA");
    } finally {
      setIsSubmittingRfa(false);
    }
  };

  const handleConfirmExtension = async () => {
    if (!selectedLeagueId || isSubmittingExtension) return;
    if (!teamId) {
      setExtensionError("Team not found");
      return;
    }
    setIsSubmittingExtension(true);
    setExtensionError(null);
    try {
      await api.addExtension({
        league_id: selectedLeagueId,
        player_id: player.id,
        team_id: String(teamId),
      });
      await refreshLeagueData();
      setShowExtensionConfirm(false);
      onClose();
    } catch (err: any) {
      setExtensionError(err?.message || "Failed to extend contract");
    } finally {
      setIsSubmittingExtension(false);
    }
  };

  const positionColors: Record<string, string> = {
    QB: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    RB: "bg-green-500/20 text-green-400 border-green-500/30",
    WR: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    TE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    LB: "bg-red-500/20 text-red-400 border-red-500/30",
    DB: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-card/60 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

              <div className="relative bg-secondary/20 backdrop-blur-xl p-5 border-b border-border/30">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-foreground mb-1">{player.name}</h3>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`${positionColors[player.position] || "bg-secondary text-muted-foreground"} border px-2 py-0.5 text-xs font-bold backdrop-blur-sm`}
                      >
                        {player.position}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ${player.salary.toLocaleString()} / {yearsDisplay}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-secondary/50 backdrop-blur-sm hover:bg-secondary flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-background/30 backdrop-blur-sm rounded-lg p-2 border border-border/20">
                    <div className="text-xs text-muted-foreground mb-0.5">Cap Hit 2026</div>
                    <div className="text-sm font-bold text-foreground">
                      ${player.capHit.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-background/30 backdrop-blur-sm rounded-lg p-2 border border-border/20">
                    <div className="text-xs text-muted-foreground mb-0.5">Years Left</div>
                    <div className="text-sm font-bold text-foreground">
                      {player.years > 0 ? player.years : "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative p-5 space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Contract Actions
                </h4>

                {hasActiveContract && (
                  <button
                    onClick={handleStartExtension}
                    disabled={!canExtend}
                    className={`relative w-full rounded-xl p-4 border transition-all text-left group overflow-hidden ${
                      canExtend
                        ? "bg-secondary/20 backdrop-blur-sm hover:bg-secondary/40 border-border/30"
                        : "bg-secondary/10 border-border/10 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-green-500/20 backdrop-blur-sm border border-green-500/30 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                        <FileSignature className="w-6 h-6 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-foreground mb-0.5">
                          Contract Extension
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {canExtend ? "Extend player's contract with new terms" : "No extensions remaining"}
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                {hasActiveContract && (
                  <>
                    <button
                      onClick={handleStartRfa}
                      disabled={!canRfa}
                      className={`relative w-full rounded-xl p-4 border transition-all text-left group overflow-hidden ${
                        canRfa
                          ? "bg-secondary/20 backdrop-blur-sm hover:bg-secondary/40 border-border/30"
                          : "bg-secondary/10 border-border/10 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                          <UserPlus className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground mb-0.5">
                            Add as Restricted Free Agent
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {canRfa ? "Place tender and retain matching rights" : "No RFAs remaining"}
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={handleStartAmnesty}
                      disabled={!canAmnesty}
                      className={`relative w-full rounded-xl p-4 border transition-all text-left group overflow-hidden ${
                        canAmnesty
                          ? "bg-secondary/20 backdrop-blur-sm hover:bg-secondary/40 border-border/30"
                          : "bg-secondary/10 border-border/10 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/20 backdrop-blur-sm border border-orange-500/30 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                          <Ban className="w-6 h-6 text-orange-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground mb-0.5">
                            Amnesty Player
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {canAmnesty ? "Release player and clear cap space" : "No amnesties remaining"}
                          </div>
                        </div>
                      </div>
                    </button>
                  </>
                )}

                {!hasActiveContract && (
                  <button
                    onClick={handleAddContract}
                    className="relative w-full bg-accent/10 backdrop-blur-sm hover:bg-accent/20 rounded-xl p-4 border border-accent/30 transition-all text-left group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-accent/20 backdrop-blur-sm border border-accent/40 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                        <FileText className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-foreground mb-0.5">
                          Add Contract
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Set contract length for this player
                        </div>
                      </div>
                    </div>
                  </button>
                )}
              </div>

              <div className="relative px-5 pb-5">
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-secondary/30 backdrop-blur-sm hover:bg-secondary/50 transition-colors text-sm font-semibold text-foreground border border-border/20"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AddContractModal
        player={player}
        isOpen={showAddContract}
        onClose={() => setShowAddContract(false)}
      />

      {/* RFA Confirmation Modal */}
      <AnimatePresence>
        {showRfaConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRfaConfirm(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-card/60 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

              <div className="relative bg-blue-500/10 backdrop-blur-xl p-6 border-b border-blue-500/20">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 flex items-center justify-center">
                    <UserPlus className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-center text-foreground mb-2">
                  Add Restricted Free Agent?
                </h3>
                <p className="text-sm text-center text-muted-foreground">
                  You're about to designate{" "}
                  <span className="font-semibold text-foreground">{player.name}</span> as a Restricted Free Agent. This will place a tender and retain matching rights.
                </p>
              </div>

              <div className="relative p-5 border-b border-border/30">
                <div className="flex items-center gap-3 bg-secondary/20 backdrop-blur-sm rounded-xl p-3 border border-border/20">
                  <Badge
                    className={`${
                      positionColors[player.position] || "bg-secondary text-muted-foreground"
                    } border px-2 py-0.5 text-xs font-bold`}
                  >
                    {player.position}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{player.name}</div>
                    <div className="text-xs text-muted-foreground">
                      ${player.salary.toLocaleString()} / {yearsDisplay}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative p-5 space-y-3">
                {rfaError && (
                  <div className="text-sm text-destructive text-center">
                    {rfaError}
                  </div>
                )}
                <button
                  onClick={handleConfirmRfa}
                  className="relative w-full py-3.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 transition-all text-base font-semibold text-blue-400 overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative">
                    {isSubmittingRfa ? "Confirming..." : "Confirm RFA Designation"}
                  </span>
                </button>
                <button
                  onClick={() => setShowRfaConfirm(false)}
                  className="w-full py-3.5 rounded-xl bg-secondary/30 backdrop-blur-sm hover:bg-secondary/50 transition-colors text-base font-semibold text-foreground border border-border/20"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Amnesty Confirmation Modal */}
      <AnimatePresence>
        {showAmnestyConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAmnestyConfirm(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-card/60 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

              <div className="relative bg-orange-500/10 backdrop-blur-xl p-6 border-b border-orange-500/20">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-orange-500/20 backdrop-blur-sm border border-orange-500/30 flex items-center justify-center">
                    <Ban className="w-8 h-8 text-orange-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-center text-foreground mb-2">
                  Amnesty Player?
                </h3>
                <p className="text-sm text-center text-muted-foreground">
                  You're about to amnesty{" "}
                  <span className="font-semibold text-foreground">{player.name}</span>. This will release the player and clear cap space.{" "}
                  <span className="font-semibold text-orange-400">This action cannot be undone.</span>
                </p>
              </div>

              <div className="relative p-5 border-b border-border/30">
                <div className="flex items-center gap-3 bg-secondary/20 backdrop-blur-sm rounded-xl p-3 border border-border/20">
                  <Badge
                    className={`${
                      positionColors[player.position] || "bg-secondary text-muted-foreground"
                    } border px-2 py-0.5 text-xs font-bold`}
                  >
                    {player.position}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{player.name}</div>
                    <div className="text-xs text-muted-foreground">
                      ${player.salary.toLocaleString()} / {yearsDisplay}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative p-5 space-y-3">
                {amnestyError && (
                  <div className="text-sm text-destructive text-center">
                    {amnestyError}
                  </div>
                )}
                <button
                  onClick={handleConfirmAmnesty}
                  className="relative w-full py-3.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 transition-all text-base font-semibold text-orange-400 overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative">
                    {isSubmittingAmnesty ? "Amnestying..." : "Confirm Amnesty"}
                  </span>
                </button>
                <button
                  onClick={() => setShowAmnestyConfirm(false)}
                  className="w-full py-3.5 rounded-xl bg-secondary/30 backdrop-blur-sm hover:bg-secondary/50 transition-colors text-base font-semibold text-foreground border border-border/20"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Extension Confirmation Modal */}
      <AnimatePresence>
        {showExtensionConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExtensionConfirm(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-card/60 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

              <div className="relative bg-green-500/10 backdrop-blur-xl p-6 border-b border-green-500/20">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 backdrop-blur-sm border border-green-500/30 flex items-center justify-center">
                    <FileSignature className="w-8 h-8 text-green-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-center text-foreground mb-2">
                  Extend Contract?
                </h3>
                <p className="text-sm text-center text-muted-foreground">
                  You're about to extend{" "}
                  <span className="font-semibold text-foreground">{player.name}</span>'s contract. This will add
                  additional years and update the contract terms.
                </p>
              </div>

              <div className="relative p-5 border-b border-border/30">
                <div className="flex items-center gap-3 bg-secondary/20 backdrop-blur-sm rounded-xl p-3 border border-border/20">
                  <Badge
                    className={`${
                      positionColors[player.position] || "bg-secondary text-muted-foreground"
                    } border px-2 py-0.5 text-xs font-bold`}
                  >
                    {player.position}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{player.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Current: ${player.salary.toLocaleString()} / {yearsDisplay}
                    </div>
                  </div>
                </div>

                <div className="mt-3 bg-green-500/10 backdrop-blur-sm rounded-xl p-3 border border-green-500/20">
                  <div className="text-xs text-green-400 font-semibold mb-2 uppercase tracking-wider">
                    Extension Preview
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-0.5">New Term</div>
                      <div className="text-sm font-bold text-foreground">
                        +{extensionLength} {extensionLength === 1 ? "year" : "years"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-0.5">Annual Value</div>
                      <div className="text-sm font-bold text-foreground">
                        ${player.salary.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative p-5 space-y-3">
                {extensionError && (
                  <div className="text-sm text-destructive text-center">
                    {extensionError}
                  </div>
                )}
                <button
                  onClick={handleConfirmExtension}
                  className="relative w-full py-3.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 transition-all text-base font-semibold text-green-400 overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative">
                    {isSubmittingExtension ? "Extending..." : "Confirm Extension"}
                  </span>
                </button>
                <button
                  onClick={() => setShowExtensionConfirm(false)}
                  className="w-full py-3.5 rounded-xl bg-secondary/30 backdrop-blur-sm hover:bg-secondary/50 transition-colors text-base font-semibold text-foreground border border-border/20"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
