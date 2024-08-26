import React, { useState, useEffect } from 'react';
import { View, Picker, StyleSheet, Text, SafeAreaView, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';  // Import AsyncStorage

const SettingsScreen = ({ route, navigation }) => {
  const { leagues, selectedLeagueId, handleLogout, handleSelectLeague } = route.params;
  const [selectedLeague, setSelectedLeague] = useState(selectedLeagueId);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Show modal and fetch the rules when the modal is opened
  const showRulesModal = async () => {
    setIsModalVisible(true);  // Show modal
    setLoading(true);  // Set loading state to true
    try {
      const response = await fetch(`https://chrisnel01.pythonanywhere.com/api/rules/${selectedLeague}`);
      const data = await response.json();

      if (response.ok) {
        setRules(data);
        setError(null);  // Clear any previous error
      } else {
        setError(data.error || 'Failed to fetch rules');
      }
    } catch (err) {
      setError('Failed to fetch rules');
    } finally {
      setLoading(false);  // Set loading state to false once data is fetched
    }
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

      {/* Button to display rules */}
      <TouchableOpacity style={styles.rulesButton} onPress={showRulesModal}>
        <Text style={styles.rulesButtonText}>View League Rules</Text>
      </TouchableOpacity>

      {/* Log Out Button at the bottom */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for displaying league rules */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>League Rules</Text>

            {loading ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <ScrollView style={styles.rulesContainer}>
                {rules && rules.map((rule, index) => (
                  <View key={index} style={styles.ruleContainer}>
                    <Text style={styles.ruleText}>{rule.rule_text}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={() => setIsModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  rulesButton: {
    backgroundColor: '#4a5f82',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: 'center',
  },
  rulesButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',  // Semi-transparent background
  },
  modalContainer: {
    width: '85%',
    height: '85%',
    backgroundColor: '#293142',
    padding: 10,
    paddingHorizontal: 7,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  rulesContainer: {
      // Set max height to make the rules scrollable
  },
  ruleContainer: {
    backgroundColor: '#293142',
    marginBottom: 10,
    padding: 1,
    borderRadius: 1,
  },
  ruleText: {
    color: 'white',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginTop: 10,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#4a5f82',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SettingsScreen;
