import React, { useState } from 'react';
import { ScrollView, Text, FlatList, TouchableOpacity, View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TeamsScreen = ({ route }) => {
  const { data } = route.params;

  const [expandedTeam, setExpandedTeam] = useState(null);

  // Toggle expansion state for a team
  const toggleTeamExpansion = (teamId) => {
    setExpandedTeam((prevTeam) => (prevTeam === teamId ? null : teamId));
  };

  // Render a team with expandable players
  const renderTeam = ({ item: team }) => (
    <View style={styles.teamContainer}>
      <TouchableOpacity
        onPress={() => toggleTeamExpansion(team.owner_id)}
        style={styles.teamHeader}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>{team.display_name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center'}}>
        <Text style={{ color: 'white' , marginRight: 10}}>{`$${team.total_amount}`}</Text>
        <Ionicons
          name={expandedTeam === team.owner_id ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={24}
          color="white"
        />
        </View>
      </TouchableOpacity>
      {expandedTeam === team.owner_id && (
        <View style={styles.playersContainer}>
          {team.players.map((player) => (
            <TouchableOpacity
              key={player.player_id}
              onPress={() => {
                // Handle press action
                console.log(`${player.first_name} ${player.last_name} pressed`);
              }}
              style={[
                styles.playerBox,
                {
                  backgroundColor:
                    player.contract === '3' ? '#626e42' : // Adjust color for 3-year contract
                    player.contract === '2' ? '#4a5f82' : '#293142', // Adjust color for 2-year contract
                },
              ]}
            >
              <Image
                source={{ uri: `https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg` }}
                style={styles.playerImage}
              />
              <Text numberOfLines={1} style={{ justifyContent: 'center', color: 'white' }}>{`${player.first_name} ${player.last_name}`}</Text>
              <Text style={{ justifyContent: 'center', color: 'white' }}>{`$${player.amount}`}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      data={data}
      keyExtractor={(team) => team.owner_id}
      renderItem={renderTeam}
      contentContainerStyle={{ padding: 10 }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#181c28',
  },
  teamContainer: {
    backgroundColor: '#293142',
    borderWidth: 1,
    borderColor: 'white',
    marginVertical: 5,
    padding: 10,
    borderRadius: 10, // Rounded corners for teams
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Adjust as needed
  },
  playerBox: {
    flexBasis: '100px', // Adjust as needed
    alignItems: 'center',
    textAlign: 'center',
    padding: 2,
    margin: 1,
    borderRadius: 8, // Rounded corners for players
  },
  playerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 5,
  },
});

export default TeamsScreen;
