import React, { useState, useEffect } from 'react';
import { View, Picker, StyleSheet, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';  // Import AsyncStorage

const SettingsScreen = ({ route, navigation }) => {
  const { leagues, selectedLeagueId, handleLogout, handleSelectLeague } = route.params;
  const [selectedLeague, setSelectedLeague] = useState(selectedLeagueId);

  // Load cached leagueId on component mount
  useEffect(() => {
    const loadCachedLeagueId = async () => {
      const cachedLeagueId = await AsyncStorage.getItem('selectedLeagueId');
      if (cachedLeagueId) {
        setSelectedLeague(cachedLeagueId);  // Set state if there's a cached league
      }
    };
    loadCachedLeagueId();
  }, []);

  // Handle league change and update the selected leagueId
  const handleLeagueChange = async (newLeagueId) => {
    setSelectedLeague(newLeagueId);  // Update local state
    await AsyncStorage.setItem('selectedLeagueId', newLeagueId);  // Cache the selected league
    handleSelectLeague(newLeagueId);  // Pass it up to the parent
    navigation.navigate('MyTeam');  // Navigate to MyTeam after switching leagues
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pickerContainer}>
        {/* Text above the picker */}
        <Text style={styles.titleText}>Select League</Text>
        
        <Picker
          selectedValue={selectedLeague}
          style={styles.picker}
          onValueChange={(itemValue) => handleLeagueChange(itemValue)}
        >
          {leagues.map((league) => (
            <Picker.Item key={league.league_id} label={league.name} value={league.league_id} />
          ))}
        </Picker>
      </View>

      {/* Log Out Button at the bottom */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#181c28',
  },
  pickerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  picker: {
    width: '75%',
    backgroundColor: '#293142',
    color: '#FFFFFF',
  },
  logoutContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SettingsScreen;
