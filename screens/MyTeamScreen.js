import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Alert } from 'react-native';
import PlayerOptionsModal from '../components/PlayerOptionsModal'; 
import ContractLengthModal from '../components/ContractLengthModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { API_BASE_URL } from '../constants';
import { useAppContext } from '../context/AppContext';
import Screen from '../components/Screen';
import CapBar from '../components/CapBar';
import PlayerCard from '../components/PlayerCard';
import { useTheme } from '../styles/theme';

const positionOrder = {
  QB: 1,
  RB: 2,
  WR: 3,
  TE: 4
};

const MyTeamScreen = ({ route, navigation }) => {
  const { rostersData, selectedTeam, leagueInfo, selectedLeagueId, userId, fetchSelectedRosterData, fetchRostersData } = useAppContext();
  const theme = useTheme();
  const styles = getStyles(theme);
  // Route params for backward compatibility
  const routeTeam = route?.params?.team;
  const routeLeagueId = route?.params?.leagueId;
  const routeLeagueData = route?.params?.leagueData;

  const leagueId = selectedLeagueId || routeLeagueId;
  const leagueData = leagueInfo || routeLeagueData;

  // Ensure selected team is fetched when IDs become available
  useEffect(() => {
    const lid = leagueId;
    if ((!routeTeam && !selectedTeam) && lid && userId) {
      // fetch selected team independently
      fetchSelectedRosterData(lid, userId).catch(() => {
        // fallback to legacy fetch that also populates rostersData
        fetchRostersData(lid, userId);
      });
    }
  }, [leagueId, userId, routeTeam, selectedTeam, fetchSelectedRosterData, fetchRostersData]);

  // Prefer route-provided team (legacy) -> selectedTeam (new) -> rostersData lookup
  const team = routeTeam || selectedTeam || rostersData?.find(t => String(t.owner_id) === String(userId));

  // If team isn't ready, show selected IDs (per your requirement)
  if (!team) {
    return (
      <View style={styles.container}>
        <Text style={styles.debugText}>Selected League ID: {selectedLeagueId || 'N/A'}</Text>
        <Text style={styles.debugText}>Selected User ID: {userId || 'N/A'}</Text>
      </View>
    );
  }

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
    setModalVisible(false);
    setContractLength('');
    setContractLengthModalVisible(true);
  };

  const handleConfirmContractLength = () => {
    setContractLengthModalVisible(false);
    setConfirmationType('AddContract');
    setConfirmationModalVisible(true);
  };

  const handleConfirmAction = async () => {
    setConfirmationModalVisible(false);
    try {
      let endpoint;
      let body;

      if (confirmationType === 'RFA') {
        endpoint = `${API_BASE_URL}/rfa`;
        body = JSON.stringify({
          league_id: leagueId,
          player_id: selectedPlayer.player_id,
          team_id: team.owner_id,
          contract_length: leagueData['rfa_length'],
          season: leagueData['current_season']
        });
        Alert.alert('RFA Added', `${selectedPlayer.first_name} ${selectedPlayer.last_name} added as RFA.`);
      } else if (confirmationType === 'Amnesty') {
        endpoint = `${API_BASE_URL}/amnesty`;
        body = JSON.stringify({
          league_id: leagueId,
          player_id: selectedPlayer.player_id,
          team_id: team.owner_id,
          season: leagueData['current_season']
        });
        Alert.alert('Amnesty Applied', `${selectedPlayer.first_name} ${selectedPlayer.last_name} was amnestied.`);
      } else if (confirmationType === 'Extend') {
        endpoint = `${API_BASE_URL}/extensions`;
        body = JSON.stringify({
          league_id: leagueId,
          player_id: selectedPlayer.player_id,
          contract_length: leagueData['extension_length'],
          team_id: team.owner_id,
          season: leagueData['current_season']
        });
        Alert.alert('Player Extended', `${selectedPlayer.first_name} ${selectedPlayer.last_name} extended.`);
      } else if (confirmationType === 'AddContract') {
        endpoint = `${API_BASE_URL}/contracts`;
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
        // If legacy caller passed a fetch function in route params, call it
        if (route?.params?.fetchLeagueData) {
          try {
            await route.params.fetchLeagueData(leagueId, team.owner_id);
          } catch (e) {
            // ignore and fall through to context refresh
          }
        }
        // Refresh selected team and rosters via context
        await fetchSelectedRosterData(leagueId, team.owner_id).catch(() => {});
        await fetchRostersData(leagueId, team.owner_id).catch(() => {});
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An error occurred while processing the request.');
    }

    navigation.replace('MyTeam');
    setModalVisible(false);
    setConfirmationType(null);
  };

  // Sorting function
  const sortedPlayers = (team.players || []).slice().sort((a, b) => {
    const aRank = positionOrder[a.position] ?? 999;
    const bRank = positionOrder[b.position] ?? 999;
    if (aRank !== bRank) return aRank - bRank;
    return String(a.position || '').localeCompare(String(b.position || ''));
  });

  // Single structured debug log for selected team source and parsed players
  if (process.env.NODE_ENV !== 'production') {
    console.info('MyTeamScreen - selected team source:', selectedTeam ? 'selectedTeam endpoint' : 'rostersData');
    console.info('MyTeamScreen - owner_id:', team.owner_id, 'display_name:', team.display_name, 'player_count:', team.players?.length);
    console.info('MyTeamScreen - first three parsed players:', team.players?.slice(0,3).map(p => `${p.first_name} ${p.last_name}`));
  }

  const capLimit = 260;
  const totalCap = Number(team.total_amount || 0);

  return (
    <Screen scroll contentContainerStyle={styles.containerContent}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          {team.avatar && (
            <Image source={{ uri: `https://sleepercdn.com/avatars/thumbs/${team.avatar}` }} style={styles.avatarImage} />
          )}
          <View style={styles.headerText}>
            <Text style={styles.title}>{team.display_name}</Text>
            <Text style={styles.subtitle}>My team overview</Text>
          </View>
        </View>
        <CapBar total={totalCap} limit={capLimit} />
      </View>

      {sortedPlayers.map((player) => (
        <PlayerCard
          key={player.player_id}
          player={player}
          onPress={() => {
            setSelectedPlayer(player);
            setModalVisible(true);
          }}
        />
      ))}
      
      <PlayerOptionsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onRfa={handleRfaAction}
        onAmnesty={handleAmnestyAction}
        onExtend={handleExtendAction}
        onAddContract={handleAddContractAction}
        selectedPlayer={selectedPlayer}
      />

      <ContractLengthModal
        visible={contractLengthModalVisible}
        onClose={() => setContractLengthModalVisible(false)}
        contractLength={contractLength}
        setContractLength={setContractLength}
        onConfirmContractLength={handleConfirmContractLength}
        selectedPlayer={selectedPlayer}
      />

      <ConfirmationModal
        visible={confirmationModalVisible}
        onClose={() => setConfirmationModalVisible(false)}
        onConfirm={handleConfirmAction}
        message={`Are you sure you want to ${confirmationType === 'AddContract' ? `add a ${contractLength} year contract to ${selectedPlayer.first_name} ${selectedPlayer.last_name}? This cannot be undone` : `${confirmationType === 'RFA' ? 'add this player as an RFA?' : confirmationType === 'Amnesty' ? 'apply amnesty?' : 'extend the player\'s contract?'} This cannot be undone`}`}
      />
    </Screen>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    containerContent: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      flexGrow: 1,
      gap: theme.spacing.sm,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
    },
    headerCard: {
      ...theme.card,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    headerText: {
      flex: 1,
    },
    avatarImage: {
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    title: {
      fontSize: 26,
      color: theme.colors.text,
      fontFamily: theme.typography.heading.fontFamily,
    },
    subtitle: {
      marginTop: theme.spacing.xs,
      color: theme.colors.textMuted,
      fontFamily: theme.typography.subtitle.fontFamily,
    },
    errorText: {
      color: '#B23A3A',
      fontSize: 16,
      textAlign: 'center',
      fontFamily: theme.typography.body.fontFamily,
    },
    debugText: {
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
      fontFamily: theme.typography.small.fontFamily,
    },
  });

export default MyTeamScreen;
