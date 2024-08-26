import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  Button,
  Modal
} from 'react-native';

const Dropdown = ({
  label,
  isDropdownVisible,
  toggleDropdown,
  onSelect,
  selectedTeam,
  playerData,
  onAddAmount,
}) => {
  const [selectedPlayers, setSelectedPlayers] = useState([]);

  const selectPlayer = (player) => {
    const updatedSelectedPlayers = [...selectedPlayers];
    const existingPlayerIndex = updatedSelectedPlayers.findIndex(
      (selectedPlayer) => selectedPlayer.player_id === player.player_id
    );

    if (existingPlayerIndex === -1) {
      updatedSelectedPlayers.push(player);
    } else {
      updatedSelectedPlayers.splice(existingPlayerIndex, 1);
    }

    setSelectedPlayers(updatedSelectedPlayers);
    onAddAmount(updatedSelectedPlayers);
  };

  return (
    <View style={[styles.teamContainer, styles.teamDropdown]}>
      <Pressable onPress={toggleDropdown}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
          {selectedTeam ? selectedTeam.display_name : label}
        </Text>
      </Pressable>

      {isDropdownVisible && (
        <View style={styles.dropdownContainer}>
          <FlatList
            data={playerData}
            keyExtractor={(team) => team.display_name}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  setSelectedPlayers([]);
                }}
                style={styles.teamItem}
              >
                <Text style={{ fontSize: 16, color: 'white', fontWeight: 'bold' }}>{item.display_name}</Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {selectedTeam && (
        <View style={styles.playersContainer}>
          {selectedTeam.players.map((player) => (
            <Pressable
              key={player.player_id}
              style={[
                styles.playerBox,
                {
                  backgroundColor:
                    selectedPlayers.some((p) => p.player_id === player.player_id)
                      ? '#4CAF50'
                      : player.contract === '3'
                      ? '#626e42'
                      : player.contract === '2'
                      ? '#4a5f82'
                      : '#293142',
                },
              ]}
              onPress={() => selectPlayer(player)}
            >
              <Image
                source={{
                  uri: `https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg`,
                }}
                style={styles.playerImage}
              />
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>
                  {player.first_name} {player.last_name}
                </Text>
                <Text style={styles.playerAmount}>${player.amount}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const TradeScreen = ({ route }) => {
  const { playerData } = route.params;

  const [isDropdownVisible1, setDropdownVisible1] = useState(false);
  const [isDropdownVisible2, setDropdownVisible2] = useState(false);
  const [selectedTeam1, setSelectedTeam1] = useState(null);
  const [selectedTeam2, setSelectedTeam2] = useState(null);
  const [selectedPlayers1, setSelectedPlayers1] = useState([]);
  const [selectedPlayers2, setSelectedPlayers2] = useState([]);
  const [tradeResult, setTradeResult] = useState(null);
  const [totalAfterTrade1, setTotalAfterTrade1] = useState(null);
  const [totalAfterTrade2, setTotalAfterTrade2] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const toggleDropdown1 = () => {
    setDropdownVisible1(!isDropdownVisible1);
  };

  const selectTeam1 = (team) => {
    setSelectedTeam1(team);
    setDropdownVisible1(false);
  };

  const toggleDropdown2 = () => {
    setDropdownVisible2(!isDropdownVisible2);
  };

  const selectTeam2 = (team) => {
    setSelectedTeam2(team);
    setDropdownVisible2(false);
  };

  const updateSelectedPlayers1 = (players) => {
    setSelectedPlayers1(players);
  };

  const updateSelectedPlayers2 = (players) => {
    setSelectedPlayers2(players);
  };

  const checkTrade = () => {
    // Add logic to check the trade with selectedPlayers1 and selectedPlayers2
    console.log('Checking trade...');
    if (selectedTeam1 && selectedTeam2) {
      const totalAfterTrade1 = selectedTeam1.total_amount - calculateTotalAmount(selectedPlayers1) + calculateTotalAmount(selectedPlayers2);
      const totalAfterTrade2 = selectedTeam2.total_amount - calculateTotalAmount(selectedPlayers2) + calculateTotalAmount(selectedPlayers1);

      if (totalAfterTrade1 <= 260 && totalAfterTrade2 <= 260) {
        console.log('Trade successful');
        setTradeResult('Trade successful');
        setTotalAfterTrade1(totalAfterTrade1)
        setTotalAfterTrade2(totalAfterTrade2)
      } else {
        console.log('Trade unsuccessful');
        setTradeResult('Trade unsuccessful');
        setTotalAfterTrade1(totalAfterTrade1)
        setTotalAfterTrade2(totalAfterTrade2)
      }
      setIsModalVisible(true);
    } else {
      console.log('Please select two teams before checking trade.');
    }
  };

  const calculateTotalAmount = (players) => {
    return players.reduce((total, player) => total + parseFloat(player.amount), 0);
  };

  return (
    <View style={{backgroundColor: '#181c28', flex: 1, alignItems: 'center'}}>
      <Dropdown
        label="Select a Team"
        isDropdownVisible={isDropdownVisible1}
        toggleDropdown={toggleDropdown1}
        onSelect={selectTeam1}
        selectedTeam={selectedTeam1}
        playerData={playerData}
        onAddAmount={updateSelectedPlayers1}
      />
      <Dropdown
        label="Select another Team"
        isDropdownVisible={isDropdownVisible2}
        toggleDropdown={toggleDropdown2}
        onSelect={selectTeam2}
        selectedTeam={selectedTeam2}
        playerData={playerData}
        onAddAmount={updateSelectedPlayers2}
      />

      {selectedTeam1 && selectedTeam2 && (
        <View style={styles.buttonContainer}>
          <Pressable style={styles.closeButton} onPress={checkTrade}>
            <Text style={styles.closeButtonText}>Check Trade</Text>
          </Pressable>
        </View>
      )}

             {/* Modal */}
<Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {tradeResult && (
              <View style={styles.resultContainer}>
                {tradeResult === 'Trade successful' ? (
                  <Ionicons name="checkmark-circle" size={30} color="#4CAF50" />
                ) : (
                  <Ionicons name="sad" size={30} color="#FF0000" />
                )}
                <Text style={{ color: 'white', fontWeight: 'bold' }}>{tradeResult}</Text>
                <Text style={{ color: 'white', fontSize: 15, marginTop: 10 }}>Teams Total Before and After Trade</Text>
                {selectedTeam1 && selectedTeam2 && (
                  <View style={{
                                  flexDirection: 'row',
                                    flexDirection: 'row', justifyContent: 'space-between', marginTop: 5,}}>
                    <View style={{ alignItems: 'center', margin: 10 }}>
                      <Text style={{ color: 'white', fontSize: 15, fontWeight: 'bold' }}>{selectedTeam1.display_name}</Text>
                      <Text style={{ color: 'white', fontSize: 15 }}>${selectedTeam1.total_amount} | ${totalAfterTrade1}</Text>
                    </View>
                    <View style={{ alignItems: 'center', margin: 10 }}>
                      <Text style={{ color: 'white', fontSize: 15, fontWeight: 'bold' }}>{selectedTeam2.display_name}</Text>
                      <Text style={{ color: 'white', fontSize: 15 }}>${selectedTeam2.total_amount} | ${totalAfterTrade2}</Text>
                    </View>
                  </View>
                )}

                {/* Display selected players for both teams */}
                <View style={styles.selectedPlayersContainer}>
                  <View style={styles.selectedPlayerColumn}>
                    <Text numberOfLines={1} style={{ color: 'white', fontSize: 15, fontWeight: 'bold' }}>{selectedTeam1.display_name} gets:</Text>
                    {selectedPlayers2.map((player) => (
                      <View key={player.player_id} style={{ alignItems: 'center', marginVertical: 5 }}>
                        <Image
                          source={{ uri: `https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg` }}
                          style={styles.playerImage}
                        />
                        <Text numberOfLines={1} style={styles.selectedPlayer}>
                          {player.first_name} {player.last_name}
                        </Text>
                        <Text style={styles.selectedPlayer}>
                          ${player.amount}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.selectedPlayerColumn}>
                    <Text numberOfLines={1} style={{ color: 'white', fontSize: 15, fontWeight: 'bold' }}>{selectedTeam2.display_name} gets:</Text>
                    {selectedPlayers1.map((player) => (
                      <View key={player.player_id} style={{ alignItems: 'center', marginVertical: 5 }}>
                        <Image
                          source={{ uri: `https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg` }}
                          style={styles.playerImage}
                        />
                        <Text numberOfLines={1} style={styles.selectedPlayer}>
                          {player.first_name} {player.last_name}
                        </Text>
                        <Text style={styles.selectedPlayer}>
                          ${player.amount}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <Pressable style={styles.closeButton} onPress={() => setIsModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  teamContainer: {
    backgroundColor: '#293142',
    borderWidth: 1,
    borderColor: 'white',
    marginVertical: 5,
    marginTop: 10,
    padding: 10,
    borderRadius: 10, 
    width: '98%'// Rounded corners for teams
  },
  playersContainer: {
    flexDirection: 'column',
    flexWrap: 'wrap', // Adjust as needed
  },
  playerBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'center',
    padding: 1,
    margin: 1,
    borderRadius: 8,
  },
  playerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    margin: 5,
  },
  buttonContainer: {
    marginVertical: 10,
    width: '50%', // Set the width to your desired value
  },
  resultContainer: {
    alignItems: 'center',
    marginVertical: 10,
    flex: 1
  },
  dropdownContainer: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: 10,
    padding: 10,
  },
  teamItem: {
    borderWidth: 1,
    borderColor: 'white',
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#4a5f82'
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1, // Allows the player name and amount to take up available space
  },
  playerName: {
    marginLeft: 10,
    color: 'white',
    fontSize: 15,
    fontWeight: '500'
  },
  playerAmount: {
    color: 'white',
    alignContent: 'flex-end',
    marginRight: 30
  },
  modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    },
    modalContent: {
      backgroundColor: '#293142',
      padding: 20,
      borderRadius: 10,
      width: '90%', // Adjust the width as needed
    },
    closeButton: {
      marginTop: 10,
      backgroundColor: '#4a5f82',
      padding: 10,
      borderRadius: 10,
      width: '100%',
    },
    closeButtonText: {
      color: 'white',
      textAlign: 'center',
      fontSize: 16,
      fontWeight: 'bold',
    },
    selectedPlayersContainer: {
      flex: 1,
      flexDirection: 'row',
      width: '100%',
      marginHorizontal: 50,// Adjust the width to leave space between the columns
    },
    selectedPlayerColumn: {
      alignItems: 'center',
      width: '48%',
      // Adjust the width to leave space between the columns
    },
    selectedPlayer: {
      color: 'white',
      fontSize: 15,
      marginTop: 5,
    },
});

export default TradeScreen;
