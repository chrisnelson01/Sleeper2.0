import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from '@expo/vector-icons';

export default function NavBar({ navigation, route }) {
  const handleIconPress = (screenName) => {
    navigation.navigate(screenName);
  };

  return (
    <View style={styles.container}>
      <Ionicons
        name="person"
        onPress={() => handleIconPress('MyTeam')}
        color={route.name === 'MyTeam' ? 'white' : 'grey'}
        size={30}
      />
      <Ionicons
        name="people"
        onPress={() => handleIconPress('Teams')}
        color={route.name === 'Teams' ? 'white' : 'grey'}
        size={30}
      />
      <Ionicons
        name="podium"
        onPress={() => handleIconPress('Future')}
        color={route.name === 'Future' ? 'white' : 'grey'}
        size={28}
      />
      <Ionicons
        name="create"
        onPress={() => handleIconPress('Contracts')}
        color={route.name === 'Contracts' ? 'white' : 'grey'}
        size={30}
      />
      <Ionicons
        name="person-add"
        onPress={() => handleIconPress('Trade')}
        color={route.name === 'Trade' ? 'white' : 'grey'}
        size={30}
      />
      {/* New Settings Icon */}
      <Ionicons
        name="settings"
        onPress={() => handleIconPress('Settings')}
        color={route.name === 'Settings' ? 'white' : 'grey'}
        size={30}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#293142',
    width: '100%',
  },
});
