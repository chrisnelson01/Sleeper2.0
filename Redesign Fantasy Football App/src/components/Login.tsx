import { useState } from "react";
import { motion } from "motion/react";
import { LogIn, User } from "lucide-react";
import footballImg from "../assets/d67f0282907cd80b21bf6f1a8efcd581573a39b7.png";

interface LoginProps {
  onLogin: (username: string) => void;
  error?: string | null;
}

export function Login({ onLogin, error }: LoginProps) {
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username.trim());
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
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(70%) sepia(48%) saturate(2476%) hue-rotate(86deg) brightness(98%) contrast(119%)",
              }}
            />
          </motion.div>
          <h1 className="text-3xl font-bold mb-2">Sleeper 3.0</h1>
          <p className="text-sm text-muted-foreground">
            Enter your league credentials
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Enter username"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive text-center">{error}</div>
          )}

          <motion.button
            type="submit"
            disabled={!username.trim()}
            whileHover={{ scale: username.trim() ? 1.02 : 1 }}
            whileTap={{ scale: username.trim() ? 0.98 : 1 }}
            className={`relative w-full py-4 rounded-xl font-semibold text-base transition-all overflow-hidden ${
              username.trim()
                ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                : "bg-secondary/30 text-muted-foreground cursor-not-allowed"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="relative flex items-center justify-center gap-2">
              <LogIn className="w-5 h-5" />
              <span>Enter League</span>
            </div>
          </motion.button>
        </form>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          Sleeper 3.0 - Version 3.0.0
        </div>
      </motion.div>
    </div>
  );
}
