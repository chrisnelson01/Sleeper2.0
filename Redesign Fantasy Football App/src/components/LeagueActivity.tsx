import { useEffect, useMemo, useState } from "react";
import {
  UserPlus,
  Repeat,
  DollarSign,
  AlertCircle,
  Trophy,
  TrendingUp,
  FileText,
  Ban,
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { api } from "../lib/api";

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  team?: string;
  timestamp: string;
  icon: typeof UserPlus;
  iconColor: string;
  iconBg: string;
}

const PAGE_SIZE = 20;

export function LeagueActivity() {
  const { selectedLeagueId, rostersData } = useAppContext();
  const [items, setItems] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const teamMap = useMemo(() => {
    const map: Record<string, string> = {};
    (rostersData || []).forEach((team) => {
      map[String(team.owner_id)] = team.display_name;
    });
    return map;
  }, [rostersData]);

  const loadMore = async () => {
    if (!selectedLeagueId || loading || !hasMore) return;
    setLoading(true);
    try {
      const data = await api.getLeagueActivity(selectedLeagueId, offset, PAGE_SIZE);
      const nextItems = data?.items || [];
      setItems((prev) => [...prev, ...nextItems]);
      setOffset((prev) => prev + nextItems.length);
      setHasMore(nextItems.length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
  }, [selectedLeagueId]);

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeagueId]);

  const activities: Activity[] = useMemo(() => {
    return items.map((item, idx) => {
      const timestamp = formatRelativeTime(item.created || item.status_updated);
      const teamName =
        item.team_name ||
        (item.team_id ? teamMap[String(item.team_id)] : undefined);

      if (item.source === "local") {
        const base = {
          id: `${item.type}-${item.player_id}-${idx}`,
          type: item.type,
          title: item.label || "League update",
          description: item.label || "League update",
          team: teamName,
          timestamp,
        };
        if (item.type === "contract") {
          return {
            ...base,
            icon: FileText,
            iconColor: "text-accent",
            iconBg: "bg-accent/20",
          };
        }
        if (item.type === "amnesty") {
          return {
            ...base,
            icon: Ban,
            iconColor: "text-orange-400",
            iconBg: "bg-orange-500/20",
          };
        }
        if (item.type === "rfa") {
          return {
            ...base,
            icon: UserPlus,
            iconColor: "text-blue-400",
            iconBg: "bg-blue-500/20",
          };
        }
        if (item.type === "extension") {
          return {
            ...base,
            icon: TrendingUp,
            iconColor: "text-purple-400",
            iconBg: "bg-purple-500/20",
          };
        }
        return {
          ...base,
          icon: UserPlus,
          iconColor: "text-accent",
          iconBg: "bg-accent/20",
        };
      }

      const type = item.type || "transaction";
      const title = formatTransactionTitle(item, teamMap);
      const description = formatTransactionDescription(item);
      const iconPack = getTransactionIcon(type);

      return {
        id: `${item.transaction_id || type}-${idx}`,
        type,
        title,
        description,
        team: teamName,
        timestamp,
        ...iconPack,
      };
    });
  }, [items, teamMap]);

  const stats = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const normalize = (ts?: number) => {
      if (!ts) return 0;
      if (ts > 1e12) return ts;
      if (ts > 1e10) return ts;
      return ts * 1000;
    };

    let today = 0;
    let week = 0;
    let month = 0;

    items.forEach((item) => {
      const ts = normalize(item.created || item.status_updated);
      if (!ts) return;
      if (ts >= startOfMonth.getTime()) month += 1;
      if (ts >= startOfWeek.getTime()) week += 1;
      if (ts >= startOfToday.getTime()) today += 1;
    });

    return { today, week, month, now };
  }, [items]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-3xl font-bold">League Activity</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recent transactions and updates
        </p>
      </div>

      {/* Activity Stats */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Today</div>
            <div className="text-lg font-bold">{stats.today}</div>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">This Week</div>
            <div className="text-lg font-bold">{stats.week}</div>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">This Month</div>
            <div className="text-lg font-bold">{stats.month}</div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-5 pb-6">
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-[21px] top-8 bottom-0 w-[2px] bg-border" />

          {/* Activity Items */}
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                isLast={index === activities.length - 1}
              />
            ))}
          </div>
        </div>
        {hasMore && (
          <div className="pt-4">
            <button
              onClick={loadMore}
              className="w-full bg-card hover:bg-secondary/50 rounded-xl p-4 border border-border text-center transition-colors"
            >
              {loading ? "Loading..." : "Load more activity"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ActivityItemProps {
  activity: Activity;
  isLast: boolean;
}

function ActivityItem({ activity, isLast }: ActivityItemProps) {
  const Icon = activity.icon;

  return (
    <div className="relative flex gap-4">
      {/* Icon */}
      <div
        className={`flex-shrink-0 w-11 h-11 rounded-xl ${activity.iconBg} flex items-center justify-center z-10 border-2 border-background`}
      >
        <Icon className={`w-5 h-5 ${activity.iconColor}`} />
      </div>

      {/* Content Card */}
      <div className="flex-1 bg-card rounded-xl p-4 border border-border hover:border-accent/50 transition-all">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-bold text-foreground">{activity.title}</h4>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {activity.timestamp}
          </span>
        </div>

        <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
          {activity.description}
        </p>

        {activity.team && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-xs font-semibold text-foreground">
              {activity.team}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const formatRelativeTime = (timestamp?: number) => {
  if (!timestamp) return "";
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatTransactionTitle = (item: any, teamMap: Record<string, string>) => {
  if (item.type === "trade") return "Trade Completed";
  if (item.type === "commissioner") return "Commissioner Update";
  if (item.type === "waiver" || item.type === "free_agent") return "Roster Move";
  if (item.type === "draft") return "Draft Pick Added";
  const teamName = item.team_id ? teamMap[String(item.team_id)] : null;
  return teamName ? `${teamName} Update` : "League Update";
};

const formatTransactionDescription = (item: any) => {
  const addsDetail = Array.isArray(item.adds_detail) ? item.adds_detail : [];
  const dropsDetail = Array.isArray(item.drops_detail) ? item.drops_detail : [];

  const formatNames = (players: any[]) => {
    const names = players.map((p) => p?.name).filter(Boolean);
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
  };

  if (addsDetail.length || dropsDetail.length) {
    const addText = addsDetail.length
      ? `Added ${formatNames(addsDetail)}`
      : "";
    const dropText = dropsDetail.length
      ? `Dropped ${formatNames(dropsDetail)}`
      : "";
    return [addText, dropText].filter(Boolean).join(" - ");
  }

  const adds = item.adds ? Object.keys(item.adds) : [];
  const drops = item.drops ? Object.keys(item.drops) : [];
  if (adds.length || drops.length) {
    const addText = adds.length
      ? `Added ${adds.length} player${adds.length > 1 ? "s" : ""}`
      : "";
    const dropText = drops.length
      ? `Dropped ${drops.length} player${drops.length > 1 ? "s" : ""}`
      : "";
    return [addText, dropText].filter(Boolean).join(" - ");
  }

  return item.metadata?.notes || "League transaction";
};

const getTransactionIcon = (type: string) => {
  switch (type) {
    case "trade":
      return { icon: Repeat, iconColor: "text-blue-400", iconBg: "bg-blue-500/20" };
    case "waiver":
    case "free_agent":
      return { icon: UserPlus, iconColor: "text-accent", iconBg: "bg-accent/20" };
    case "contract":
      return { icon: FileText, iconColor: "text-accent", iconBg: "bg-accent/20" };
    case "amnesty":
      return { icon: Ban, iconColor: "text-orange-400", iconBg: "bg-orange-500/20" };
    case "rfa":
      return { icon: UserPlus, iconColor: "text-blue-400", iconBg: "bg-blue-500/20" };
    case "extension":
      return { icon: TrendingUp, iconColor: "text-purple-400", iconBg: "bg-purple-500/20" };
    case "commissioner":
      return { icon: Trophy, iconColor: "text-yellow-400", iconBg: "bg-yellow-500/20" };
    default:
      return { icon: TrendingUp, iconColor: "text-purple-400", iconBg: "bg-purple-500/20" };
  }
};
