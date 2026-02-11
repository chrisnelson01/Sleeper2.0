import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useAppContext } from "../context/AppContext";

interface YearData {
  year: string;
  myTeam: number;
  average: number;
  capLimit: number;
}

const YEARS = 5;

export function CapOutlook() {
  const { rostersData, leagueInfo, currentSeason, userId } = useAppContext();
  const [selectedYear, setSelectedYear] = useState(
    String(currentSeason || new Date().getFullYear())
  );

  const capLimit = Number(leagueInfo?.money_per_team || 260);

  const chartData: YearData[] = useMemo(() => {
    const baseYear = currentSeason || new Date().getFullYear();
    const teams = rostersData || [];
    const myTeam = teams.find((t) => String(t.owner_id) === String(userId));

    const computeTeamCap = (team: any, yearOffset: number) => {
      if (!team) return 0;
      return (team.players || []).reduce((sum: number, player: any) => {
        const amount = Number(player.amount || 0);
        const years = Number(player.contract_years || 0);
        if (yearOffset === 0) {
          return sum + amount;
        }
        if (years > yearOffset) {
          return sum + amount;
        }
        return sum;
      }, 0);
    };

    return Array.from({ length: YEARS }).map((_, idx) => {
      const year = baseYear + idx;
      const myTeamCap = computeTeamCap(myTeam, idx);
      const avgCap =
        teams.length > 0
          ? teams.reduce((sum, t) => sum + computeTeamCap(t, idx), 0) /
            teams.length
          : myTeamCap;
      return {
        year: String(year),
        myTeam: Number(myTeamCap),
        average: Number(avgCap),
        capLimit: Number(capLimit),
      };
    });
  }, [capLimit, currentSeason, rostersData, userId]);

  const currentYearData =
    chartData.find((d) => d.year === selectedYear) || chartData[0];
  const spaceRemaining = currentYearData.capLimit - currentYearData.myTeam;
  const percentUsed = (currentYearData.myTeam / currentYearData.capLimit) * 100;
  const vsAverage = currentYearData.myTeam - currentYearData.average;
  const spaceRemainingColor =
    spaceRemaining <= 0
      ? "rgb(239, 68, 68)"
      : percentUsed >= 88
      ? "rgb(253, 224, 71)"
      : "rgb(16, 185, 129)";
  const progressColor =
    spaceRemaining <= 0
      ? "rgb(239, 68, 68)"
      : percentUsed >= 88
      ? "rgb(250, 204, 21)"
      : "rgb(16, 185, 129)";

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-3xl font-bold">Cap Outlook</h1>
        <p className="text-sm text-muted-foreground mt-1">
          5-year salary cap projection
        </p>
      </div>

      {/* Year Selector */}
      <div className="px-5 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {chartData.map((data) => (
            <button
              key={data.year}
              onClick={() => setSelectedYear(data.year)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                selectedYear === data.year
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {data.year}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-5 pb-4 space-y-3">
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                Your Team Cap
              </div>
              <div className="text-3xl font-bold">
                ${currentYearData.myTeam.toLocaleString()}
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-accent" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${Math.min(percentUsed, 100)}%`,
                  backgroundColor: progressColor,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {percentUsed.toFixed(1)}% of cap
              </span>
              <span className="text-muted-foreground">
                Limit: ${currentYearData.capLimit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="text-xs text-muted-foreground mb-1">
              Space Remaining
            </div>
            <div className="text-xl font-bold" style={{ color: spaceRemainingColor }}>
              ${spaceRemaining.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <TrendingUp className="w-3 h-3" />
              Available
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="text-xs text-muted-foreground mb-1">vs League Avg</div>
            <div
              className={`text-xl font-bold ${
                vsAverage < 0 ? "text-accent" : "text-destructive"
              }`}
            >
              {vsAverage > 0 ? "+" : ""}${vsAverage.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {vsAverage < 0 ? (
                <>
                  <TrendingDown className="w-3 h-3" />
                  Below avg
                </>
              ) : (
                <>
                  <TrendingUp className="w-3 h-3" />
                  Above avg
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-5 pb-6">
        <div className="bg-card rounded-2xl p-4 border border-border">
          <h3 className="text-sm font-semibold mb-4">5-Year Projection</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="myTeamGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8e8e93" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8e8e93" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="year"
                stroke="#8e8e93"
                style={{ fontSize: "12px" }}
                tickLine={false}
              />
              <YAxis
                stroke="#8e8e93"
                style={{ fontSize: "12px" }}
                tickLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a22",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#f5f5f7", fontWeight: "600" }}
              />
              <Area
                type="monotone"
                dataKey="average"
                stroke="#8e8e93"
                strokeWidth={2}
                fill="url(#avgGradient)"
                name="League Avg"
              />
              <Area
                type="monotone"
                dataKey="myTeam"
                stroke="#10b981"
                strokeWidth={3}
                fill="url(#myTeamGradient)"
                name="My Team"
              />
              <Line
                type="monotone"
                dataKey="capLimit"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Cap Limit"
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <span className="text-muted-foreground">My Team</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground">League Avg</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-destructive" />
              <span className="text-muted-foreground">Cap Limit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
