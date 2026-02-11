import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type League = {
  league_id: string;
  name: string;
};

type RosterPlayer = {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string;
  amount: number;
  contract_years: number;
  nfl_team?: string | null;
};

type TeamInfo = {
  owner_id: string;
  display_name: string;
  avatar?: string | null;
  is_owner: boolean;
  players: RosterPlayer[];
  total_amount: number;
};

type LeagueInfo = {
  league_id?: number | string;
  is_auction?: boolean | number;
  is_keeper?: boolean | number;
  money_per_team?: number;
  rfa_length?: number;
  extension_length?: number;
  amnesty_allowed?: number;
  rfa_allowed?: number;
  extension_allowed?: number;
  keepers_allowed?: number;
  taxi_length?: number;
  rollover_every?: number;
  creation_date?: string;
};

type AppContextValue = {
  username: string;
  userId: string;
  leagues: League[];
  selectedLeagueId: string;
  rostersData: TeamInfo[];
  leagueInfo: LeagueInfo | null;
  currentSeason: number | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  setUsername: (username: string) => Promise<void>;
  selectLeague: (leagueId: string) => Promise<void>;
  logout: () => void;
  updateLeague: (updates: Record<string, any>) => Promise<void>;
  refreshLeagueData: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [username, setUsernameState] = useState("");
  const [userId, setUserId] = useState("");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState("");
  const [rostersData, setRostersData] = useState<TeamInfo[]>([]);
  const [leagueInfo, setLeagueInfo] = useState<LeagueInfo | null>(null);
  const [currentSeason, setCurrentSeason] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeagues = useCallback(async (uid: string) => {
    const leaguesData = await api.getUserLeagues(uid);
    setLeagues(Array.isArray(leaguesData) ? leaguesData : []);
  }, []);

  const fetchRosters = useCallback(async (leagueId: string, uid: string) => {
    const response = await api.getRostersData(leagueId, uid);
    setRostersData(response?.team_info || []);
    setLeagueInfo(response?.league_info || null);
    setCurrentSeason(response?.current_season || null);
  }, []);

  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cachedUsername = localStorage.getItem("username") || "";
      const cachedUserId = localStorage.getItem("userId") || "";
      const cachedLeagueId = localStorage.getItem("selectedLeagueId") || "";

      if (cachedUsername) setUsernameState(cachedUsername);
      if (cachedUserId) setUserId(cachedUserId);
      if (cachedLeagueId) setSelectedLeagueId(cachedLeagueId);

      let resolvedUserId = cachedUserId;
      if (!resolvedUserId && cachedUsername) {
        const userData = await api.getUserId(cachedUsername);
        resolvedUserId = userData?.user_id || "";
        if (resolvedUserId) {
          setUserId(resolvedUserId);
          localStorage.setItem("userId", resolvedUserId);
        }
      }

      if (resolvedUserId) {
        await fetchLeagues(resolvedUserId);
      }

      if (cachedLeagueId && resolvedUserId) {
        await fetchRosters(cachedLeagueId, resolvedUserId);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to initialize");
    } finally {
      setIsLoading(false);
    }
  }, [fetchLeagues, fetchRosters]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const setUsername = useCallback(
    async (value: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const userData = await api.getUserId(value);
        const uid = userData?.user_id || "";
        setUsernameState(value);
        setUserId(uid);
        localStorage.setItem("username", value);
        localStorage.setItem("userId", uid);
        await fetchLeagues(uid);
      } catch (err: any) {
        setError(err?.message || "Failed to find user");
      } finally {
        setIsLoading(false);
      }
    },
    [fetchLeagues]
  );

  const selectLeague = useCallback(
    async (leagueId: string) => {
      if (!userId) return;
      setIsLoading(true);
      setError(null);
      try {
        setSelectedLeagueId(leagueId);
        localStorage.setItem("selectedLeagueId", leagueId);
        await fetchRosters(leagueId, userId);
      } catch (err: any) {
        setError(err?.message || "Failed to load league");
      } finally {
        setIsLoading(false);
      }
    },
    [fetchRosters, userId]
  );

  const logout = useCallback(() => {
    setUsernameState("");
    setUserId("");
    setLeagues([]);
    setSelectedLeagueId("");
    setRostersData([]);
    setLeagueInfo(null);
    setCurrentSeason(null);
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    localStorage.removeItem("selectedLeagueId");
  }, []);

  const value = useMemo(
    () => ({
      username,
      userId,
      leagues,
      selectedLeagueId,
      rostersData,
      leagueInfo,
      currentSeason,
      isLoading,
      error,
      setUsername,
      selectLeague,
      logout,
      refreshLeagueData: async () => {
        if (!selectedLeagueId || !userId) return;
        setIsRefreshing(true);
        setError(null);
        try {
          await fetchRosters(selectedLeagueId, userId);
        } catch (err: any) {
          setError(err?.message || "Failed to refresh league");
        } finally {
          setIsRefreshing(false);
        }
      },
      updateLeague: async (updates: Record<string, any>) => {
        if (!selectedLeagueId) return;
        setIsRefreshing(true);
        setError(null);
        try {
          const updated = await api.updateLeagueInfo(selectedLeagueId, updates);
          setLeagueInfo(updated || null);
        } catch (err: any) {
          setError(err?.message || "Failed to update league");
        } finally {
          setIsRefreshing(false);
        }
      },
    }),
    [
      username,
      userId,
      leagues,
      selectedLeagueId,
      rostersData,
      leagueInfo,
      currentSeason,
      isLoading,
      isRefreshing,
      error,
      setUsername,
      selectLeague,
      logout,
      fetchRosters,
      selectedLeagueId,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
};
