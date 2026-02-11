import React, { useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet, Image, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../constants';
import { useAppContext } from '../context/AppContext';
import Screen from '../components/Screen';
import CapBar from '../components/CapBar';
import PlayerCard from '../components/PlayerCard';
import { useTheme } from '../styles/theme';

const apiUrl = (path) => `${API_BASE_URL}${path}`;

const TeamsScreen = () => {
  const { rostersData, leagueInfo, selectedLeagueId, userId } = useAppContext();
  const theme = useTheme();
  const styles = getStyles(theme);
  const data = rostersData || [];
  const isOwner = data.find(t => t.owner_id === userId)?.is_owner;
  const leagueData = leagueInfo;
  const leagueId = selectedLeagueId;

  const [expandedTeam, setExpandedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);


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
    // Sort players by position
    const sortedPlayers = team.players.slice().sort((a, b) => {
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
              <View>
                <Text style={styles.teamName}>{team.display_name}</Text>
                <Text style={styles.teamMeta}>${team.total_amount} cap used</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center'}}>
              {team.rfa_left > 0 && (
                <Ionicons name="ribbon-outline" size={18} color={theme.colors.text} style={styles.iconOffset} /> // RFA Icon
              )}
              {team.extension_left > 0 && (
                <Ionicons name="add-circle-outline" size={18} color={theme.colors.text} style={styles.iconOffset} /> // Extension Icon
              )}
              {team.amnesty_left > 0 && (
                <Ionicons name="close-circle-outline" size={18} color={theme.colors.text} style={styles.iconOffset} /> // Amnesty Icon
              )}
              <Text style={styles.teamAmount}>{`   $${team.total_amount}`}</Text>
              <Ionicons
                name={expandedTeam === team ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={24}
                color={theme.colors.text}
                style={{marginRight: 5}}
              />
            </View>
          </TouchableOpacity>
          {expandedTeam === team && (
            <View style={styles.teamCap}>
              <CapBar total={Number(team.total_amount || 0)} limit={260} />
            </View>
          )}
          {expandedTeam === team && (
            <View style={styles.playersContainer}>
              {sortedPlayers.map((player) => (
                <TouchableOpacity
                  key={player.player_id}
                  onPress={() => isOwner && openPlayerModal(player)}
                  style={styles.playerWrapper}
                >
                  <PlayerCard player={player} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      );
  };

  return (
    <Screen scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>League Teams</Text>
        <Text style={styles.subtitle}>Tap a team to view full rosters.</Text>
      </View>

      {data.map((team) => renderTeam({ item: team }))}

      {selectedPlayer && (
        <Modal
          transparent={true}
          visible={isModalVisible}
          onRequestClose={closePlayerModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>{`Manage ${selectedPlayer.first_name} ${selectedPlayer.last_name}`}</Text>

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
    </Screen>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    scrollContent: {
      paddingBottom: theme.spacing.xxl,
      gap: theme.spacing.sm,
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
    teamContainer: {
      ...theme.card,
      marginVertical: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
    },
    teamHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginLeft: theme.spacing.sm,
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
    playerWrapper: {
      marginVertical: theme.spacing.xs,
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
      backgroundColor: theme.colors.card,
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      width: '85%',
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
    modalSubtitle: {
      color: theme.colors.text,
      fontSize: 16,
      marginBottom: 10,
      fontFamily: theme.typography.body.fontFamily,
    },
    actionTitle: {
      color: theme.colors.text,
      fontSize: 16,
      marginTop: 10,
      marginBottom: 5,
      fontFamily: theme.typography.body.fontFamily,
    },
    modalButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 10,
      borderRadius: theme.radii.pill,
      width: '80%',
      alignItems: 'center',
      marginVertical: 10,
    },
    modalButtonText: {
      color: theme.colors.accentText,
      fontSize: 16,
      fontFamily: theme.typography.body.fontFamily,
    },
    closeButtonText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      marginTop: 10,
      fontFamily: theme.typography.small.fontFamily,
    },
    teamName: {
      fontSize: 18,
      color: theme.colors.text,
      fontFamily: theme.typography.body.fontFamily,
    },
    teamMeta: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontFamily: theme.typography.small.fontFamily,
    },
    teamAmount: {
      color: theme.colors.text,
      marginRight: 10,
      fontFamily: theme.typography.small.fontFamily,
    },
    teamCap: {
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
  });

export default TeamsScreen;
