import React, { useState, useEffect } from 'react';
import { ScrollView, Text, FlatList, TouchableOpacity, View, StyleSheet, Image, Dimensions, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../constants';
const apiUrl = (path) => `${API_BASE_URL}${path}`;

const TeamsScreen = ({ route }) => {
  const { data, isOwner,leagueData, leagueId } = route.params;
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [playerBoxWidth, setPlayerBoxWidth] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const updatePlayerBoxWidth = () => {
      const screenWidth = Dimensions.get('window').width;
      const playersPerRow = 4;
      const padding = 5;
      const containerWidth = screenWidth - 2 * padding;
      const calculatedWidth = containerWidth / playersPerRow;
      setPlayerBoxWidth(calculatedWidth);
    };

    // Initial setup
    updatePlayerBoxWidth();

    // Update width when the window size changes
    Dimensions.addEventListener('change', updatePlayerBoxWidth);

    // Cleanup listener when the component is unmounted
    return () => {
      Dimensions.removeEventListener('change', updatePlayerBoxWidth);
    };
  }, []);

  const toggleTeamExpansion = (team) => {
    setExpandedTeam((prevTeam) => (prevTeam === team ? null : team));
  };

  const openPlayerModal = (player) => {
    setSelectedPlayer(player);
    setIsModalVisible(true);
  };

  const closePlayerModal = () => {
    setSelectedPlayer(null);
    setIsModalVisible(false);
  };

  const makeApiCall = async (url, method, payload) => {
    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'An error occurred');
      }
      return result;
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAmnestyRemoval = async (team) => {
    if (selectedPlayer.amnesty) {
      const payload = {
        league_id: leagueId,
        player_id: selectedPlayer.player_id,
        team_id: team.owner_id,
      };
      const result = await makeApiCall(apiUrl('/amnesty'), 'DELETE', payload);

      if (result) {
        delete selectedPlayer.amnesty;
        team.amnesty_left += 1;
        Alert.alert('Amnesty Removed', `${selectedPlayer.first_name} ${selectedPlayer.last_name} amnesty removed.`);
        closePlayerModal();
      }
    }
  };

  const handleAmnestyAddition = async (team) => {
    
    if (!selectedPlayer.amnesty && team.amnesty_left > 0) {
      const payload = {
        league_id: leagueId,
        player_id: selectedPlayer.player_id,
        team_id: team.owner_id,
      };
      const result = await makeApiCall(apiUrl('/amnesty'), 'POST', payload);

      if (result) {
        selectedPlayer.amnesty = true;
        team.amnesty_left -= 1;
        Alert.alert('Amnesty Added', `${selectedPlayer.first_name} ${selectedPlayer.last_name} amnesty added.`);
        closePlayerModal();
      }
    }
  };

  const handleRfaRemoval = async (team) => {
    if (selectedPlayer.rfa_contract_length) {
      const payload = {
        league_id: leagueId,
        player_id: selectedPlayer.player_id,
        team_id: team.owner_id,
      };
      const result = await makeApiCall(apiUrl('/rfa'), 'DELETE', payload);

      if (result) {
        delete selectedPlayer.rfa_contract_length
        team.rfa_left += 1;
        Alert.alert('RFA Removed', `${selectedPlayer.first_name} ${selectedPlayer.last_name} RFA removed.`);
        closePlayerModal();
      }
    }
  };

  const handleRfaAddition = async (team) => {
    if (!selectedPlayer.rfa_contract_length && team.rfa_left > 0) {
      const payload = {
        league_id: leagueId,
        player_id: selectedPlayer.player_id,
        team_id: team.owner_id,
        contract_length: leagueData['rfa_length']
      };
      const result = await makeApiCall(apiUrl('/rfa'), 'POST', payload);

      if (result) {
        selectedPlayer.rfa_contract_length = leagueData['extension_length']; // Assuming a default length of 1 for RFA
        team.rfa_left -= 1;
        Alert.alert('RFA Added', `${selectedPlayer.first_name} ${selectedPlayer.last_name} RFA added.`);
        closePlayerModal();
      }
    }
  };

  const handleExtensionRemoval = async (team) => {
    if (selectedPlayer.extension_contract_length) {
      const payload = {
        league_id: leagueId,
        player_id: selectedPlayer.player_id,
        team_id: team.owner_id,
      };
      const result = await makeApiCall(apiUrl('/extension'), 'DELETE', payload);

      if (result) {
        delete selectedPlayer.extension_contract_length
        team.extension_left += 1;
        Alert.alert('Extension Removed', `${selectedPlayer.first_name} ${selectedPlayer.last_name} extension removed.`);
        closePlayerModal();
      }
    }
  };

  const handleExtensionAddition = async (team) => {
    if (!selectedPlayer.extension_contract_length && team.extension_left > 0) {
      const payload = {
        league_id: leagueId,
        player_id: selectedPlayer.player_id,
        team_id: team.owner_id,
        contract_length: leagueData['extension_length']
      };
      const result = await makeApiCall(apiUrl('/extension'), 'POST', payload);

      if (result) {
        selectedPlayer.extension_contract_length = leagueData['extension_length'];
        team.extension_left -= 1;
        Alert.alert('Extension Added', `${selectedPlayer.first_name} ${selectedPlayer.last_name} extension added.`);
        closePlayerModal();
      }
    }
  };

  const renderTeam = ({ item: team }) => {
    const avatarUrl = team.avatar
      ? `https://sleepercdn.com/avatars/thumbs/${team.avatar}`
      : null;
    const getPositionColor = (position) => {
        switch (position) {
          case 'QB':
            return '#FF4C4C';
          case 'RB':
            return '#4CAF50';
          case 'WR':
            return '#2196F3';
          case 'TE':
            return '#FF9800';
          default:
            return 'grey'; // Default color for undefined positions
        }
      };
        // Sort players by position
    const sortedPlayers = team.players.sort((a, b) => {
      const positionOrder = ['QB', 'RB', 'WR', 'TE'];
      return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position);
    });
    return (
        <View style={styles.teamContainer}>
          <TouchableOpacity
            onPress={() => toggleTeamExpansion(team)}
            style={styles.teamHeader}
          >
            <View style={styles.teamInfo}>
              {avatarUrl && (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                />
              )}
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>{team.display_name}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center'}}>
              {team.rfa_left > 0 && (
                <Ionicons name="ribbon-outline" size={18} color="#fff" style={styles.iconOffset} /> // RFA Icon
              )}
              {team.extension_left > 0 && (
                <Ionicons name="add-circle-outline" size={18} color="#fff" style={styles.iconOffset} /> // Extension Icon
              )}
              {team.amnesty_left > 0 && (
                <Ionicons name="close-circle-outline" size={18} color="#fff" style={styles.iconOffset} /> // Amnesty Icon
              )}
              <Text style={{ color: 'white' , marginRight: 10}}>{`   $${team.total_amount}`}</Text>
              <Ionicons
                name={expandedTeam === team ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={24}
                color="white"
                style={{marginRight: 5}}
              />
            </View>
          </TouchableOpacity>
          {expandedTeam === team && (
            <View style={styles.playersContainer}>
              {sortedPlayers.map((player) => (
                <TouchableOpacity
                  key={player.player_id}
                  onPress={() => isOwner && openPlayerModal(player)}
                  style={[
                    styles.playerBox,
                    {
                      backgroundColor: '#264b63',
                    },
                  ]}
                >
                  <Image
                    source={{ uri: `https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg` }}
                    style={styles.playerImage}
                  />
                  <View style={styles.playerInfo}>
                    <View style={styles.amountContainer}>
                      <View style={[styles.positionBox, { backgroundColor: getPositionColor(player.position) }]}>
                        <Text style={styles.positionText}>{player.position}</Text>
                      </View>
                      <Text numberOfLines={1} style={styles.playerName}>{`${player.first_name} ${player.last_name}`}</Text>
                    </View>
                    <View style={styles.row}>
                      {player.taxi && (
                        <View style={styles.row}>
                          <Ionicons name="car-outline" size={18} color="#fff" style={styles.iconOffset} /> {/* Taxi Icon */}
                        </View>
                      )}
                      {player.extension_contract_length && (
                        <View style={styles.row}>
                          <Ionicons name="add-circle-outline" size={16} color="#fff" style={styles.iconOffset} /> {/* Extension Icon */}
                          <Text style={{color: 'white'}}>
                            {`${player.extension_contract_length}  `}
                          </Text>
                        </View>
                      )}

                      {player.rfa_contract_length && (
                        <View style={styles.row}>
                          <Ionicons name="ribbon-outline" size={16} color="#fff" style={styles.iconOffset} /> {/* RFA Icon */}
                          <Text style={{color: 'white'}}>
                            {`${player.rfa_contract_length}  `}
                          </Text>
                        </View>
                      )}

                      {player.amnesty && (
                        <View style={styles.row}>
                          <Ionicons name="close-circle-outline" size={16} color="#fff" style={styles.iconOffset} /> {/* Amnesty Icon */}
                        </View>
                      )}

                      {player.contract !== 0 && (
                        <View style={styles.row}>
                          <Ionicons name="document-text-outline" size={16} color="#fff" style={styles.iconOffset} /> {/* Contract Icon */}
                          <Text style={{color: 'white'}}>
                            {`${player.contract}  `}
                          </Text>
                        </View>
                      )}
                    <View style={styles.amountContainer}>
                      <Text style={styles.playerAmount}>{`$${player.amount}`}</Text>
                    </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(team) => team.owner_id}
        renderItem={renderTeam}
        contentContainerStyle={{ padding: 10 }}
      />

      {selectedPlayer && (
        <Modal
          transparent={true}
          visible={isModalVisible}
          onRequestClose={closePlayerModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>{`Manage ${selectedPlayer.first_name} ${selectedPlayer.last_name}`}</Text>

              {/* Amnesty Actions */}
              {selectedPlayer.amnesty ? (
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => handleAmnestyRemoval(expandedTeam)}
                >
                  <Text style={styles.modalButtonText}>Remove Amnesty</Text>
                </TouchableOpacity>
              ) : (
                expandedTeam.amnesty_left > 0 && (
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => handleAmnestyAddition(expandedTeam)}
                  >
                    <Text style={styles.modalButtonText}>Add Amnesty</Text>
                  </TouchableOpacity>
                )
              )}

              {/* RFA Actions */}
              {selectedPlayer.rfa_contract_length ? (
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => handleRfaRemoval(expandedTeam)}
                >
                  <Text style={styles.modalButtonText}>Remove RFA</Text>
                </TouchableOpacity>
              ) : (
                expandedTeam.rfa_left > 0 && (
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => handleRfaAddition(expandedTeam)}
                  >
                    <Text style={styles.modalButtonText}>Add RFA</Text>
                  </TouchableOpacity>
                )
              )}

              {/* Extension Actions */}
              {selectedPlayer.extension_contract_length ? (
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => handleExtensionRemoval(expandedTeam)}
                >
                  <Text style={styles.modalButtonText}>Remove Extension</Text>
                </TouchableOpacity>
              ) : (
                expandedTeam.extension_left > 0 && (
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => handleExtensionAddition(expandedTeam)}
                  >
                    <Text style={styles.modalButtonText}>Add Extension</Text>
                  </TouchableOpacity>
                )
              )}

              <TouchableOpacity onPress={closePlayerModal}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181c28',
  },
  teamContainer: {
    backgroundColor: '#293142',
    borderWidth: 1,
    borderColor: 'white',
    marginVertical: 5,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: 10,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 10,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  playersContainer: {
    flexDirection: 'column',
    flexWrap: 'wrap',
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
    marginLeft: 5,
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
    marginRight: 15,
    minWidth: 25,
    textAlign: 'right'
  },
  row: {
    flexDirection: 'row',
    alignContent: 'flex-end', // Aligns items horizontally
    alignItems: 'center'// Vertically centers items
  },
  iconOffset: {
    marginLeft: 5, // Adds space between the icon and text
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#293142',
    padding: 20,
    borderRadius: 10,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'white',
  },
  modalSubtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 10,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
    marginBottom: 5,
    fontWeight: 'bold',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#4990e1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 10,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Align the amount text to the end of the container
  },
  positionBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  positionText: {
    color: 'white',
    fontSize: 9,
  },
});

export default TeamsScreen;
