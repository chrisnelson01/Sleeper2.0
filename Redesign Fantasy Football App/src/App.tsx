import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { LoadingScreen } from "./components/LoadingScreen";
import { Login } from "./components/Login";
import { EmailVerification } from "./components/EmailVerification";
import { LinkSleeperUsername } from "./components/LinkSleeperUsername";
import { LeagueSelector } from "./components/LeagueSelector";
import { LeagueSetup } from "./components/LeagueSetup";
import { WaitingForSetup } from "./components/WaitingForSetup";
import { TopNav } from "./components/TopNav";
import { MyTeam } from "./components/MyTeam";
import { AllTeams } from "./components/AllTeams";
import { CapOutlook } from "./components/CapOutlook";
import { Contracts } from "./components/Contracts";
import { LeagueActivity } from "./components/LeagueActivity";
import { Settings } from "./components/Settings";
import { useAppContext } from "./context/AppContext";
import { auth, googleProvider } from "./lib/firebase";
import { api } from "./lib/api";

type AuthStep =
  | "login"
  | "email-verification"
  | "link-username"
  | "select-league"
  | "league-setup"
  | "waiting-for-setup"
  | "authenticated";

type UserData = {
  email: string;
  emailVerified: boolean;
  sleeperUsername?: string;
  selectedLeague?: string;
};

