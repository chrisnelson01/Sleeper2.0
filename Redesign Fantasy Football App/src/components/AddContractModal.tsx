import { X, Plus, Minus, FileText, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "./ui/badge";
import { useEffect, useState } from "react";
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

interface AddContractModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
}

export function AddContractModal({ player, isOpen, onClose }: AddContractModalProps) {
  const { selectedLeagueId, refreshLeagueData } = useAppContext();
  const [contractYears, setContractYears] = useState(1);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setContractYears(1);
    setShowConfirmation(false);
    setIsSubmitting(false);
    setError(null);
  }, [isOpen]);

  const handleDecrement = () => {
    if (contractYears > 1) {
      setContractYears(contractYears - 1);
    }
  };

  const handleIncrement = () => {
    if (contractYears < 10) {
      setContractYears(contractYears + 1);
    }
  };

  const handleContinue = () => {
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!selectedLeagueId || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.addContract({
        league_id: selectedLeagueId,
        player_id: player.id,
        contract_length: contractYears,
        contract_amount: player.salary,
      });
      await refreshLeagueData();
      setShowConfirmation(false);
      setContractYears(1);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to add contract");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setContractYears(1);
    setError(null);
    onClose();
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
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
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
                  </div>
                </div>

                <button
                  onClick={handleCancel}
                  className="w-8 h-8 rounded-full bg-secondary/50 backdrop-blur-sm hover:bg-secondary flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {showConfirmation ? (
              <div className="relative p-5">
                <div className="flex items-start gap-3 mb-4 p-4 bg-orange-500/10 backdrop-blur-sm rounded-xl border border-orange-500/30">
                  <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">
                      Confirm Contract Creation
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      This action cannot be undone. You are about to create a{" "}
                      <span className="font-bold text-foreground">
                        {contractYears}-year contract
                      </span>{" "}
                      for <span className="font-bold text-foreground">{player.name}</span>.
                    </p>
                  </div>
                </div>

                <div className="mb-5 p-4 bg-secondary/20 backdrop-blur-sm rounded-xl border border-border/30">
                  <h5 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Contract Summary
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Player</span>
                      <span className="text-sm font-semibold text-foreground">{player.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Position</span>
                      <span className="text-sm font-semibold text-foreground">
                        {player.position}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Salary</span>
                      <span className="text-sm font-semibold text-foreground">
                        ${player.salary.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Contract Length</span>
                      <span className="text-sm font-semibold text-accent">
                        {contractYears} {contractYears === 1 ? "year" : "years"}
                      </span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 text-sm text-destructive text-center">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={handleConfirm}
                    className="w-full py-3 rounded-xl bg-accent hover:bg-accent/90 transition-colors text-sm font-semibold text-accent-foreground"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Adding..." : "Confirm Contract"}
                  </button>
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="w-full py-3 rounded-xl bg-secondary/30 backdrop-blur-sm hover:bg-secondary/50 transition-colors text-sm font-semibold text-foreground border border-border/20"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative p-5">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Select Contract Length
                </h4>

                <div className="mb-6">
                  <div className="flex items-center justify-center gap-4 p-6 bg-secondary/20 backdrop-blur-sm rounded-xl border border-border/30">
                    <button
                      onClick={handleDecrement}
                      disabled={contractYears <= 1}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        contractYears <= 1
                          ? "bg-secondary/20 text-muted-foreground/30 cursor-not-allowed"
                          : "bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30"
                      }`}
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <div className="min-w-[120px] text-center">
                      <div className="text-5xl font-bold text-foreground">{contractYears}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {contractYears === 1 ? "year" : "years"}
                      </div>
                    </div>

                    <button
                      onClick={handleIncrement}
                      disabled={contractYears >= 10}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        contractYears >= 10
                          ? "bg-secondary/20 text-muted-foreground/30 cursor-not-allowed"
                          : "bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30"
                      }`}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-3 text-xs text-center text-muted-foreground">
                    Minimum: 1 year - Maximum: 10 years
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleContinue}
                    className="w-full py-3 rounded-xl bg-accent hover:bg-accent/90 transition-colors text-sm font-semibold text-accent-foreground flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Continue
                  </button>
                  <button
                    onClick={handleCancel}
                    className="w-full py-3 rounded-xl bg-secondary/30 backdrop-blur-sm hover:bg-secondary/50 transition-colors text-sm font-semibold text-foreground border border-border/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
