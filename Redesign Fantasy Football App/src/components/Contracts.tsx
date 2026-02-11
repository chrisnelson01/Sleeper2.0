import { useMemo, useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Badge } from "./ui/badge";
import { useAppContext } from "../context/AppContext";
import { api } from "../lib/api";

interface Contract {
  id: string;
  playerName: string;
  team: string;
  position: string;
  years: number;
  extensionYears: number;
  startSeason: number | null;
  endSeason: number | null;
  contractAmount: number;
  isExtended: boolean;
  status: "active" | "expired" | "amnestied" | "rfa";
}

export function Contracts() {
  const { selectedLeagueId, rostersData } = useAppContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "expired" | "amnestied" | "rfa" | "extended"
  >("all");
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    const loadContracts = async () => {
      if (!selectedLeagueId) return;
      const data = await api.getAllContracts(selectedLeagueId);
      const teamsMap: Record<string, string> = {};
      (rostersData || []).forEach((team) => {
        teamsMap[String(team.owner_id)] = team.display_name;
      });
      const mapped = (data || []).map((contract: any) => {
        const baseYears = Number(contract.contract_length || 0);
        const extensionYears = Number(contract.extension_years || 0);
        const years = baseYears + extensionYears;
        const startSeason = contract.contract_start_season ?? contract.season ?? null;
        const endSeason =
          contract.contract_end_season ??
          (startSeason && years ? Number(startSeason) + years - 1 : null);
        const status =
          String(contract.status || "ACTIVE").toLowerCase() as Contract["status"];
        return {
          id: String(contract.id),
          playerName: `${contract.first_name} ${contract.last_name}`,
          team:
            teamsMap[String(contract.team_id)] ||
            contract.team_name ||
            "Unknown",
          position: contract.position || "N/A",
          years,
          status,
          startSeason,
          endSeason,
          contractAmount: Number(contract.contract_amount || 0),
          isExtended: Boolean(contract.is_extended || contract.extension_years),
          extensionYears,
        };
      });
      setContracts(mapped);
    };
    loadContracts();
  }, [rostersData, selectedLeagueId]);

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const matchesSearch =
        contract.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.position.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filterStatus === "all" ||
        contract.status === filterStatus ||
        (filterStatus === "extended" && contract.isExtended);

      return matchesSearch && matchesFilter;
    });
  }, [contracts, filterStatus, searchQuery]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-3xl font-bold">All Contracts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          League-wide player contracts
        </p>
      </div>

      {/* Search and Filter */}
      <div className="px-5 pb-4 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search players, teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(["all", "active", "expired", "amnestied", "rfa", "extended"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                filterStatus === status
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {status === "rfa"
                ? "RFA"
                : status === "extended"
                ? "Extended"
                : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filteredContracts.length} contracts found</span>
          <span>
            Total: $
            {filteredContracts
              .reduce((sum, c) => sum + (c.contractAmount || 0), 0)
              .toLocaleString()}
          </span>
        </div>
      </div>

      {/* Contracts List */}
      <div className="px-5 pb-6 space-y-3">
        {filteredContracts.map((contract) => (
          <ContractCard key={contract.id} contract={contract} />
        ))}
      </div>
    </div>
  );
}

function ContractCard({ contract }: { contract: Contract }) {
  const positionColors: Record<string, string> = {
    QB: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    RB: "bg-green-500/20 text-green-400 border-green-500/30",
    WR: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    TE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    DE: "bg-red-500/20 text-red-400 border-red-500/30",
    DT: "bg-red-500/20 text-red-400 border-red-500/30",
    LB: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const statusColors = {
    active: "bg-accent/20 text-accent border-accent/30",
    expired: "bg-muted/50 text-muted-foreground border-border",
    amnestied: "bg-destructive/20 text-destructive border-destructive/30",
    rfa: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };

  return (
    <div className="bg-card rounded-xl p-4 border border-border hover:border-accent/50 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-foreground mb-1 truncate">
            {contract.playerName}
          </h4>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={`${
                positionColors[contract.position] || "bg-secondary"
              } border px-2 py-0 text-[10px] font-bold`}
            >
              {contract.position}
            </Badge>
            <span className="text-xs text-muted-foreground truncate">
              {contract.team}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          <Badge
            className={`${statusColors[contract.status]} border px-2 py-1 text-[10px] font-bold`}
          >
            {contract.status === "rfa" ? "RFA" : contract.status.toUpperCase()}
          </Badge>
          {contract.isExtended && (
            <Badge className="border px-2 py-1 text-[10px] font-bold bg-green-500/20 text-green-400 border-green-500/30">
              EXTENDED
            </Badge>
          )}
        </div>
      </div>

      {/* Contract Info */}
      <div className="bg-secondary/30 rounded-lg p-3 mb-3">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold text-foreground">
            {contract.startSeason ?? "-"} - {contract.endSeason ?? "-"}
          </span>
          <span className="text-xs text-muted-foreground">
            / {contract.years} years
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Start year: {contract.startSeason ?? "-"}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] text-muted-foreground mb-1">
            Start Season
          </div>
          <div className="text-sm font-bold text-foreground">
            {contract.startSeason ?? "-"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-1">
            End Season
          </div>
          <div className="text-sm font-bold text-foreground">
            {contract.endSeason ?? "-"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-1">
            Salary
          </div>
          <div className="text-sm font-bold text-foreground">
            {contract.contractAmount
              ? `$${contract.contractAmount.toLocaleString()}`
              : "-"}
          </div>
        </div>
      </div>
    </div>
  );
}