export default function App() {
  const [activeTab, setActiveTab] = useState("my-team");
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<AuthStep>("login");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAuthResolving, setIsAuthResolving] = useState(false);
  const {
    isLoading,
    userId,
    leagues,
    selectedLeagueId,
    setUsername,
    selectLeague,
    logout,
    leagueInfo,
    rostersData,
    updateLeague,
    refreshLeagueData,
  } = useAppContext();

  useEffect(() => {
    if (!bannerMessage) return;
    const timer = setTimeout(() => setBannerMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [bannerMessage]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUserData(null);
        setAuthStep("login");
        return;
      }
      setIsAuthResolving(true);
      const nextData = {
        email: user.email || "",
        emailVerified: user.emailVerified,
      };
      setUserData(nextData);

      if (!user.emailVerified) {
        setAuthStep("email-verification");
        setIsAuthResolving(false);
        return;
      }

      const syncLinkedUsername = async () => {
        try {
          const profile = await api.getAuthProfile();
          const linkedUsername = profile?.sleeper_username;
          if (linkedUsername) {
            await setUsername(linkedUsername);
            setAuthStep(selectedLeagueId ? "authenticated" : "select-league");
            setIsAuthResolving(false);
            return;
          }
        } catch (err) {
          // Ignore and fall back to manual link flow
        }

        if (!userId) {
          setAuthStep("link-username");
          setIsAuthResolving(false);
          return;
        }

        setAuthStep(selectedLeagueId ? "authenticated" : "select-league");
        setIsAuthResolving(false);
      };

      void syncLinkedUsername();
    });

    return () => unsubscribe();
  }, [selectedLeagueId, userId, setUsername]);

  const isLeagueCommissioner = useMemo(() => {
    if (!userId) return false;
    const team = rostersData.find((t) => String(t.owner_id) === String(userId));
    return Boolean(team?.is_owner);
  }, [rostersData, userId]);

  const isLeagueConfigured = useMemo(() => {
    if (!leagueInfo) return false;
    // A league is considered configured only when persisted league setup fields exist.
    // Some API responses include commissioner metadata only; that should not unlock the app.
    return Boolean(
      leagueInfo.league_id &&
      Number(leagueInfo.money_per_team || 0) > 0 &&
      leagueInfo.creation_date
    );
  }, [leagueInfo]);

  const commissionerName = useMemo(() => {
    if (leagueInfo?.commissioner) return leagueInfo.commissioner;
    const commissionerTeam = rostersData.find((team) => team.is_owner);
    return commissionerTeam?.display_name || "Commissioner";
  }, [leagueInfo, rostersData]);

  useEffect(() => {
    if (isLoading || !selectedLeagueId || !userId) return;
    if (authStep === "login" || authStep === "email-verification" || authStep === "link-username") {
      return;
    }

    if (!isLeagueConfigured) {
      setAuthStep(isLeagueCommissioner ? "league-setup" : "waiting-for-setup");
      return;
    }

    setAuthStep("authenticated");
    setActiveTab("my-team");
  }, [
    authStep,
    isLoading,
    isLeagueCommissioner,
    isLeagueConfigured,
    selectedLeagueId,
    userId,
  ]);

  const leagueOptions = useMemo(
    () =>
      (leagues || []).map((league: any) => ({
        id: String(league.league_id ?? league.id ?? ""),
        name: league.name || "League",
        season: String(league.season || league.year || league.season_year || "2026"),
        teams: Number(
          league.total_rosters ?? league.roster_count ?? league.teams ?? league.num_teams ?? 0
        ),
        emoji: league?.metadata?.emoji || "🏈",
      })),
    [leagues]
  );
  const selectedLeague = useMemo(
    () => leagueOptions.find((league) => league.id === String(selectedLeagueId)),
    [leagueOptions, selectedLeagueId]
  );

  const handleEmailAuth = async (email: string, _password: string, isSignUp: boolean) => {
    if (isSignUp) {
      const credential = await createUserWithEmailAndPassword(auth, email, _password);
      if (credential.user && !credential.user.emailVerified) {
        await sendEmailVerification(credential.user);
      }
      setUserData({
        email,
        emailVerified: false,
      });
      setAuthStep("email-verification");
      return;
    }

    const credential = await signInWithEmailAndPassword(auth, email, _password);
    if (credential.user && !credential.user.emailVerified) {
      setUserData({
        email,
        emailVerified: false,
      });
      setAuthStep("email-verification");
      throw new Error("Please verify your email first. Check your inbox.");
    }

    setUserData({
      email,
      emailVerified: true,
    });
    setAuthStep("link-username");
  };

  const handleGoogleAuth = async () => {
    const credential = await signInWithPopup(auth, googleProvider);
    const email = credential.user.email || "";
    setUserData({
      email,
      emailVerified: true,
    });
    setAuthStep("link-username");
  };

  const handleResendVerification = async () => {
    const user = auth.currentUser;
    if (user && !user.emailVerified) {
      await sendEmailVerification(user);
    }
  };

  const handleContinueAfterVerification = () => {
    const user = auth.currentUser;
    if (user) {
      user.reload().then(() => {
        if (user.emailVerified) {
          setUserData({ email: user.email || "", emailVerified: true });
          setAuthStep("link-username");
        }
      });
    }
  };

  const handleLinkUsername = async (username: string) => {
    await api.linkSleeperUsername(username);
    await setUsername(username);
    setAuthStep("select-league");
  };

  const handleSelectLeague = async (leagueId: string) => {
    await selectLeague(leagueId);
  };

  const handleLeagueSetupComplete = async (settings: Record<string, number>) => {
    await updateLeague(settings);
    await refreshLeagueData();
    setAuthStep("authenticated");
  };

  const handleCheckAgain = async () => {
    await refreshLeagueData();
  };

  const handleLogout = async () => {
    await signOut(auth);
    logout();
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthResolving) {
    return <LoadingScreen />;
  }

  if (!userId && authStep === "login") {
    return <Login onEmailAuth={handleEmailAuth} onGoogleAuth={handleGoogleAuth} />;
  }

  if (authStep === "email-verification" && userData) {
    return (
      <EmailVerification
        email={userData.email}
        onResendVerification={handleResendVerification}
        onContinue={handleContinueAfterVerification}
      />
    );
  }

  if (authStep === "link-username") {
    return <LinkSleeperUsername onLinkUsername={handleLinkUsername} />;
  }

  if (authStep === "select-league" && !selectedLeagueId) {
    return <LeagueSelector leagues={leagueOptions} onSelectLeague={handleSelectLeague} />;
  }

  if (!isLeagueConfigured && selectedLeagueId && isLeagueCommissioner) {
    return (
      <LeagueSetup leagueName={selectedLeague?.name || "League"} onComplete={handleLeagueSetupComplete} />
    );
  }

  if (!isLeagueConfigured && selectedLeagueId && !isLeagueCommissioner) {
    return (
      <WaitingForSetup
        leagueName={selectedLeague?.name || "League"}
        commissionerName={commissionerName}
        onLogout={handleLogout}
        onCheckAgain={handleCheckAgain}
      />
    );
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
          <Settings
            onCommissionerSaved={() => setBannerMessage("Changes Saved")}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
}


