import { Trophy, ChevronRight, LogOut } from "lucide-react";

interface League {
  league_id: string;
  name: string;
}

interface LeagueSelectProps {
  leagues: League[];
  onSelect: (leagueId: string) => void;
  onLogout: () => void;
}

export function LeagueSelect({ leagues, onSelect, onLogout }: LeagueSelectProps) {
  return (
    <div className="min-h-screen px-5 pt-6 pb-6">
      <div className="max-w-[430px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Select League</h1>
            <p className="text-sm text-muted-foreground mt-1">Choose a league to continue</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-xs text-destructive border border-destructive/30 px-3 py-2 rounded-xl hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        <div className="space-y-3">
          {leagues.map((league) => (
            <button
              key={league.league_id}
              onClick={() => onSelect(league.league_id)}
              className="w-full bg-card rounded-xl p-4 border border-border hover:border-accent/50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground truncate">{league.name}</div>
                  <div className="text-xs text-muted-foreground">League ID: {league.league_id}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
