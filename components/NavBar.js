import React, {useState} from "react";
import { Pressable, View, StyleSheet, Text} from "react-native";
import { Ionicons } from '@expo/vector-icons';

export default function NavBar({ navigation, route }) {
  return (
    <View style={styles.container}>
      <Ionicons name="people" onPress={() => navigation.navigate('Teams')} color="white" size={30}/>
      <Ionicons name="podium" onPress={() => navigation.navigate('Future')} color="white" size={28}/>
      <Ionicons name="person-add" onPress={() => navigation.navigate('Trade')} color="white" size={30}/>
    </View>
  );
}
<Ionicons name="checkmark-circle" size={30} color="#4CAF50" />

const styles = StyleSheet.create({
    container: {
        height: 60,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#293142',
        width: '100%',
    }
})