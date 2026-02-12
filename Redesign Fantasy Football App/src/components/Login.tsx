import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogIn, Mail, Lock, AlertCircle } from "lucide-react";
import footballImg from "../assets/d67f0282907cd80b21bf6f1a8efcd581573a39b7.png";

interface LoginProps {
  onEmailAuth: (email: string, password: string, isSignUp: boolean) => Promise<void>;
  onGoogleAuth: () => Promise<void>;
}

export function Login({ onEmailAuth, onGoogleAuth }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await onEmailAuth(email.trim(), password, isSignUp);
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      await onGoogleAuth();
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
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
          <h1 className="text-3xl font-bold mb-2">Sleeper 3.0</h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Create your account" : "Welcome back"}
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

        {/* Google SSO Button */}
        <motion.button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          className="relative w-full mb-4 bg-card/40 backdrop-blur-xl rounded-xl border border-border/50 overflow-hidden shadow-lg shadow-black/5 hover:bg-card/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-center gap-3 p-4">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-semibold text-foreground text-base">
              {isSignUp ? "Sign up with Google" : "Sign in with Google"}
            </span>
          </div>
        </motion.button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border/50" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Or</span>
          <div className="flex-1 h-px bg-border/50" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {/* Email Input */}
          <div className="relative bg-card/40 backdrop-blur-xl rounded-xl border border-border/50 overflow-hidden shadow-lg shadow-black/5">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 backdrop-blur-sm border border-accent/20 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-accent" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="relative bg-card/40 backdrop-blur-xl rounded-xl border border-border/50 overflow-hidden shadow-lg shadow-black/5">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 backdrop-blur-sm border border-accent/20 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-accent" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
                disabled={loading}
              />
            </div>
          </div>

          {/* Confirm Password (Sign Up Only) */}
          <AnimatePresence>
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="relative bg-card/40 backdrop-blur-xl rounded-xl border border-border/50 overflow-hidden shadow-lg shadow-black/5">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                  <div className="relative flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 backdrop-blur-sm border border-accent/20 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-5 h-5 text-accent" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
                      disabled={loading}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading || !email.trim() || !password.trim() || (isSignUp && !confirmPassword.trim())}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className={`relative w-full py-4 rounded-xl font-semibold text-base transition-all overflow-hidden ${
              loading || !email.trim() || !password.trim() || (isSignUp && !confirmPassword.trim())
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
                <LogIn className="w-5 h-5" />
              )}
              <span>{loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}</span>
            </div>
          </motion.button>
        </form>

        {/* Toggle Sign Up / Sign In */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setConfirmPassword("");
            }}
            className="text-sm text-muted-foreground hover:text-accent transition-colors"
            disabled={loading}
          >
            {isSignUp ? (
              <>
                Already have an account? <span className="font-semibold text-accent">Sign In</span>
              </>
            ) : (
              <>
                Don't have an account? <span className="font-semibold text-accent">Sign Up</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          Sleeper 3.0 - Version 3.0.0
        </div>
      </motion.div>
    </div>
  );
}
