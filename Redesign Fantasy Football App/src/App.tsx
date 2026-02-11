import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const { isLoading, userId, leagues, selectedLeagueId, setUsername, selectLeague, logout, error } = useAppContext();

  useEffect(() => {
    if (!bannerMessage) return;
    const timer = setTimeout(() => setBannerMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [bannerMessage]);

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
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {bannerMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                style={{ position: "fixed", left: 0, right: 0, top: 96, zIndex: 60 }}
              >
                <div className="max-w-[430px] mx-auto px-5">
                  <div className="relative w-full bg-emerald-500/10 backdrop-blur-sm rounded-xl p-4 border border-emerald-500/30 text-left overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                    <div className="relative flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <Check className="w-4 h-4 text-emerald-300" />
                      </div>
                      <div className="font-semibold text-emerald-100">{bannerMessage}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
      <div className="max-w-[430px] mx-auto pt-24">
        {activeTab === "my-team" && (
          <MyTeam onActionSaved={(message) => setBannerMessage(message)} />
        )}
        {activeTab === "all-teams" && <AllTeams />}
        {activeTab === "cap-outlook" && <CapOutlook />}
        {activeTab === "contracts" && <Contracts />}
        {activeTab === "activity" && <LeagueActivity />}
        {activeTab === "settings" && (
          <Settings onCommissionerSaved={() => setBannerMessage("Changes Saved")} />
        )}
      </div>
    </div>
  );
}
