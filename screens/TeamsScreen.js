import React, { useState, useEffect } from 'react';
import { ScrollView, Text, FlatList, TouchableOpacity, View, StyleSheet, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';

const TeamsScreen = ({ route }) => {
  const { data } = route.params;
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [playerBoxWidth, setPlayerBoxWidth] = useState(0);

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

  const toggleTeamExpansion = (teamId) => {
    setExpandedTeam((prevTeam) => (prevTeam === teamId ? null : teamId));
  };

  const renderTeam = ({ item: team }) => {
    // Construct avatar URL using the avatar hash
    const avatarUrl = team.avatar
      ? `https://sleepercdn.com/avatars/thumbs/${team.avatar}`
      : null; // Fallback if no avatar is present

    return (
      <View style={styles.teamContainer}>
        <TouchableOpacity
          onPress={() => toggleTeamExpansion(team.owner_id)}
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
              name={expandedTeam === team.owner_id ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={24}
              color="white"
              style={{marginRight: 5}}
            />
          </View>
        </TouchableOpacity>
        {expandedTeam === team.owner_id && (
          <View style={styles.playersContainer}>
            {team.players.map((player) => (
              <TouchableOpacity
                key={player.player_id}
                onPress={() => {
                  console.log(`${player.first_name} ${player.last_name} pressed`);
                }}
                style={[
                  styles.playerBox,
                  {
                    backgroundColor:
                      player.contract >>> 0 ? '#395585' : '#293142',
                  },
                ]}
              >
                <Image
                  source={{ uri: `https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg` }}
                  style={styles.playerImage}
                />
                <View style={styles.playerInfo}>
                    <Text numberOfLines={1} style={styles.playerName}>{`${player.first_name} ${player.last_name}`}</Text>
                    <View style={styles.row}>
                        {player.contract !== 0 && (
                          <View style={styles.row}>
                            <Ionicons name="document-text-outline" size={16} color="#fff" style={styles.iconOffset} /> {/* Contract Icon */}
                            <Text style={{color: 'white'}}>
                              {`${player.contract}  `}
                            </Text>
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

                        <Text style={styles.playerAmount}>{`$${player.amount}`}</Text>
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
    margin: 5,
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
    marginRight: 15
  },
  row: {
    flexDirection: 'row',
    alignContent: 'flex-end', // Aligns items horizontally
    // Vertically centers items
  },
  iconOffset: {
    marginLeft: 5, // Adds space between the icon and text
    paddingTop: 2, // Nudges the icon down slightly to align with text
  },
});

export default TeamsScreen;
