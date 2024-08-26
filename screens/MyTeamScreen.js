import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';

const MyTeamScreen = ({ route }) => {
  const { team } = route.params; // Assuming team data is passed here

  if (!team) {
    return <Text style={styles.errorText}>Team data not found</Text>;
  }

  // Build the avatar URL using Sleeper's API (if avatar exists)
  const avatarUrl = team.avatar
    ? `https://sleepercdn.com/avatars/thumbs/${team.avatar}`
    : null; // Fallback in case there's no avatar

  return (
    <ScrollView style={styles.container}>
      <View style={styles.userContainer}>
        {avatarUrl && (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        )}
        <Text style={styles.title}>{team.display_name}</Text>
      </View>
      
      {team.players.map((player) => (
        <View
          key={player.player_id}
          style={[
            styles.playerContainer,
            {
              backgroundColor:
                player.contract === '3' ? '#626e42' :
                player.contract === '2' ? '#4a5f82' : '#293142',
            },
          ]}
        >
          <Image
            source={{ uri: `https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg` }}
            style={styles.playerImage}
          />
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{`${player.first_name} ${player.last_name}`}</Text>
            <Text style={styles.playerAmount}>{`$${player.amount} | Contract: ${player.contract} year`}</Text>
          </View>
        </View>
      ))}
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
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default MyTeamScreen;
