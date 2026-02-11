import React, { useState, useEffect } from 'react';
import { View, Picker, StyleSheet, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, Dimensions, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants';
import { useAppContext } from '../context/AppContext';
import Screen from '../components/Screen';
import { useTheme } from '../styles/theme';

const SettingsScreen = ({ navigation }) => {
  const { leagues, selectedLeagueId, selectLeague, logout, userId, rostersData, themeMode, setThemeMode } = useAppContext();
  const theme = useTheme();
  const styles = getStyles(theme);
  const isOwner = rostersData?.find(t => t.owner_id === userId)?.is_owner;
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
        const response = await fetch(`${API_BASE_URL}/rules/${selectedLeague}`);
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
    selectLeague(newLeagueId);
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
      const response = await fetch(`${API_BASE_URL}/rules/${selectedLeague}`, {
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
    <Screen scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage leagues, appearance, and rules.</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Select League</Text>
        <View style={styles.pickerWrap}>
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
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.themeButtons}>
          <TouchableOpacity
            style={[styles.themeButton, themeMode === 'light' && styles.themeButtonActive]}
            onPress={() => setThemeMode('light')}
          >
            <Text style={[styles.themeButtonText, themeMode === 'light' && styles.themeButtonTextActive]}>Light</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.themeButton, themeMode === 'dark' && styles.themeButtonActive]}
            onPress={() => setThemeMode('dark')}
          >
            <Text style={[styles.themeButtonText, themeMode === 'dark' && styles.themeButtonTextActive]}>Dark</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>League Rules</Text>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.accent} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.rulesContainer}>
            {rules && rules.map((rule, index) => (
              <View key={index} style={styles.ruleContainer}>
                <Text style={styles.ruleText}>{rule.rule_text}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {isOwner && (
        <TouchableOpacity style={styles.editButton} onPress={showEditModal}>
          <Text style={styles.editButtonText}>Edit League Rules</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>

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
              <ActivityIndicator size="large" color={theme.colors.accent} />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {rules && rules.map((rule, index) => (
                  <View key={index}>
                    <TextInput
                      style={[styles.ruleTextInput, { height: modalHeight * 0.7, width: modalWidth * 0.95 }]}
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
    </Screen>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    scrollContent: {
      paddingBottom: theme.spacing.xxl,
      gap: theme.spacing.md,
    },
    header: {
      marginBottom: theme.spacing.sm,
    },
    title: {
      fontSize: 28,
      color: theme.colors.text,
      fontFamily: theme.typography.heading.fontFamily,
    },
    subtitle: {
      marginTop: theme.spacing.xs,
      color: theme.colors.textMuted,
      fontFamily: theme.typography.subtitle.fontFamily,
    },
    sectionCard: {
      ...theme.card,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontFamily: theme.typography.body.fontFamily,
    },
    pickerWrap: {
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceAlt,
      overflow: 'hidden',
    },
    picker: {
      width: '100%',
      color: theme.colors.text,
    },
    themeButtons: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    themeButton: {
      paddingVertical: 8,
      paddingHorizontal: 18,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    themeButtonActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    themeButtonText: {
      color: theme.colors.text,
      fontFamily: theme.typography.body.fontFamily,
    },
    themeButtonTextActive: {
      color: theme.colors.accentText,
    },
    rulesContainer: {
      gap: theme.spacing.sm,
    },
    ruleContainer: {
      ...theme.card,
      padding: theme.spacing.sm,
    },
    ruleText: {
      color: theme.colors.text,
      fontSize: 16,
      fontFamily: theme.typography.body.fontFamily,
    },
    ruleTextInput: {
      color: theme.colors.text,
      fontSize: 16,
      backgroundColor: theme.colors.surfaceAlt,
      paddingTop: 10,
      borderRadius: theme.radii.md,
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    editButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 12,
      borderRadius: theme.radii.pill,
      alignSelf: 'center',
      width: '100%',
      alignItems: 'center',
      ...theme.shadows.card,
    },
    editButtonText: {
      color: theme.colors.accentText,
      fontSize: 16,
      fontFamily: theme.typography.body.fontFamily,
    },
    updateButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: theme.radii.pill,
      alignSelf: 'center',
      marginTop: 10,
    },
    updateButtonText: {
      color: theme.colors.accentText,
      fontSize: 16,
      fontFamily: theme.typography.body.fontFamily,
    },
    logoutButton: {
      backgroundColor: theme.colors.surface,
      paddingVertical: 12,
      borderRadius: theme.radii.pill,
      width: '100%',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    logoutButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontFamily: theme.typography.body.fontFamily,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
      backgroundColor: theme.colors.card,
      padding: theme.spacing.sm,
      borderRadius: theme.radii.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    modalTitle: {
      color: theme.colors.text,
      fontSize: 18,
      marginBottom: 15,
      fontFamily: theme.typography.title.fontFamily,
    },
    closeButton: {
      backgroundColor: theme.colors.surface,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: theme.radii.pill,
      alignSelf: 'center',
      marginTop: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    closeButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontFamily: theme.typography.body.fontFamily,
    },
    errorText: {
      color: '#B23A3A',
      fontSize: 16,
      marginTop: 10,
      fontFamily: theme.typography.body.fontFamily,
    },
    modalBody: {
      width: '100%',
    },
  });

export default SettingsScreen;
