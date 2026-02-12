import { useState } from "react";
import { motion } from "motion/react";
import { Mail, RefreshCw, Check } from "lucide-react";
interface EmailVerificationProps {
  email: string;
  onResendVerification: () => Promise<void>;
  onContinue: () => void;
}

export function EmailVerification({ email, onResendVerification, onContinue }: EmailVerificationProps) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await onResendVerification();
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch (error) {
      console.error("Failed to resend verification:", error);
    } finally {
      setResending(false);
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
            <Mail className="w-10 h-10 text-accent" />
          </motion.div>
          <h1 className="text-3xl font-bold mb-2">Check Your Email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a verification link to
          </p>
          <p className="text-sm font-semibold text-accent mt-1">{email}</p>
        </div>

        {/* Verification Card */}
        <div className="relative bg-card/40 backdrop-blur-xl rounded-xl border border-border/50 overflow-hidden shadow-lg shadow-black/5 mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 backdrop-blur-sm border border-accent/20 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Verify Your Account</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Click the verification link in your email to activate your account. You may need to check your spam folder.
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-2 text-sm text-muted-foreground ml-13">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>Open the email we sent you</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>Click the verification link</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>Return here and click Continue</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resend Button */}
        <motion.button
          type="button"
          onClick={handleResend}
          disabled={resending || resent}
          whileHover={{ scale: resending || resent ? 1 : 1.02 }}
          whileTap={{ scale: resending || resent ? 1 : 0.98 }}
          className={`relative w-full mb-3 py-4 rounded-xl font-semibold text-base transition-all overflow-hidden ${
            resent
              ? "bg-accent/20 text-accent border-2 border-accent/30"
              : "bg-card/40 backdrop-blur-xl hover:bg-card/60 text-foreground border border-border/50"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-center gap-2">
            {resending ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw className="w-5 h-5" />
              </motion.div>
            ) : resent ? (
              <Check className="w-5 h-5" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            <span>
              {resending ? "Sending..." : resent ? "Email Sent!" : "Resend Verification Email"}
            </span>
          </div>
        </motion.button>

        {/* Continue Button */}
        <motion.button
          type="button"
          onClick={onContinue}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative w-full py-4 rounded-xl font-semibold text-base transition-all overflow-hidden bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            <span>I've Verified My Email</span>
          </div>
        </motion.button>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          Sleeper 3.0 - Version 3.0.0
        </div>
      </motion.div>
    </div>
  );
}
