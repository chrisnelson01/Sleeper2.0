import { motion } from "motion/react";
import { Clock, AlertCircle, LogOut } from "lucide-react";

interface WaitingForSetupProps {
  leagueName: string;
  commissionerName: string;
  onLogout: () => void;
  onCheckAgain?: () => void;
}

export function WaitingForSetup({ 
  leagueName, 
  commissionerName, 
  onLogout,
  onCheckAgain 
}: WaitingForSetupProps) {
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 px-5">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Almost There!</h1>
          <p className="text-sm text-muted-foreground">
            Your league is being configured
          </p>
        </div>

        {/* League Info Card */}
        <div className="relative bg-card/40 backdrop-blur-xl rounded-xl border border-border/50 overflow-hidden shadow-lg shadow-black/5 mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Waiting for Commissioner</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-accent">{commissionerName}</span> needs to complete the initial league setup before you can access{" "}
                  <span className="font-semibold text-foreground">{leagueName}</span>.
                </p>
              </div>
            </div>

            {/* Status Steps */}
            <div className="space-y-2.5 mt-4 pt-4 border-t border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-sm text-muted-foreground">Account created</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-sm text-muted-foreground">Sleeper username linked</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-sm text-muted-foreground">League selected</span>
              </div>
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-2 h-2 rounded-full bg-yellow-500"
                />
                <span className="text-sm text-foreground font-medium">Waiting for league configuration...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="relative bg-card/40 backdrop-blur-xl rounded-xl border border-border/50 overflow-hidden shadow-lg shadow-black/5 mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-sm mb-1">What's happening?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your league commissioner is setting up salary cap rules, roster limits, and transaction policies. You'll be notified once setup is complete.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {onCheckAgain && (
            <motion.button
              type="button"
              onClick={onCheckAgain}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative w-full py-4 rounded-xl font-semibold text-base transition-all overflow-hidden bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              <div className="relative flex items-center justify-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Clock className="w-5 h-5" />
                </motion.div>
                <span>Check Again</span>
              </div>
            </motion.button>
          )}

          <motion.button
            type="button"
            onClick={onLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative w-full py-4 rounded-xl font-semibold text-base transition-all overflow-hidden bg-card/40 backdrop-blur-xl hover:bg-card/60 border border-border/50 text-foreground"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative flex items-center justify-center gap-2">
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </div>
          </motion.button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          Sleeper 3.0 - Version 3.0.0
        </div>
      </motion.div>
    </div>
  );
}
