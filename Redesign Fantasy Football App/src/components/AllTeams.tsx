import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Users, Truck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "./ui/badge";
import { useAppContext } from "../context/AppContext";

interface Player {
  id: string;
  name: string;
  position: string;
  salary: number;
  isTaxi?: boolean;
}

interface Team {
  id: string;
  name: string;
  owner: string;
  emoji: string;
  avatarUrl?: string | null;
  totalCap: number;
  capRemaining: number;
  rosterSize: number;
  roster: Player[];
  rfaLeft: number;
  amnestyLeft: number;
  contracts: number;
  extensions: number;
}

export function AllTeams() {
  const { rostersData, leagueInfo, userId } = useAppContext();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const capLimit = Number(leagueInfo?.money_per_team || 260);

  const teams: Team[] = useMemo(() => {
    return (rostersData || []).map((team) => {
      const roster = (team.players || []).map((player) => ({
        id: String(player.player_id),
        name: `${player.first_name} ${player.last_name}`,
        position: player.position,
        salary: Number(player.amount || 0),
        isTaxi: Boolean((player as { is_taxi?: boolean }).is_taxi),
      }));
      const totalCap = Number(team.total_amount || 0);
      return {
        id: String(team.owner_id),
        name: team.display_name,
        owner: String(team.owner_id) === String(userId) ? "You" : team.display_name,
        emoji: "FB",
        avatarUrl: team.avatar
          ? `https://sleepercdn.com/avatars/${team.avatar}`
          : null,
        totalCap,
        capRemaining: capLimit - totalCap,
        rosterSize: roster.length,
        roster,
        rfaLeft: Number(team.rfa_left ?? 0),
        amnestyLeft: Number(team.amnesty_left ?? 0),
        contracts: Number(team.contracts ?? 0),
        extensions: Number(team.extension_left ?? 0),
      };
    });
  }, [capLimit, rostersData, userId]);

  const sortedTeams = [...teams].sort((a, b) => b.totalCap - a.totalCap);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-3xl font-bold">All Teams</h1>
        <p className="text-sm text-muted-foreground mt-1">
          League standings & cap info
        </p>
      </div>

      {/* Teams List */}
      <div className="px-5 pb-6 space-y-3">
        {sortedTeams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            isExpanded={expandedTeam === team.id}
            capLimit={capLimit}
            onToggle={() =>
              setExpandedTeam(expandedTeam === team.id ? null : team.id)
            }
          />
        ))}
      </div>
    </div>
  );
}

interface TeamCardProps {
  team: Team;
  isExpanded: boolean;
  capLimit: number;
  onToggle: () => void;
}

function TeamCard({ team, isExpanded, capLimit, onToggle }: TeamCardProps) {
  const capUsedPercent = (team.totalCap / capLimit) * 100;
  const isOverCap = team.capRemaining <= 0;
  const isWarning = capUsedPercent >= 88 && capUsedPercent < 100;
  const remainingColor = isOverCap
    ? "rgb(239, 68, 68)"
    : isWarning
    ? "rgb(253, 224, 71)"
    : "rgb(16, 185, 129)";
  const progressColor = isOverCap
    ? "rgb(239, 68, 68)"
    : isWarning
    ? "rgb(250, 204, 21)"
    : "rgb(16, 185, 129)";

  const sortedRoster = [...team.roster].sort((a, b) => {
    const positionOrder = ["QB", "RB", "WR", "TE"];
    const aIndex = positionOrder.indexOf(a.position);
    const bIndex = positionOrder.indexOf(b.position);
    if (aIndex !== bIndex) {
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="relative bg-card/40 backdrop-blur-xl rounded-xl border border-border/50 overflow-hidden shadow-lg shadow-black/5">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <button
        onClick={onToggle}
        className="relative w-full p-4 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          {/* Team Avatar */}
          <div
            className="rounded-full bg-secondary/50 flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ width: 48, height: 48, minWidth: 48, minHeight: 48 }}
            aria-label={team.name}
          >
            {team.avatarUrl ? (
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `url(${team.avatarUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            ) : (
              <span className="text-base font-bold text-muted-foreground">
                {team.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </span>
            )}
          </div>

          {/* Team Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-bold text-foreground truncate">
                {team.name}
              </h4>
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{team.owner}</p>
          </div>

          {/* Cap Amount */}
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-muted-foreground">Cap Used</div>
            <div className="text-base font-bold text-foreground">
              ${team.totalCap.toLocaleString()}
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-border space-y-3">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Cap Usage</span>
                  <span className={`font-semibold ${isOverCap ? "text-destructive" : "text-foreground"}`}>
                    {capUsedPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.min(capUsedPercent, 100)}%`,
                      backgroundColor: progressColor,
                    }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    Cap Remaining
                  </div>
                  <div
                    className="text-base font-bold"
                    style={{ color: remainingColor }}
                  >
                    {isOverCap ? "-" : ""}$
                    {Math.abs(team.capRemaining).toLocaleString()}
                  </div>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    Roster Size
                  </div>
                  <div className="text-base font-bold text-foreground">
                    {team.rosterSize} players
                  </div>
                </div>
              </div>

              {/* Team Resources */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-secondary/30 rounded-lg p-2.5 text-left">
                    <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider whitespace-nowrap truncate text-left">
                      RFA
                    </div>
                    <div className="text-lg font-bold text-foreground text-left">
                      {team.rfaLeft}
                    </div>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2.5 text-left">
                    <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider whitespace-nowrap truncate text-left">
                      Amnesty
                    </div>
                    <div className="text-lg font-bold text-foreground text-left">
                      {team.amnestyLeft}
                    </div>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2.5 text-left">
                    <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider whitespace-nowrap truncate text-left">
                      Contracts
                    </div>
                    <div className="text-lg font-bold text-foreground text-left">
                      {team.contracts}
                    </div>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2.5 text-left">
                    <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider whitespace-nowrap truncate text-left">
                      Extensions
                    </div>
                    <div className="text-lg font-bold text-foreground text-left">
                      {team.extensions}
                    </div>
                  </div>
                </div>

              {/* Roster */}
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-accent" />
                  <h5 className="text-sm font-semibold text-foreground">
                    Team Roster
                  </h5>
                  <span className="text-xs text-muted-foreground">
                    ({team.rosterSize})
                  </span>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {sortedRoster.map((player) => (
                    <RosterPlayerCard key={player.id} player={player} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface RosterPlayerCardProps {
  player: Player;
}

function RosterPlayerCard({ player }: RosterPlayerCardProps) {
  const positionColors: Record<string, string> = {
    QB: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    RB: "bg-green-500/20 text-green-400 border-green-500/30",
    WR: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    TE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    LB: "bg-red-500/20 text-red-400 border-red-500/30",
    DE: "bg-red-500/20 text-red-400 border-red-500/30",
    DT: "bg-red-500/20 text-red-400 border-red-500/30",
    CB: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    S: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    OL: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Badge
          className={`${
            positionColors[player.position] || "bg-secondary text-muted-foreground"
          } border px-1.5 py-0 text-[10px] font-bold flex-shrink-0`}
        >
          {player.position}
        </Badge>
        <span className="text-sm text-foreground truncate font-medium">
          {player.name}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
        {player.isTaxi && (
          <Truck size={11} strokeWidth={1.8} className="text-yellow-400" />
        )}
        <span className="text-sm font-bold text-accent">
          ${player.salary.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
