import {
  Calendar,
  TrendingUp,
  AlertCircle,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { useMemo, useState } from "react";
import { PlayerActionsModal } from "./PlayerActionsModal";
import { useAppContext } from "../context/AppContext";
import { motion, AnimatePresence } from "motion/react";
import { API_BASE_URL } from "../lib/api";

interface Player {
  id: string;
  name: string;
  position: string;
  salary: number;
  years: number;
  capHit: number;
  status: "active" | "injured" | "amnestied";
  imageUrl?: string;
}

type SortOption = "name" | "salary" | "capHit" | "years" | "position";
type FilterOption = "all" | "QB" | "RB" | "WR" | "TE" | "LB" | "DB";

const POSITION_ORDER: Record<string, number> = {
  QB: 0,
  RB: 1,
  WR: 2,
  TE: 3,
};

const comparePositions = (a: string, b: string) => {
  const aRank = POSITION_ORDER[a] ?? 999;
  const bRank = POSITION_ORDER[b] ?? 999;
  if (aRank !== bRank) return aRank - bRank;
  return a.localeCompare(b);
};

export function MyTeam() {
  const { rostersData, leagueInfo, userId } = useAppContext();
  const [filterPosition, setFilterPosition] = useState<FilterOption>("all");
  const [sortBy, setSortBy] = useState<SortOption>("position");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);

  const team = useMemo(
    () => rostersData.find((t) => String(t.owner_id) === String(userId)),
    [rostersData, userId]
  );
  const teamId = team?.roster_id ?? team?.team_id ?? null;
  const capLimit = Number(leagueInfo?.money_per_team || 260);
  const rosterPlayers = team?.players || [];
  const rfaLeft = Number(team?.rfa_left ?? 0);
  const amnestyLeft = Number(team?.amnesty_left ?? 0);
  const extensionLeft = Number(team?.extension_left ?? 0);

  const mappedPlayers: Player[] = rosterPlayers.map((player) => ({
    id: String(player.player_id),
    name: `${player.first_name} ${player.last_name}`,
    position: player.position,
    salary: Number(player.amount || 0),
    years: Number(player.contract_years || 0),
    capHit: Number(player.amount || 0),
    status: "active",
    imageUrl: player.player_id
      ? `${API_BASE_URL}/player-image/${player.player_id}`
      : undefined,
  }));

  const filteredPlayers = mappedPlayers.filter((player) => {
    if (filterPosition === "all") return true;
    return player.position === filterPosition;
  });

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "salary":
        comparison = a.salary - b.salary;
        break;
      case "capHit":
        comparison = a.capHit - b.capHit;
        break;
      case "years":
        comparison = a.years - b.years;
        break;
      case "position":
        comparison = comparePositions(a.position, b.position);
        break;
      default:
        comparison = 0;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleSortChange = (newSort: SortOption) => {
    if (sortBy === newSort) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSort);
      setSortDirection(newSort === "position" ? "asc" : "desc");
    }
  };

  const totalCap = mappedPlayers.reduce((sum, p) => sum + p.capHit, 0);
  const capRemaining = capLimit - totalCap;
  const capUsedPercent = (totalCap / capLimit) * 100;
  const isOverCap = capRemaining <= 0;
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
  const teamAvatarUrl = team?.avatar
    ? `https://sleepercdn.com/avatars/${team.avatar}`
    : null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Team</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {team?.display_name || "Your Team"}
            </p>
          </div>
          <div
            className="rounded-full bg-accent/10 backdrop-blur-xl border border-accent/20 flex items-center justify-center overflow-hidden"
            style={{ width: 48, height: 48, minWidth: 48, minHeight: 48 }}
            aria-label={team?.display_name || "Team avatar"}
          >
            {teamAvatarUrl ? (
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `url(${teamAvatarUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            ) : (
              <span className="text-2xl font-bold">FB</span>
            )}
          </div>
        </div>

        {/* Cap Summary Card */}
        <div className="relative bg-card/40 backdrop-blur-2xl rounded-2xl p-4 border border-border/50 shadow-xl shadow-black/10 space-y-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cap Space</span>
              <span className="text-sm font-semibold" style={{ color: remainingColor }}>
                {capRemaining < 0 ? "-" : ""}$
                {Math.abs(capRemaining).toLocaleString()}
              </span>
            </div>

            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total Cap Used</span>
                <span className="text-foreground font-semibold">
                  ${totalCap.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-secondary/30 backdrop-blur-sm rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(capUsedPercent, 100)}%`,
                    backgroundColor: progressColor,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {capUsedPercent.toFixed(1)}% used
                </span>
                <span className="text-muted-foreground">
                  Limit: ${capLimit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="px-5 pb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full relative bg-card/40 backdrop-blur-xl rounded-xl p-3 border border-border/50 hover:border-accent/50 transition-all overflow-hidden group mb-3"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                Filter & Sort
              </span>
            </div>
            <motion.div
              animate={{ rotate: showFilters ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {showFilters ? (
                <X className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              )}
            </motion.div>
          </div>
        </button>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-3"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Filter by Position
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {(
                    ["all", "QB", "RB", "WR", "TE", "LB", "DB"] as FilterOption[]
                  ).map((position) => (
                    <button
                      key={position}
                      onClick={() => setFilterPosition(position)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        filterPosition === position
                          ? "bg-accent text-accent-foreground"
                          : "bg-card/40 backdrop-blur-sm text-muted-foreground hover:text-foreground border border-border/50"
                      }`}
                    >
                      {position === "all" ? "All" : position}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Sort by
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[
                    { value: "salary" as SortOption, label: "Salary" },
                    { value: "capHit" as SortOption, label: "Cap Hit" },
                    { value: "years" as SortOption, label: "Years" },
                    { value: "name" as SortOption, label: "Name" },
                    { value: "position" as SortOption, label: "Position" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                        sortBy === option.value
                          ? "bg-accent text-accent-foreground"
                          : "bg-card/40 backdrop-blur-sm text-muted-foreground hover:text-foreground border border-border/50"
                      }`}
                    >
                      {option.label}
                      {sortBy === option.value && (
                        <span className="text-[10px]">
                          {sortDirection === "asc" ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Roster */}
      <div className="px-5 pb-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Roster ({sortedPlayers.length})
          </h3>
        </div>

        <div className="space-y-3">
            {sortedPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                rfaLeft={rfaLeft}
                amnestyLeft={amnestyLeft}
                teamId={teamId}
                extensionLeft={extensionLeft}
              />
            ))}
          </div>
      </div>
    </div>
  );
}

function PlayerCard({
  player,
  rfaLeft,
  amnestyLeft,
  teamId,
  extensionLeft,
}: {
  player: Player;
  rfaLeft: number;
  amnestyLeft: number;
  teamId: string | number | null;
  extensionLeft: number;
}) {
  const [showActions, setShowActions] = useState(false);
  const yearsDisplay = player.years > 0 ? player.years : "N/A";

  const positionColors: Record<string, string> = {
    QB: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    RB: "bg-green-500/20 text-green-400 border-green-500/30",
    WR: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    TE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    LB: "bg-red-500/20 text-red-400 border-red-500/30",
    DB: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  };

  const initials = player.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <>
      <button
        onClick={() => setShowActions(true)}
        className="relative w-full bg-card/40 backdrop-blur-xl rounded-xl p-4 border border-border/50 hover:border-accent/50 transition-all text-left overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className="relative z-10 flex gap-3">
          {/* Player Avatar */}
          <div
            className="rounded-full bg-secondary/50 backdrop-blur-sm border border-border/30 flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ width: 56, height: 56, minWidth: 56, minHeight: 56 }}
            aria-label={player.name}
          >
            {player.imageUrl ? (
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `url(${player.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            ) : (
              <span className="text-xl font-bold text-muted-foreground">
                {initials}
              </span>
            )}
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground truncate">
                  {player.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    className={`${
                      positionColors[player.position] || "bg-secondary text-muted-foreground"
                    } border px-2 py-0 text-[10px] font-bold backdrop-blur-sm`}
                  >
                    {player.position}
                  </Badge>
                  {player.status === "injured" && (
                    <span className="flex items-center gap-1 text-[10px] text-destructive">
                      <AlertCircle className="w-3 h-3" />
                      Injured
                    </span>
                  )}
                </div>
              </div>

              {/* Salary */}
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-muted-foreground">Salary</div>
                <div className="text-lg font-bold text-foreground">
                  ${player.salary.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-secondary/30 backdrop-blur-sm flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">
                    Years Left
                  </div>
                  <div className="text-sm font-bold">{yearsDisplay}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-secondary/30 backdrop-blur-sm flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Cap Hit</div>
                  <div className="text-sm font-bold">
                    ${player.capHit.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>

      <PlayerActionsModal
        player={player}
        isOpen={showActions}
        onClose={() => setShowActions(false)}
        rfaLeft={rfaLeft}
        amnestyLeft={amnestyLeft}
        teamId={teamId}
        extensionLeft={extensionLeft}
      />
    </>
  );
}
