import { useState } from "react";
import { motion } from "motion/react";
import { User, ArrowRight, AlertCircle } from "lucide-react";
import { AnimatePresence } from "motion/react";
import footballImg from "../assets/d67f0282907cd80b21bf6f1a8efcd581573a39b7.png";

interface LinkSleeperUsernameProps {
  onLinkUsername: (username: string) => Promise<void>;
}

export function LinkSleeperUsername({ onLinkUsername }: LinkSleeperUsernameProps) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your Sleeper username");
      return;
    }

    setLoading(true);
    try {
      await onLinkUsername(username.trim());
    } catch (err: any) {
      setError(err.message || "Failed to link username");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 px-5">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-full max-w-md"
      >
        {/* Logo/Title */}
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
          <h1 className="text-3xl font-bold mb-2">Link Your Sleeper</h1>
          <p className="text-sm text-muted-foreground">
            Enter your Sleeper username to continue
          </p>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="relative bg-destructive/10 backdrop-blur-sm rounded-xl border border-destructive/30 overflow-hidden"
            >
              <div className="flex items-start gap-3 p-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive flex-1">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Card */}
        <div className="relative bg-card/40 backdrop-blur-xl rounded-xl border border-border/50 overflow-hidden shadow-lg shadow-black/5 mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 backdrop-blur-sm border border-accent/20 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Why do we need this?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your Sleeper username helps us connect your account to your fantasy leagues and load your team data.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div className="relative bg-card/40 backdrop-blur-xl rounded-xl border border-border/50 overflow-hidden shadow-lg shadow-black/5">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 backdrop-blur-sm border border-accent/20 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-accent" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Sleeper username"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
                autoFocus
                disabled={loading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading || !username.trim()}
            whileHover={{ scale: loading || !username.trim() ? 1 : 1.02 }}
            whileTap={{ scale: loading || !username.trim() ? 1 : 0.98 }}
            className={`relative w-full py-4 rounded-xl font-semibold text-base transition-all overflow-hidden ${
              loading || !username.trim()
                ? "bg-secondary/30 text-muted-foreground cursor-not-allowed"
                : "bg-accent hover:bg-accent/90 text-accent-foreground"
            }`}
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
                <ArrowRight className="w-5 h-5" />
              )}
              <span>{loading ? "Linking..." : "Continue"}</span>
            </div>
          </motion.button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          Sleeper 3.0 - Version 3.0.0
        </div>
      </motion.div>
    </div>
  );
}
