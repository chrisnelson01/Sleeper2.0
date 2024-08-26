import React from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LeagueListScreen = ({ leagues, onSelectLeague }) => {
  const renderLeague = ({ item }) => (
    <TouchableOpacity style={styles.leagueContainer} onPress={() => onSelectLeague(item.league_id)}>
      <View style={styles.leagueInfo}>
        <Text style={styles.leagueName}>{item.name}</Text>
        <Ionicons name="chevron-forward-outline" size={24} color="white" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select a League</Text>
      <FlatList
        data={leagues}
        keyExtractor={(item) => item.league_id}
        renderItem={renderLeague}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181c28',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  listContainer: {
    paddingHorizontal: 10,
  },
  leagueContainer: {
    backgroundColor: '#293142',
    borderWidth: 1,
    borderColor: 'white',
    marginVertical: 5,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leagueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  leagueName: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default LeagueListScreen;
