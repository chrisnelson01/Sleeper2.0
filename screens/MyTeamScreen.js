import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
const MyTeamScreen = ({ route, navigation }) => {
  const { team, leagueId, leagueData } = route.params;
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmationType, setConfirmationType] = useState(null);
  if (!team) {
    return <Text style={styles.errorText}>Team data not found</Text>;
  }
  const handleRfaAction = () => {
    setConfirmationType('RFA');
  };

  const handleAmnestyAction = () => {
    setConfirmationType('Amnesty');
  };

  const handleExtendAction = () => {
    setConfirmationType('Extend');
  };

const confirmAction = async () => {
  console.log(selectedPlayer);
  console.log(team.owner_id);
  console.log(leagueId);
  try {
    let endpoint;
    let body;

    if (confirmationType === 'RFA') {
      endpoint = 'https://chrisnel01.pythonanywhere.com/api/rfa';
      body = JSON.stringify({
        league_id: leagueId,
        player_id: selectedPlayer.player_id,
        team_id: team.owner_id,
        contract_length: leagueData['rfa_length'],
      });
      Alert.alert('RFA Added', `${selectedPlayer.first_name} ${selectedPlayer.last_name} added as RFA.`);
    } else if (confirmationType === 'Amnesty') {
      endpoint = 'https://chrisnel01.pythonanywhere.com/api/amnesty';
      body = JSON.stringify({
        league_id: leagueId,
        player_id: selectedPlayer.player_id,
        team_id: team.owner_id,
      });
      Alert.alert('Amnesty Applied', `${selectedPlayer.first_name} ${selectedPlayer.last_name} was amnestied.`);
    } else if (confirmationType === 'Extend') {
      endpoint = 'https://chrisnel01.pythonanywhere.com/api/extensions';
      body = JSON.stringify({
        league_id: leagueId,
        player_id: selectedPlayer.player_id,
        contract_length: leagueData['extension_length'],
        team_id: team.owner_id,
      });
      Alert.alert('Player Extended', `${selectedPlayer.first_name} ${selectedPlayer.last_name} extended.`);
    }

    if (endpoint && body) {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      // Fetch updated league data after action
      await route.params.fetchLeagueData(leagueId, team.owner_id);
    }
  } catch (error) {
    console.error(error);
    Alert.alert('Error', 'An error occurred while processing the request.');
  }
  navigation.replace('MyTeam')
  setModalVisible(false);
  setConfirmationType(null);
};

  return (
    <ScrollView style={styles.container}>
      <View style={styles.userContainer}>
        {team.avatar && (
          <Image source={{ uri: `https://sleepercdn.com/avatars/thumbs/${team.avatar}` }} style={styles.avatarImage} />
        )}
        <Text style={styles.title}>{team.display_name}</Text>
      </View>

      {team.players.map((player) => (
        <TouchableOpacity
          key={player.player_id}
          style={[
            styles.playerContainer,
            {
              backgroundColor: '#264b63',
            },
          ]}
          onPress={() => {
            setSelectedPlayer(player);
            setModalVisible(true);
          }}
        >
          <Image
            source={{ uri: `https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg` }}
            style={styles.playerImage}
          />
          <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{`${player.first_name} ${player.last_name}`}</Text>
          <View style={styles.row}> {/* Aligning items side by side */}
            <View style={styles.amountContainer}>
            <Text style={styles.playerAmount}>
              {`$${player.amount}`}
            </Text>
            </View>
            {player.contract !== 0 && (
              <View style={styles.row}> {/* Wrapping contract info */}
                <Ionicons name="document-text-outline" size={16} color="#fff" style={styles.iconOffset} /> {/* Contract Icon */}
                <Text style={styles.icon}>{` ${player.contract} `}</Text>
              </View>
            )}
            {player.extension_contract_length && (
              <View style={styles.row}> {/* Wrapping extension info */}
                <Ionicons name="add-circle-outline" size={16} color="#fff" style={styles.iconOffset} /> {/* Extension Icon */}
                <Text style={styles.icon}>{` ${player.extension_contract_length} `}</Text>
              </View>
            )}
            {player.rfa_contract_length && (
              <View style={styles.row}> {/* Wrapping RFA info */}
                <Ionicons name="ribbon-outline" size={16} color="#fff" style={styles.iconOffset} /> {/* RFA Icon */}
                <Text style={styles.icon}>{` ${player.rfa_contract_length} `}</Text>
              </View>
            )}
            {player.amnesty && (
              <View style={styles.row}> {/* Wrapping amnesty info */}
                <Ionicons name="close-circle-outline" size={16} color="#fff" style={styles.iconOffset} /> {/* Amnesty Icon */}
              </View>
            )}
            {player.taxi && (
              <View style={styles.row}> {/* Wrapping taxi info */}
                <Ionicons name="car-outline" size={16} color="#fff" style={styles.iconOffset} /> {/* Taxi Icon */}
              </View>
            )}
          </View>
        </View>
        </TouchableOpacity>
      ))}

      {/* Modal for RFA, Amnesty, and Extend Actions */}
      <Modal
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          
          setModalVisible(false);
          setConfirmationType(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {confirmationType ? (
              <>
                <Text style={styles.modalTitle}>Confirm {confirmationType}</Text>
                <Text style={styles.modalMessage}>
                  {`Are you sure you want to ${confirmationType === 'RFA' ? 'add' : confirmationType === 'Amnesty' ? 'amnesty' : 'extend'} ${selectedPlayer?.first_name} ${selectedPlayer?.last_name}?`}
                </Text>
                <TouchableOpacity style={styles.modalButton} onPress={confirmAction}>
                  <Text style={styles.modalButtonText}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={() => setConfirmationType(null)}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Player Options</Text>
                {selectedPlayer && (
                  <Text style={styles.modalMessage}>
                    {`What would you like to do with ${selectedPlayer.first_name} ${selectedPlayer.last_name}?`}
                  </Text>
                )}
                {team.rfa_left > 0 && (
                  <TouchableOpacity style={styles.modalButton} onPress={handleRfaAction}>
                    <Text style={styles.modalButtonText}>Add as RFA</Text>
                  </TouchableOpacity>
                )}
                {team.amnesty_left > 0 && (
                  <TouchableOpacity style={styles.modalButton} onPress={handleAmnestyAction}>
                    <Text style={styles.modalButtonText}>Amnesty Player</Text>
                  </TouchableOpacity>
                )}
                {team.extension_left > 0 && (
                  <TouchableOpacity style={styles.modalButton} onPress={handleExtendAction}>
                    <Text style={styles.modalButtonText}>Extend Player</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181c28',
    padding: 10,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'center',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  playerContainer: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  playerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  playerAmount: {
    fontSize: 14,
    color: 'white',
    minWidth: 30,
    textAlign: 'left'
  },
  icon: {
    fontSize: 14,
    color: 'white',
    textAlign: 'left'
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    padding: 20,
    backgroundColor: '#181c28',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'white',
  },
  modalMessage: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    color: 'white',
  },
  modalButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    borderRadius: 5,
    width: '80%', // Set width as percentage
    alignItems: 'center',
    marginVertical: 10, // Add margin between buttons
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 10,
  },
    row: {
    flexDirection: 'row', // Aligns items horizontally
    alignItems: 'center', // Vertically centers items
  },
  iconOffset: {
    marginLeft: 5, // Adds space between the icon and text
  },
  amountContainer: {
    alignItems: 'center'
  }
});

export default MyTeamScreen;
