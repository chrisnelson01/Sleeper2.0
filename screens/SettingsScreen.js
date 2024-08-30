import React, { useState, useEffect } from 'react';
import { View, Picker, StyleSheet, Text, SafeAreaView, TouchableOpacity, Modal, ScrollView, TextInput, ActivityIndicator, Dimensions, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = ({ route, navigation }) => {
  const { leagues, selectedLeagueId, handleLogout, handleSelectLeague, isOwner } = route.params;
  const [selectedLeague, setSelectedLeague] = useState(selectedLeagueId);
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editedRules, setEditedRules] = useState([]); // State for storing edited rules
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [modalHeight, setModalHeight] = useState(0);
  const [modalWidth, setModalWidth] = useState(0);

  useEffect(() => {
    const loadCachedLeagueId = async () => {
      const cachedLeagueId = await AsyncStorage.getItem('selectedLeagueId');
      if (cachedLeagueId) {
        setSelectedLeague(cachedLeagueId);
      }
    };
    loadCachedLeagueId();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const { height, width } = Dimensions.get('window');
      setModalHeight(height * 0.85); // Set modal height to 85% of screen height
      setModalWidth(width * 0.85);   // Set modal width to 85% of screen width
    };

    handleResize(); // Set initial height and width
    Dimensions.addEventListener('change', handleResize);

    return () => {
      Dimensions.removeEventListener('change', handleResize);
    };
  }, []);

  useEffect(() => {
    const fetchRules = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:5000/api/rules/${selectedLeague}`);
        const data = await response.json();

        if (response.ok) {
          setRules(data);
          setEditedRules(data.map(rule => rule.rule_text)); // Initialize editedRules
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch rules');
        }
      } catch (err) {
        setError('Failed to fetch rules');
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, [selectedLeague]);

  const handleLeagueChange = async (newLeagueId) => {
    setSelectedLeague(newLeagueId);
    await AsyncStorage.setItem('selectedLeagueId', newLeagueId);
    handleSelectLeague(newLeagueId);
    navigation.navigate('MyTeam');
  };

  const handleRuleChange = (text, index) => {
    const newRules = [...editedRules];
    newRules[index] = text;
    setEditedRules(newRules);
  };

  const handleUpdateRules = async () => {
    try {
      const updatedRules = rules.map((rule, index) => ({ ...rule, rule_text: editedRules[index] }));
      const response = await fetch(`http://127.0.0.1:5000/api/rules/${selectedLeague}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRules),
      });

      if (response.ok) {
        setRules(updatedRules);
        Alert.alert('Success', 'Rules updated successfully.');
        setIsEditModalVisible(false);
      } else {
        setError('Failed to update rules');
      }
    } catch (err) {
      setError('Failed to update rules');
    }
  };

  const showEditModal = () => {
    setIsEditModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pickerContainer}>
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

      {isOwner && (
        <TouchableOpacity style={styles.editButton} onPress={showEditModal}>
          <Text style={styles.editButtonText}>Edit League Rules</Text>
        </TouchableOpacity>
      )}

      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for editing league rules */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={isEditModalVisible}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { height: modalHeight, width: modalWidth }]}>
            <Text style={styles.modalTitle}>Edit League Rules</Text>

            {loading ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <ScrollView>
                {rules && rules.map((rule, index) => (
                  <View key={index}>
                    <TextInput
                      style={[styles.ruleTextInput, { height: modalHeight * 0.7 ,width: modalWidth *.95 }]} // Set the TextInput width to match modal width
                      value={editedRules[index]}
                      onChangeText={(text) => handleRuleChange(text, index)}
                      multiline
                    />
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.updateButton} onPress={handleUpdateRules}>
              <Text style={styles.updateButtonText}>Update Rules</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={() => setIsEditModalVisible(false)}>
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
  rulesContainer: {
    flex: 1,
    marginTop: 20,
    marginBottom: 20,
  },
  ruleContainer: {
    backgroundColor: '#293142',
    padding: 10,
    borderRadius: 5,
  },
  ruleText: {
    color: 'white',
    fontSize: 16,
  },
  ruleTextInput: {
    color: 'white',
    fontSize: 16,
    backgroundColor: '#3a4b6e',
    paddingTop: 10,
    borderRadius: 5,
    alignSelf: 'center'
  },
  editButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 20,
    width: '85%',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  updateButton: {
    backgroundColor: '#4a5f82',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 10,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
    width: '85%',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#293142',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  closeButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginTop: 10,
  },
});

export default SettingsScreen;
