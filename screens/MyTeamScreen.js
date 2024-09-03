import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PlayerOptionsModal from '../components/PlayerOptionsModal'; 
import ContractLengthModal from '../components/ContractLengthModal';
import ConfirmationModal from '../components/ConfirmationModal'; // Import the confirmation modal component

const MyTeamScreen = ({ route, navigation }) => {
  const { team, leagueId, leagueData } = route.params;
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmationModalVisible, setConfirmationModalVisible] = useState(false);
  const [confirmationType, setConfirmationType] = useState(null);
  const [contractLength, setContractLength] = useState(''); 
  const [contractLengthModalVisible, setContractLengthModalVisible] = useState(false);

  if (!team) {
    return <Text style={styles.errorText}>Team data not found</Text>;
  }

  const handleRfaAction = () => {
    setConfirmationType('RFA');
    setConfirmationModalVisible(true);
  };

  const handleAmnestyAction = () => {
    setConfirmationType('Amnesty');
    setConfirmationModalVisible(true);
  };

  const handleExtendAction = () => {
    setConfirmationType('Extend');
    setConfirmationModalVisible(true);
  };

  const handleAddContractAction = () => {
    setModalVisible(false); // Close player options modal
    setContractLength(''); // Reset contract length
    setContractLengthModalVisible(true); // Show contract length modal
  };

  const handleConfirmContractLength = () => {
    setContractLengthModalVisible(false); // Close contract length modal
    setConfirmationType('AddContract'); // Set confirmation type for contract addition
    setConfirmationModalVisible(true); // Show confirmation modal
  };

  const handleConfirmAction = async () => {
    setConfirmationModalVisible(false); // Close confirmation modal
    try {
      let endpoint;
      let body;

      if (confirmationType === 'RFA') {
        endpoint = 'http://127.0.0.1:5000/api/rfa';
        body = JSON.stringify({
          league_id: leagueId,
          player_id: selectedPlayer.player_id,
          team_id: team.owner_id,
          contract_length: leagueData['rfa_length'],
          season: leagueData['current_season']
        });
        Alert.alert('RFA Added', `${selectedPlayer.first_name} ${selectedPlayer.last_name} added as RFA.`);
      } else if (confirmationType === 'Amnesty') {
        endpoint = 'http://127.0.0.1:5000/api/amnesty';
        body = JSON.stringify({
          league_id: leagueId,
          player_id: selectedPlayer.player_id,
          team_id: team.owner_id,
          season: leagueData['current_season']
        });
        Alert.alert('Amnesty Applied', `${selectedPlayer.first_name} ${selectedPlayer.last_name} was amnestied.`);
      } else if (confirmationType === 'Extend') {
        endpoint = 'http://127.0.0.1:5000/api/extensions';
        body = JSON.stringify({
          league_id: leagueId,
          player_id: selectedPlayer.player_id,
          contract_length: leagueData['extension_length'],
          team_id: team.owner_id,
          season: leagueData['current_season']
        });
        Alert.alert('Player Extended', `${selectedPlayer.first_name} ${selectedPlayer.last_name} extended.`);
      } else if (confirmationType === 'AddContract') {
        endpoint = 'http://127.0.0.1:5000/api/contracts';
        body = JSON.stringify({
          league_id: leagueId,
          player_id: selectedPlayer.player_id,
          team_id: team.owner_id,
          contract_length: contractLength,
          current_season: leagueData['current_season'],
        });
        Alert.alert('Contract Added', `${selectedPlayer.first_name} ${selectedPlayer.last_name} received a new contract.`);
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

    navigation.replace('MyTeam');
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
            setSelectedPlayer(player); // Set the selected player
            setModalVisible(true); // Open player options modal

          }}
        >
          <Image
            source={{ uri: `https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg` }}
            style={styles.playerImage}
          />
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{`${player.first_name} ${player.last_name}`}</Text>
            <View style={styles.row}>
              <View style={styles.amountContainer}>
                <Text style={styles.playerAmount}>
                  {`$${player.amount}`}
                </Text>
              </View>
              <View style={styles.contractInfoContainer}>
                {player.taxi && (
                  <View style={styles.row}>
                    <Ionicons name="car-outline" size={16} color="#fff" style={styles.iconOffset} />
                  </View>
                )}
                {player.extension_contract_length && (
                  <View style={styles.row}>
                    <Ionicons name="add-circle-outline" size={16} color="#fff" style={styles.iconOffset} />
                    <Text style={styles.icon}>{` ${player.extension_contract_length} `}</Text>
                  </View>
                )}
                {player.rfa_contract_length && (
                  <View style={styles.row}>
                    <Ionicons name="ribbon-outline" size={16} color="#fff" style={styles.iconOffset} />
                    <Text style={styles.icon}>{` ${player.rfa_contract_length} `}</Text>
                  </View>
                )}
                {player.amnesty && (
                  <View style={styles.row}>
                    <Ionicons name="close-circle-outline" size={16} color="#fff" style={styles.iconOffset} />
                  </View>
                )}
                {player.contract !== 0 && (
                  <View style={styles.row}>
                    <Ionicons name="document-text-outline" size={16} color="#fff" style={styles.iconOffset} />
                    <Text style={styles.icon}>{` ${player.contract} `}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ))}
      
      {/* Player Options Modal for RFA, Amnesty, Extend, and Add Contract Actions */}
      <PlayerOptionsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onRfa={handleRfaAction}
        onAmnesty={handleAmnestyAction}
        onExtend={handleExtendAction}
        onAddContract={handleAddContractAction}
        selectedPlayer={selectedPlayer}
      />

      {/* Contract Length Modal */}
      <ContractLengthModal
        visible={contractLengthModalVisible}
        onClose={() => setContractLengthModalVisible(false)}
        contractLength={contractLength}
        setContractLength={setContractLength}
        onConfirmContractLength={handleConfirmContractLength}
        selectedPlayer={selectedPlayer}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmationModalVisible}
        onClose={() => setConfirmationModalVisible(false)}
        onConfirm={handleConfirmAction}
        message={`Are you sure you want to ${confirmationType === 'AddContract' ? `add a ${contractLength} year contract to ${selectedPlayer.first_name} ${selectedPlayer.last_name}? This cannot be undone` : `${confirmationType === 'RFA' ? 'add this player as an RFA?' : confirmationType === 'Amnesty' ? 'apply amnesty?' : 'extend the player\'s contract?'} This cannot be undone`}`}
      />
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
    textAlign: 'left',
  },
  icon: {
    fontSize: 14,
    color: 'white',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconOffset: {
    marginRight: 5,
  },
  amountContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  contractInfoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default MyTeamScreen;
