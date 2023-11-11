import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  Button,
} from 'react-native';

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
    <View style={[styles.teamContainer, { width: selectedTeam ? '98%' : '30%' }]}>
      <Pressable onPress={toggleDropdown}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
          {selectedTeam ? selectedTeam.display_name : label}
        </Text>
      </Pressable>

      {isDropdownVisible && (
        <View>
          <FlatList
            data={playerData}
            keyExtractor={(team) => team.display_name}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  setSelectedPlayers([]);
                }}
              >
                <Text style={{ fontSize: 15, color: 'white' }}>{item.display_name}</Text>
              </Pressable>
            )}
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
                      ? '#4CAF50'
                      : player.contract === '3'
                      ? '#626e42'
                      : player.contract === '2'
                      ? '#4a5f82'
                      : '#293142',
                },
              ]}
              onPress={() => selectPlayer(player)}
            >
              <Image
                source={{
                  uri: `https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg`,
                }}
                style={styles.playerImage}
              />
              <Text numberOfLines={1} style={{ justifyContent: 'center', color: 'white' }}>
                {player.first_name} {player.last_name}
              </Text>
              <Text style={{ justifyContent: 'center', color: 'white' }}>${player.amount}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};


const TradeScreen = ({ route }) => {
  const { playerData } = route.params;

  const [isDropdownVisible1, setDropdownVisible1] = useState(false);
  const [isDropdownVisible2, setDropdownVisible2] = useState(false);
  const [selectedTeam1, setSelectedTeam1] = useState(null);
  const [selectedTeam2, setSelectedTeam2] = useState(null);
  const [selectedPlayers1, setSelectedPlayers1] = useState([]);
  const [selectedPlayers2, setSelectedPlayers2] = useState([]);
  const [tradeResult, setTradeResult] = useState(null);
  const [totalAfterTrade1, setTotalAfterTrade1] = useState(null);
  const [totalAfterTrade2, setTotalAfterTrade2] = useState(null);

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
    console.log('Checking trade...');
    if (selectedTeam1 && selectedTeam2) {
      const totalAfterTrade1 = selectedTeam1.total_amount - calculateTotalAmount(selectedPlayers1) + calculateTotalAmount(selectedPlayers2);
      const totalAfterTrade2 = selectedTeam2.total_amount - calculateTotalAmount(selectedPlayers2) + calculateTotalAmount(selectedPlayers1);

      if (totalAfterTrade1 <= 260 && totalAfterTrade2 <= 260) {
        console.log('Trade successful');
        setTradeResult('Trade successful');
        setTotalAfterTrade1(totalAfterTrade1)
        setTotalAfterTrade2(totalAfterTrade2)
      } else {
        console.log('Trade unsuccessful');
        setTradeResult('Trade unsuccessful');
        setTotalAfterTrade1(totalAfterTrade1)
        setTotalAfterTrade2(totalAfterTrade2)
      }
    } else {
      console.log('Please select two teams before checking trade.');
    }
  };

  const calculateTotalAmount = (players) => {
    return players.reduce((total, player) => total + parseFloat(player.amount), 0);
  };

  return (
    <View style={{backgroundColor: '#181c28', flex: 1, alignItems: 'center'}}>
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
          <Button title="Check Trade" onPress={checkTrade} />
        </View>
      )}

      {tradeResult && (
        <View style={styles.resultContainer}>
          {tradeResult === 'Trade successful' ? (
            <Ionicons name="checkmark-circle" size={30} color="#4CAF50" />
          ) : (
            <Ionicons name="sad" size={30} color="#FF0000" />
          )}
          <Text style={{ color: 'white' , fontWeight: 'bold'}}>{tradeResult}</Text>
          <Text style={{ color: 'white' , fontSize: 15, marginTop: 10}}>Teams Total Before and After Trade</Text>
          {selectedTeam1 && selectedTeam2 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5}}>
              <View style={{ alignItems: 'center', margin: 10}}>
                <Text style={{ color: 'white', fontSize: 15, fontWeight: 'bold'}}>{selectedTeam1.display_name}</Text>
                <Text style={{ color: 'white', fontSize: 15 }}>{selectedTeam1.total_amount} | {totalAfterTrade1}</Text>
              </View>
              <View style={{ alignItems: 'center', margin: 10}}>
                <Text style={{ color: 'white', fontSize: 15 , fontWeight: 'bold'}}>{selectedTeam2.display_name}</Text>
                <Text style={{ color: 'white', fontSize: 15 }}>{selectedTeam2.total_amount} | {totalAfterTrade2}</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  teamContainer: {
    backgroundColor: '#293142',
    borderWidth: 1,
    borderColor: 'white',
    marginVertical: 5,
    marginTop: 10,
    padding: 10,
    borderRadius: 10, // Rounded corners for teams
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
  buttonContainer: {
    marginVertical: 10,
    width: '50%', // Set the width to your desired value
  },
  resultContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
});

export default TradeScreen;
