import React, { useEffect, useState } from 'react';
import { ScrollView, SafeAreaView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import UsernameInputScreen from './screens/UsernameInputScreen';
import LeagueListScreen from './screens/LeagueListScreen';
import LoadingScreen from './screens/LoadingScreen';
import TeamsScreen from './screens/TeamsScreen';
import FutureScreen from './screens/FutureScreen';
import TradeScreen from './screens/TradeScreen';
import MyTeamScreen from './screens/MyTeamScreen';
import NavBar from './components/NavBar';
import ContractsScreen from './screens/ContractsScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createStackNavigator();

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [leagues, setLeagues] = useState([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [data, setData] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [leagueData, setLeagueData] = useState(null);

  useEffect(() => {
    const loadCachedData = async () => {
      const cachedUserId = await AsyncStorage.getItem('userId');
      const cachedLeagueId = await AsyncStorage.getItem('selectedLeagueId');
      if (cachedUserId) {
        setUserId(cachedUserId);
        await fetchLeagues(cachedUserId);
      }
      if (cachedLeagueId) {
        setSelectedLeagueId(cachedLeagueId);
        await fetchLeagueData(cachedLeagueId, cachedUserId);
      }
      setIsLoading(false);
    };
    loadCachedData();
  }, []);

  useEffect(() => {
    if (selectedLeagueId && userId) {
      setIsLoading(true);
      fetchLeagueData(selectedLeagueId, userId);
    }
  }, [selectedLeagueId, userId]);

  const fetchUserId = async (username) => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://api.sleeper.app/v1/user/${username}`);
      const userInfo = await response.json();
      await AsyncStorage.setItem('userId', userInfo.user_id);
      return userInfo.user_id;
    } catch (error) {
      console.error("Error fetching user ID:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeagues = async (userId) => {
    try {
      const response = await fetch(`https://api.sleeper.app/v1/user/${userId}/leagues/nfl/2024`);
      const jsonData = await response.json();
      setLeagues(jsonData);
    } catch (error) {
      console.error("Error fetching leagues:", error);
    }
  };

  const fetchContracts = async (leagueId) => {
    try {
      const response = await fetch(`https://chrisnel01.pythonanywhere.com/api/contracts/${leagueId}`);
      const jsonData = await response.json();
      setContracts(jsonData);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    }
  };

  const fetchLeagueData = async (leagueId, userId) => {
    try {
      const response = await fetch(`https://chrisnel01.pythonanywhere.com/api/rosters/${leagueId}/${userId}`);
      const jsonData = await response.json();
      setData(jsonData['team_info']);
      setLeagueData(jsonData['league_info']);
      await fetchContracts(leagueId);
    } catch (error) {
      console.error("Error fetching league data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectLeague = async (leagueId) => {
    setSelectedLeagueId(leagueId);
    await AsyncStorage.setItem('selectedLeagueId', leagueId);
    fetchLeagueData(leagueId, userId);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('selectedLeagueId');
    setUserId('');
    setLeagues([]);
    setSelectedLeagueId('');
    setData(null);
    setContracts([]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollView}>
          <LoadingScreen />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollView}>
          <UsernameInputScreen
            onUsernameSubmit={async (username) => {
              const fetchedUserId = await fetchUserId(username);
              if (fetchedUserId) {
                setUserId(fetchedUserId);
                fetchLeagues(fetchedUserId);
              }
            }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!selectedLeagueId && leagues.length > 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollView}>
          <LeagueListScreen leagues={leagues} onSelectLeague={handleSelectLeague} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (data) {
    const playerData = data.map((team) => ({
      owner_id: team.owner_id,
      display_name: team.display_name,
      total_amount: team.total_amount,
      players: team.players,
    }));

    const myTeam = data.find((team) => team.owner_id === userId);
    return (
      <NavigationContainer>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollView}>
            <Stack.Navigator
              screenOptions={{
                header: (props) => <NavBar {...props} isOwner={myTeam['is_owner']}/>,
                title: "Sleeper2.0"
              }}
            >
              <Stack.Screen name="MyTeam" component={MyTeamScreen} initialParams={{ team: myTeam, leagueId: selectedLeagueId, fetchLeagueData, leagueData: leagueData }} />
              <Stack.Screen name="Teams" component={TeamsScreen} initialParams={{ data, isOwner: myTeam['is_owner'], leagueData: leagueData, leagueId: selectedLeagueId }} />
              <Stack.Screen name="Future" component={FutureScreen} initialParams={{ data }} />
              <Stack.Screen name="Trade" component={TradeScreen} initialParams={{ playerData }} />
              {/* {myTeam['is_owner'] && (
                <Stack.Screen
                  name="Contracts"
                  component={ContractsScreen}
                  initialParams={{ playerData, leagueId: selectedLeagueId, contracts, userId, fetchContracts, fetchLeagueData, leagueData: leagueData }}
                />
              )} */}
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                initialParams={{ leagues, selectedLeagueId, handleLogout, handleSelectLeague, isOwner: myTeam['is_owner'] }}
              />
            </Stack.Navigator>
          </ScrollView>
        </SafeAreaView>
      </NavigationContainer>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#181c28',
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 20,
  },
});

export default App;
