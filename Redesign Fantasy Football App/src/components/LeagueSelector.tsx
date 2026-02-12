import { useState } from "react";
import { motion } from "motion/react";
import { Trophy, ChevronRight, Check } from "lucide-react";
import footballImg from "../assets/d67f0282907cd80b21bf6f1a8efcd581573a39b7.png";

interface League {
  id: string;
  name: string;
  season: string;
  teams: number;
  emoji: string;
}

interface LeagueSelectorProps {
  leagues: League[];
  onSelectLeague: (leagueId: string) => void;
}

export function LeagueSelector({ leagues, onSelectLeague }: LeagueSelectorProps) {
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = async (leagueId: string) => {
    setSelectedLeague(leagueId);
    setLoading(true);
    // Simulate loading before entering league
    setTimeout(() => {
      onSelectLeague(leagueId);
    }, 1000);
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
          <h1 className="text-3xl font-bold mb-2">Select Your League</h1>
          <p className="text-sm text-muted-foreground">
            Choose a league to manage
          </p>
        </div>

        {/* Leagues List */}
        <div className="space-y-3 mb-4">
          {leagues.map((league) => (
            <motion.button
              key={league.id}
              onClick={() => handleSelect(league.id)}
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02, x: loading ? 0 : 4 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className={`relative w-full bg-card/40 backdrop-blur-xl rounded-xl border overflow-hidden shadow-lg shadow-black/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedLeague === league.id
                  ? "border-accent/50 bg-accent/5"
                  : "border-border/50 hover:bg-card/60"
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              <div className="relative flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-full bg-secondary/50 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">{league.emoji}</span>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-foreground mb-0.5">{league.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {league.season} - {league.teams} Teams
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {loading && selectedLeague === league.id ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full"
                    />
                  ) : selectedLeague === league.id ? (
                    <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
                      <Check className="w-5 h-5 text-accent" />
                    </div>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Empty State */}
        {leagues.length === 0 && (
          <div className="relative bg-card/40 backdrop-blur-xl rounded-xl border border-border/50 overflow-hidden shadow-lg shadow-black/5 p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative text-center">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">No Leagues Found</h3>
              <p className="text-sm text-muted-foreground">
                We couldn't find any leagues associated with your Sleeper account.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          Sleeper 3.0 - Version 3.0.0
        </div>
      </motion.div>
    </div>
  );
}
