import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity } from 'react-native';

const UsernameInputScreen = ({ onUsernameSubmit }) => {
  const [input, setInput] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Sleeper Username</Text>
      <TextInput 
        placeholder="Enter Username" 
        value={input} 
        onChangeText={setInput}
        placeholderTextColor="gray"
        style={styles.input}
      />
      <TouchableOpacity style={styles.button} onPress={() => onUsernameSubmit(input)}>
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181c28',
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderColor: '#4a5f82',
    borderWidth: 1,
    borderRadius: 8,
    width: '80%',
    marginBottom: 20,
    paddingHorizontal: 15,
    color: 'white',
    backgroundColor: '#293142',
    fontSize: 18,
  },
  button: {
    backgroundColor: '#4a5f82',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default UsernameInputScreen;
