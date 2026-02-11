import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { AppProvider, useAppContext } from './context/AppContext';
import { ThemedErrorBoundary } from './components/ErrorBoundary';
import UsernameInputScreen from './screens/UsernameInputScreen';
import LeagueListScreen from './screens/LeagueListScreen';
import LoadingScreen from './screens/LoadingScreen';
import MyTeamScreen from './screens/MyTeamScreen';
import TeamsScreen from './screens/TeamsScreen';
import ContractsScreen from './screens/ContractsScreen';
import AllContractsScreen from './screens/AllContractsScreen';
import FutureScreen from './screens/FutureScreen';
import LeagueActivityScreen from './screens/LeagueActivityScreen';
import SettingsScreen from './screens/SettingsScreen';
import NavBar from './components/NavBar';
import { useTheme } from './styles/theme';

const Stack = createStackNavigator();

function AppContent() {
  const {
    userId,
    leagues,
    selectedLeagueId,
    rostersData,
    leagueInfo,
    isLoading,
    initializeFromCache,
    fetchUserId,
    selectLeague,
    logout,
    error,
  } = useAppContext();
  const theme = useTheme();
  const styles = getStyles(theme);

  useEffect(() => {
    initializeFromCache();
  }, [initializeFromCache]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingScreen />
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <UsernameInputScreen onUsernameSubmit={fetchUserId} />
      </SafeAreaView>
    );
  }

  if (!selectedLeagueId || leagues.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LeagueListScreen
          leagues={leagues}
          onSelectLeague={selectLeague}
          onLogout={logout}
          error={error}
        />
      </SafeAreaView>
    );
  }

  if (!rostersData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingScreen />
      </SafeAreaView>
    );
  }

  const myTeam = rostersData.find((team) => team.owner_id === userId);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          header: (props) => (
            <NavBar {...props} isOwner={myTeam?.is_owner} />
          ),
          title: 'Sleeper2.0',
        }}
      >
        <Stack.Screen
          name="MyTeam"
          component={MyTeamScreen}
          initialParams={{
            team: myTeam,
            leagueId: selectedLeagueId,
            leagueData: leagueInfo,
          }}
        />
        <Stack.Screen
          name="Teams"
          component={TeamsScreen}
          initialParams={{ leagueId: selectedLeagueId, rostersData }}
        />
        <Stack.Screen
          name="Contracts"
          component={ContractsScreen}
          initialParams={{ leagueId: selectedLeagueId, rostersData }}
        />
        <Stack.Screen
          name="AllContracts"
          component={AllContractsScreen}
          initialParams={{ leagueId: selectedLeagueId }}
        />
        <Stack.Screen
          name="Future"
          component={FutureScreen}
          initialParams={{ leagueId: selectedLeagueId }}
        />
        <Stack.Screen
          name="Activity"
          component={LeagueActivityScreen}
          initialParams={{ leagueId: selectedLeagueId }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ThemedErrorBoundary>
        <AppContent />
      </ThemedErrorBoundary>
    </AppProvider>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  });
