import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import FutureScreen from './screens/FutureScreen';
import TradeScreen from './screens/TradeScreen';
import TeamsScreen from './screens/TeamsScreen';
import NavBar from './components/NavBar';

const Stack = createStackNavigator();

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('http://chrisnel01.pythonanywhere.com/api/rosters');
      const jsonData = await response.json();
      setData(jsonData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      // You can customize the loading screen as needed
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Loading" component={() => <></>} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }
  // Extract player data
  const playerData = data.map(team => ({
    display_name: team.display_name,
    total_amount: team.total_amount,
    players: team.players,
  }));
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          header: (props) => <NavBar {...props} />,
        }}>
        <Stack.Screen name="Teams" component={TeamsScreen} initialParams={{ data }} />
        <Stack.Screen name="Future" component={FutureScreen} initialParams={{ data }} />
        <Stack.Screen name="Trade" component={TradeScreen} initialParams={{ playerData }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
