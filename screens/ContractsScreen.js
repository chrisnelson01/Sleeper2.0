import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, Picker, Modal } from 'react-native';
import { API_BASE_URL } from '../constants';
import { useAppContext } from '../context/AppContext';
import Screen from '../components/Screen';
import PlayerCard from '../components/PlayerCard';
import { useTheme } from '../styles/theme';

const ContractsScreen = ({ route, navigation }) => {
  const { playerData, leagueId, leagueData } = route.params;  // Use the passed contracts from App.js
  const { rostersData, leagueInfo, selectedLeagueId, userId, fetchRostersData } = useAppContext();
  const theme = useTheme();
  const styles = getStyles(theme);
  const [contracts, setContracts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [contractLength, setContractLength] = useState(1);  // Default to 1 year
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch contracts when leagueId changes
  useEffect(() => {
    if (!leagueId) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/contracts/${leagueId}`);
        const json = await res.json();
        setContracts(json.data || json);
      } catch (e) {
        console.error('Failed loading contracts', e);
      }
    })();
  }, [leagueId]);

  // Filter players based on search query and limit to 3 results
  const filterPlayers = (query) => {
    setSearchQuery(query);
    if (query) {
      const filtered = playerData
        .flatMap((team) => team.players || [])  // Flatten all players into one list
        .filter((player) =>
          player.contract > 0 &&  // Only include players with a contract
          `${player.first_name} ${player.last_name}`.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 3);  // Limit to 3 players
      setFilteredPlayers(filtered);
    } else {
      setFilteredPlayers([]);  // Clear the list if no query
    }
  };

  // Check if the player already has a contract in the database
  const playerHasContract = (player) => {
    return contracts.some((contract) => Number(contract.player_id) === Number(player.player_id));
  };

  // Find the team of the selected player
  const findTeamForPlayer = (playerId) => {
    return playerData
      .flatMap((team) => team.team_info || []) // Flatten all teams into one list
      .find((team) => team.players && team.players.some((player) => player.player_id === playerId));
  };

  // Update the contract length for a player
  const updateContract = async () => {
    if (!selectedPlayer || contractLength === null) {
      Alert.alert('Error', 'Please select a player and enter a contract length.');
      return;
    }

    if (!playerHasContract(selectedPlayer)) {
      Alert.alert('Error', 'This player does not have an existing contract.');
      return;
    }

    const team = findTeamForPlayer(selectedPlayer.player_id);

    if (!team) {
      Alert.alert('Error', 'Unable to determine the team for the selected player.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/contracts`, {
        method: 'PUT',  // Only allow updating existing contracts
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          league_id: leagueId,  // Use leagueId from route params
          player_id: selectedPlayer.player_id,
          team_id: team.owner_id,  // Use the team ID from the team information
          contract_length: contractLength,
          current_season: leagueData['current_season'] // Assuming current season is the current year
        }),
      });

      const result = await response.json();

      // Check if the response was successful
      if (response.ok) {
        setModalVisible(true);  // Show modal on success
        setSelectedPlayer(null);  // Reset selected player
        setContractLength(1);  // Reset contract length to default value
        setSearchQuery('');  // Clear the search query
        setFilteredPlayers([]);  // Clear filtered players
      } else {
        Alert.alert('Error', result.error || 'Failed to update contract.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update contract.');
    }
  };

  // Render each player item with name and image
  const renderPlayerItem = ({ item }) => (
    <PlayerCard
      player={item}
      highlight={selectedPlayer && selectedPlayer.player_id === item.player_id}
      onPress={() => setSelectedPlayer(item)}
    />
  );

  return (
    <Screen scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Update Contracts</Text>
        <Text style={styles.subtitle}>Search a player and set the new term.</Text>
      </View>

      <View style={styles.searchCard}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a player..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={filterPlayers}
        />

        {searchQuery && (
          <View style={styles.playerList}>
            {filteredPlayers.map((item) => renderPlayerItem({ item }))}
          </View>
        )}
      </View>

      {selectedPlayer && (
        <View style={styles.selectionCard}>
          <Text style={styles.selectedPlayerText}>
            {`${selectedPlayer.first_name} ${selectedPlayer.last_name}`}
          </Text>

          <Text style={styles.label}>Contract length</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={contractLength}
              onValueChange={(itemValue) => setContractLength(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="1" value={1} />
              <Picker.Item label="2" value={2} />
              <Picker.Item label="3" value={3} />
              <Picker.Item label="4" value={4} />
              <Picker.Item label="5" value={5} />
              <Picker.Item label="6" value={6} />
              <Picker.Item label="7" value={7} />
              <Picker.Item label="8" value={8} />
              <Picker.Item label="9" value={9} />
              <Picker.Item label="10" value={10} />
            </Picker>
          </View>

          <TouchableOpacity style={styles.updateButton} onPress={updateContract}>
            <Text style={styles.updateButtonText}>Update Contract</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Success</Text>
            <Text style={styles.modalMessage}>Contract updated successfully!</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setModalVisible(false);
                route.params.fetchLeagueData(leagueId, route.params.userId);
                navigation.replace('Contracts');
              }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

// Styles for the screen and modal
const getStyles = (theme) =>
  StyleSheet.create({
    scrollContent: {
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },
    header: {
      gap: theme.spacing.xs,
    },
    title: {
      fontSize: 28,
      color: theme.colors.text,
      fontFamily: theme.typography.heading.fontFamily,
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.subtitle.fontFamily,
    },
    searchCard: {
      ...theme.card,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    searchInput: {
      height: 40,
      borderColor: theme.colors.border,
      borderWidth: 1,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.surfaceAlt,
      color: theme.colors.text,
      borderRadius: theme.radii.md,
      fontFamily: theme.typography.body.fontFamily,
    },
    playerList: {
      gap: theme.spacing.sm,
    },
    selectedPlayerText: {
      fontSize: 18,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
      fontFamily: theme.typography.body.fontFamily,
    },
    label: {
      fontSize: 14,
      color: theme.colors.textMuted,
      marginBottom: 6,
      fontFamily: theme.typography.body.fontFamily,
    },
    selectionCard: {
      ...theme.card,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    pickerWrap: {
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceAlt,
      overflow: 'hidden',
    },
    picker: {
      color: theme.colors.text,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',  // Background overlay for modal
    },
    modalContent: {
      width: 300,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    modalTitle: {
      fontSize: 22,
      marginBottom: 10,
      color: theme.colors.text,
      fontFamily: theme.typography.title.fontFamily,
    },
    modalMessage: {
      fontSize: 18,
      marginBottom: 20,
      textAlign: 'center',
      color: theme.colors.text,
      fontFamily: theme.typography.body.fontFamily,
    },
    closeButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: theme.radii.pill,
    },
    closeButtonText: {
      color: theme.colors.accentText,
      fontSize: 16,
      fontFamily: theme.typography.body.fontFamily,
    },
    updateButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 12,
      borderRadius: theme.radii.pill,
      alignItems: 'center',
      ...theme.shadows.card,
    },
    updateButtonText: {
      color: theme.colors.accentText,
      fontSize: 16,
      fontFamily: theme.typography.body.fontFamily,
    },
  });

export default ContractsScreen;
