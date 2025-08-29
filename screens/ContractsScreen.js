import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity, Image, Picker, Modal } from 'react-native';
import { API_BASE_URL } from '../constants';

const ContractsScreen = ({ route, navigation }) => {
  const { playerData, leagueId, contracts, leagueData } = route.params;  // Use the passed contracts from App.js
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [contractLength, setContractLength] = useState(1);  // Default to 1 year
  const [modalVisible, setModalVisible] = useState(false);

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
    <TouchableOpacity
      style={[
        styles.playerItem,
        selectedPlayer && selectedPlayer.player_id === item.player_id && styles.selectedPlayerHighlight // Add highlight if player is selected
      ]}
      onPress={() => setSelectedPlayer(item)}
    >
      <Image
        source={{ uri: `https://sleepercdn.com/content/nfl/players/${item.player_id}.jpg` }}
        style={styles.playerImage}
      />
      <Text style={styles.playerText}>{`${item.first_name} ${item.last_name} (Current: ${item.contract || 1} years)`}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Update Player Contract</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search for a player..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={filterPlayers}
      />

      {searchQuery && (
        <FlatList
          data={filteredPlayers}  // Only show filtered players when search query exists
          renderItem={renderPlayerItem}
          keyExtractor={item => item.player_id.toString()}
          style={styles.playerList}
        />
      )}

      {selectedPlayer && (
        <>
          <Text style={styles.selectedPlayerText}>
            Selected: {`${selectedPlayer.first_name} ${selectedPlayer.last_name}`}
          </Text>

          <Text style={styles.label}>Select Contract Length:</Text>
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

          {/* Add more space between the picker and button */}
          <View style={{ marginBottom: 40 }} />

          <Button title="Update Contract" onPress={updateContract} />
        </>
      )}

      {/* Modal for Success Message */}
      <Modal
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}  // Close modal on back button press
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Success</Text>
            <Text style={styles.modalMessage}>Contract updated successfully!</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => { 
                setModalVisible(false);
                route.params.fetchLeagueData(leagueId, route.params.userId); // Fetch updated league data
                navigation.replace('Contracts', { playerData: route.params.playerData, leagueId, contracts: route.params.contracts, userId: route.params.userId });  // Navigate back to the Contracts screen
              }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Styles for the screen and modal
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#181c28',
  },
  title: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: 10,
    backgroundColor: '#293142',
    color: 'white',
    marginBottom: 20,
  },
  playerList: {
    marginBottom: 20,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10, // Add padding for better selection experience
    borderRadius: 8, // Add some border radius for visual aesthetics
  },
  playerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  playerText: {
    fontSize: 18,
    color: 'white',
  },
  selectedPlayerText: {
    fontSize: 18,
    color: 'white',
    marginBottom: 10,
  },
  selectedPlayerHighlight: {
    backgroundColor: '#4a5f82',  // Highlight color for selected player
  },
  label: {
    fontSize: 18,
    color: 'white',
    marginBottom: 10,
  },
  picker: {
    backgroundColor: '#293142',
    color: 'white',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',  // Background overlay for modal
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#293142',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default ContractsScreen;
