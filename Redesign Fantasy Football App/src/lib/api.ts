export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "/api/v1";
const SLEEPER_API_URL = "https://api.sleeper.app/v1";

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const error = await response.json();
      errorMsg = error.message || errorMsg;
    } catch (e) {
      errorMsg = response.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  if (data?.status && data.status !== "success" && data.status !== "ok") {
    throw new Error(data.message || "API error");
  }
  return data?.data !== undefined ? data.data : data;
};

export const api = {
  getUserId: async (username: string) => {
    const response = await fetch(`${SLEEPER_API_URL}/user/${username}`);
    return handleResponse(response);
  },

  getCurrentNflState: async () => {
    const response = await fetch(`${SLEEPER_API_URL}/state/nfl`);
    return handleResponse(response);
  },

  getUserLeagues: async (userId: string, year?: string | number) => {
    let season = year;
    if (!season) {
      try {
        const state = await api.getCurrentNflState();
        season = state?.league_season || state?.season || new Date().getFullYear();
      } catch (err) {
        season = new Date().getFullYear();
      }
    }
    const response = await fetch(
      `${SLEEPER_API_URL}/user/${userId}/leagues/nfl/${season}`
    );
    const data = await handleResponse(response);
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    const fallbackResponse = await fetch(
      `${SLEEPER_API_URL}/user/${userId}/leagues/nfl`
    );
    const fallbackData = await handleResponse(fallbackResponse);
    return Array.isArray(fallbackData) ? fallbackData : [];
  },

  getRostersData: async (leagueId: string, userId: string) => {
    const response = await fetch(`${API_BASE_URL}/rosters/${leagueId}/${userId}`);
    return handleResponse(response);
  },

  getAllContracts: async (leagueId: string) => {
    const response = await fetch(`${API_BASE_URL}/all-contracts/${leagueId}`);
    return handleResponse(response);
  },

  addContract: async (payload: {
    league_id: string;
    player_id: string;
    contract_length: number;
    contract_amount?: number;
  }) => {
    const response = await fetch(`${API_BASE_URL}/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  addAmnesty: async (payload: {
    league_id: string;
    player_id: string;
    team_id: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/amnesty`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  addRfa: async (payload: {
    league_id: string;
    player_id: string;
    team_id: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/rfa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  addExtension: async (payload: {
    league_id: string;
    player_id: string;
    team_id: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/extension`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  updateLeagueInfo: async (leagueId: string, payload: Record<string, any>) => {
    const response = await fetch(`${API_BASE_URL}/league/${leagueId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  getLeagueActivity: async (leagueId: string, offset = 0, limit = 20) => {
    const response = await fetch(
      `${API_BASE_URL}/activity/${leagueId}?offset=${offset}&limit=${limit}`
    );
    return handleResponse(response);
  },
};
