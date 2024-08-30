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
import SettingsScreen from './screens/SettingsScreen'; // Import SettingsScreen

const Stack = createStackNavigator();

function App() {
  const [isLoading, setIsLoading] = useState(true);  // Initially loading
  const [userId, setUserId] = useState('');
  const [leagues, setLeagues] = useState([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [data, setData] = useState(null);
  const [contracts, setContracts] = useState([]);  // State to store contracts
  const [leagueData, setLeagueData] = useState(null)

  // Check if userId and selectedLeagueId exist in cache on initial load
  useEffect(() => {
    const loadCachedData = async () => {
      const cachedUserId = await AsyncStorage.getItem('userId');
      const cachedLeagueId = await AsyncStorage.getItem('selectedLeagueId');
      if (cachedUserId) {
        setUserId(cachedUserId);
        await fetchLeagues(cachedUserId);  // Fetch leagues when user ID is obtained
      }
      if (cachedLeagueId) {
        setSelectedLeagueId(cachedLeagueId);
        await fetchLeagueData(cachedLeagueId, cachedUserId);  // Fetch league data from cachedLeagueId
      }
      setIsLoading(false);  // Turn off loading once cached data is handled
    };
    loadCachedData();
  }, []);

  useEffect(() => {
    if (selectedLeagueId && userId) {
      setIsLoading(true);
      fetchLeagueData(selectedLeagueId, userId);
    }
  }, [selectedLeagueId, userId]);

  // Function to fetch user ID and cache it
  const fetchUserId = async (username) => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://api.sleeper.app/v1/user/${username}`);
      const userInfo = await response.json();
      await AsyncStorage.setItem('userId', userInfo.user_id);  // Cache the userId
      return userInfo.user_id;
    } catch (error) {
      console.error("Error fetching user ID:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch leagues
  const fetchLeagues = async (userId) => {
    try {
      const response = await fetch(`https://api.sleeper.app/v1/user/${userId}/leagues/nfl/2024`);
      const jsonData = await response.json();
      setLeagues(jsonData);
    } catch (error) {
      console.error("Error fetching leagues:", error);
    }
  };

  // Function to fetch contracts
  const fetchContracts = async (leagueId) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/contracts/${leagueId}`);
      const jsonData = await response.json();
      setContracts(jsonData);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    }
  };

  // Function to fetch league data
  const fetchLeagueData = async (leagueId, userId) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/rosters/${leagueId}/${userId}`);
      const jsonData = await response.json();
      setData(jsonData['team_info']);
      setLeagueData(jsonData['league_info'])
      await fetchContracts(leagueId);  // Fetch contracts for the league
    } catch (error) {
      console.error("Error fetching league data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle league selection and cache it
  const handleSelectLeague = async (leagueId) => {
    setSelectedLeagueId(leagueId);
    await AsyncStorage.setItem('selectedLeagueId', leagueId);  // Cache selected leagueId
    fetchLeagueData(leagueId, userId);  // Fetch league data for selected league
  };

  // Function to handle logout and only clear userId and selected league
  const handleLogout = async () => {
    await AsyncStorage.removeItem('userId');  // Remove only the userId
    await AsyncStorage.removeItem('selectedLeagueId');  // Remove selected leagueId from cache
    setUserId('');  // Clear local userId
    setLeagues([]);  // Clear leagues
    setSelectedLeagueId('');  // Clear selected league
    setData(null);  // Clear data
    setContracts([]);  // Clear contracts
  };

  // Show the loading screen while fetching data
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollView}>
          <LoadingScreen />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show the Username input screen
  if (!userId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollView}>
          <UsernameInputScreen
            onUsernameSubmit={async (username) => {
              const fetchedUserId = await fetchUserId(username);
              if (fetchedUserId) {
                setUserId(fetchedUserId);
                fetchLeagues(fetchedUserId);  // Fetch leagues when user ID is obtained
              }
            }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show the list of leagues if no league is selected
  if (!selectedLeagueId && leagues.length > 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollView}>
          <LeagueListScreen leagues={leagues} onSelectLeague={handleSelectLeague} />  {/* Use handleSelectLeague */}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show the main app navigation when league data is fetched
  if (data) {
    const playerData = data.map((team) => ({
      display_name: team.display_name,
      total_amount: team.total_amount,
      players: team.players,
    }));

    const myTeam = data.find((team) => team.owner_id === userId); // Fetch current user's team

    return (
      <NavigationContainer>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollView}>
            <Stack.Navigator
              screenOptions={{
                header: (props) => <NavBar {...props} />,
                title: "Sleeper2.0"
              }}
            >
              <Stack.Screen name="MyTeam" component={MyTeamScreen} initialParams={{ team: myTeam, leagueId: selectedLeagueId, fetchLeagueData, leagueData: leagueData}} />
              <Stack.Screen name="Teams" component={TeamsScreen} initialParams={{ data, isOwner: myTeam['is_owner'], leagueData: leagueData, leagueId: selectedLeagueId}} />
              <Stack.Screen name="Future" component={FutureScreen} initialParams={{ data }} />
              <Stack.Screen name="Trade" component={TradeScreen} initialParams={{ playerData }} />
              <Stack.Screen
                name="Contracts"
                component={ContractsScreen}
                initialParams={{ playerData, leagueId: selectedLeagueId, contracts, userId, fetchContracts, fetchLeagueData }}  // Pass contracts to ContractsScreen
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}  // Add SettingsScreen to the stack
                initialParams={{ leagues, selectedLeagueId, handleLogout, handleSelectLeague, isOwner: myTeam['is_owner'] }}  // Pass logout and leagues
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
