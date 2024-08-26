import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

const LoadingScreen = () => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="white" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181c28',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default LoadingScreen;
