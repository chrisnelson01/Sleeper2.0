import { useState } from "react";
import { Trophy } from "lucide-react";

interface UsernameGateProps {
  onSubmit: (username: string) => void;
  error?: string | null;
}

export function UsernameGate({ onSubmit, error }: UsernameGateProps) {
  const [value, setValue] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-[430px] bg-card rounded-2xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">Enter your Sleeper username</p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Sleeper username"
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
          />
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
          <button
            onClick={() => onSubmit(value.trim())}
            className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-semibold transition-colors hover:bg-accent/80"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
