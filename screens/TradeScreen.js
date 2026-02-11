import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  Modal,
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import Screen from '../components/Screen';
import { useTheme } from '../styles/theme';
import { API_BASE_URL } from '../constants';

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
  const theme = useTheme();
  const styles = getStyles(theme);
  const selectedTone = 'rgba(16, 185, 129, 0.18)';
  const contractThreeTone = 'rgba(245, 158, 11, 0.18)';
  const contractTwoTone = 'rgba(59, 130, 246, 0.18)';

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
        <Text style={styles.dropdownLabel}>
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
                <Text style={styles.teamItemText}>{item.display_name}</Text>
              </Pressable>
            )}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            style={{ maxHeight: 300 }}
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
                      ? selectedTone
                      : player.contract === '3'
                      ? contractThreeTone
                      : player.contract === '2'
                      ? contractTwoTone
                      : theme.colors.surfaceAlt,
                },
              ]}
              onPress={() => selectPlayer(player)}
            >
              <Image
                source={{
                  uri: `${API_BASE_URL}/player-image/${player.player_id}`,
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
  const { rostersData } = useAppContext();
  const theme = useTheme();
  const styles = getStyles(theme);
  const playerData = rostersData || [];

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
    // trade check
    if (selectedTeam1 && selectedTeam2) {
      const totalAfterTrade1 = selectedTeam1.total_amount - calculateTotalAmount(selectedPlayers1) + calculateTotalAmount(selectedPlayers2);
      const totalAfterTrade2 = selectedTeam2.total_amount - calculateTotalAmount(selectedPlayers2) + calculateTotalAmount(selectedPlayers1);

      if (totalAfterTrade1 <= 260 && totalAfterTrade2 <= 260) {
        // trade successful
        setTradeResult('Trade successful');
        setTotalAfterTrade1(totalAfterTrade1)
        setTotalAfterTrade2(totalAfterTrade2)
      } else {
        // trade unsuccessful
        setTradeResult('Trade unsuccessful');
        setTotalAfterTrade1(totalAfterTrade1)
        setTotalAfterTrade2(totalAfterTrade2)
      }
      setIsModalVisible(true);
    } else {
      // Please select two teams before checking trade.
    }
  };

  const calculateTotalAmount = (players) => {
    return players.reduce((total, player) => total + parseFloat(player.amount), 0);
  };

  return (
    <Screen scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Trade Analyzer</Text>
        <Text style={styles.subtitle}>Select two teams and compare cap impact.</Text>
      </View>

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
                  <Ionicons name="checkmark-circle" size={30} color={theme.colors.success} />
                ) : (
                  <Ionicons name="sad" size={30} color={theme.colors.danger} />
                )}
                <Text style={styles.resultTitle}>{tradeResult}</Text>
                <Text style={styles.resultSubtitle}>Teams Total Before and After Trade</Text>
                {selectedTeam1 && selectedTeam2 && (
                  <View style={styles.resultRow}>
                    <View style={styles.resultTeam}>
                      <Text style={styles.resultTeamName}>{selectedTeam1.display_name}</Text>
                      <Text style={styles.resultTeamAmount}>${selectedTeam1.total_amount} | ${totalAfterTrade1}</Text>
                    </View>
                    <View style={styles.resultTeam}>
                      <Text style={styles.resultTeamName}>{selectedTeam2.display_name}</Text>
                      <Text style={styles.resultTeamAmount}>${selectedTeam2.total_amount} | ${totalAfterTrade2}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.selectedPlayersContainer}>
                  <View style={styles.selectedPlayerColumn}>
                    <Text numberOfLines={1} style={styles.selectedPlayerHeader}>{selectedTeam1.display_name} gets:</Text>
                    {selectedPlayers2.map((player) => (
                      <View key={player.player_id} style={styles.selectedPlayerCard}>
                        <Image
                          source={{ uri: `${API_BASE_URL}/player-image/${player.player_id}` }}
                          style={styles.playerImage}
                        />
                        <Text numberOfLines={1} style={styles.selectedPlayer}>
                          {player.first_name} {player.last_name}
                        </Text>
                        <Text style={styles.selectedPlayer}>${player.amount}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.selectedPlayerColumn}>
                    <Text numberOfLines={1} style={styles.selectedPlayerHeader}>{selectedTeam2.display_name} gets:</Text>
                    {selectedPlayers1.map((player) => (
                      <View key={player.player_id} style={styles.selectedPlayerCard}>
                        <Image
                          source={{ uri: `${API_BASE_URL}/player-image/${player.player_id}` }}
                          style={styles.playerImage}
                        />
                        <Text numberOfLines={1} style={styles.selectedPlayer}>
                          {player.first_name} {player.last_name}
                        </Text>
                        <Text style={styles.selectedPlayer}>${player.amount}</Text>
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
    </Screen>
  );
};

const getStyles = (theme) => StyleSheet.create({
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
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.lg, 
    width: '100%',
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
    padding: theme.spacing.xs,
    margin: theme.spacing.xs,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  playerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    margin: 5,
  },
  buttonContainer: {
    marginVertical: 10,
    width: '60%',
    alignSelf: 'center',
  },
  resultContainer: {
    alignItems: 'center',
    marginVertical: 10,
    flex: 1
  },
  dropdownContainer: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    padding: 10,
    backgroundColor: theme.colors.surface,
  },
  teamItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
    padding: 10,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceAlt
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1, // Allows the player name and amount to take up available space
  },
  playerName: {
    marginLeft: 10,
    color: theme.colors.text,
    fontSize: 15,
    fontFamily: theme.typography.body.fontFamily,
  },
  playerAmount: {
    color: theme.colors.text,
    alignContent: 'flex-end',
    marginRight: 30,
    fontFamily: theme.typography.small.fontFamily,
  },
  modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    },
  modalContent: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    width: '90%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  closeButton: {
    marginTop: 10,
    backgroundColor: theme.colors.accent,
    padding: 10,
    borderRadius: theme.radii.pill,
    width: '100%',
  },
    closeButtonText: {
      color: theme.colors.accentText,
      textAlign: 'center',
      fontSize: 16,
      fontFamily: theme.typography.body.fontFamily,
    },
  selectedPlayersContainer: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    marginTop: theme.spacing.sm,
  },
  selectedPlayerColumn: {
    alignItems: 'center',
    width: '48%',
    // Adjust the width to leave space between the columns
  },
  selectedPlayerCard: {
    alignItems: 'center',
    marginVertical: 5,
    padding: theme.spacing.xs,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
    selectedPlayer: {
      color: theme.colors.text,
      fontSize: 15,
      marginTop: 5,
      fontFamily: theme.typography.small.fontFamily,
    },
  dropdownLabel: {
    fontSize: 18,
    color: theme.colors.text,
    fontFamily: theme.typography.title.fontFamily,
  },
    teamItemText: {
      fontSize: 16,
      color: theme.colors.text,
      fontFamily: theme.typography.body.fontFamily,
    },
  resultTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.title.fontFamily,
  },
    resultSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 15,
      marginTop: 10,
      fontFamily: theme.typography.small.fontFamily,
    },
    resultTeamName: {
      color: theme.colors.text,
      fontSize: 15,
      fontFamily: theme.typography.body.fontFamily,
    },
    resultTeamAmount: {
      color: theme.colors.textMuted,
      fontSize: 15,
      fontFamily: theme.typography.small.fontFamily,
    },
  selectedPlayerHeader: {
    color: theme.colors.text,
    fontSize: 15,
    fontFamily: theme.typography.body.fontFamily,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  resultTeam: {
    alignItems: 'center',
    flex: 1,
  },
});

export default TradeScreen;
