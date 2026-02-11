import { useState } from "react";
import { LoadingScreen } from "./components/LoadingScreen";
import { TopNav } from "./components/TopNav";
import { MyTeam } from "./components/MyTeam";
import { AllTeams } from "./components/AllTeams";
import { CapOutlook } from "./components/CapOutlook";
import { Contracts } from "./components/Contracts";
import { LeagueActivity } from "./components/LeagueActivity";
import { Settings } from "./components/Settings";
import { useAppContext } from "./context/AppContext";
import { Login } from "./components/Login";
import { LeagueSelect } from "./components/LeagueSelect";

export default function App() {
  const [activeTab, setActiveTab] = useState("my-team");
  const { isLoading, userId, leagues, selectedLeagueId, setUsername, selectLeague, logout, error } = useAppContext();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!userId) {
    return <Login onLogin={setUsername} error={error} />;
  }

  if (!selectedLeagueId) {
    return <LeagueSelect leagues={leagues} onSelect={selectLeague} onLogout={logout} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="max-w-[430px] mx-auto pt-24">
        {activeTab === "my-team" && <MyTeam />}
        {activeTab === "all-teams" && <AllTeams />}
        {activeTab === "cap-outlook" && <CapOutlook />}
        {activeTab === "contracts" && <Contracts />}
        {activeTab === "activity" && <LeagueActivity />}
        {activeTab === "settings" && <Settings />}
      </div>
    </div>
  );
}
