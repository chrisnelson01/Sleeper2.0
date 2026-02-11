import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Pressable } from 'react-native';
import Screen from '../components/Screen';
import { useTheme } from '../styles/theme';

const UsernameInputScreen = ({ onUsernameSubmit }) => {
  const [input, setInput] = useState('');
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to Sleeper</Text>
        <Text style={styles.subtitle}>Enter your username to sync leagues and rosters.</Text>
        <TextInput
          placeholder="Sleeper username"
          value={input}
          onChangeText={setInput}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />
        <Pressable style={styles.button} onPress={() => onUsernameSubmit(input)}>
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </Screen>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    card: {
      ...theme.card,
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radii.xl,
    },
    title: {
      fontSize: 28,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      fontFamily: theme.typography.heading.fontFamily,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.lg,
      fontFamily: theme.typography.subtitle.fontFamily,
    },
    input: {
      height: 50,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.radii.lg,
      width: '100%',
      marginBottom: theme.spacing.lg,
      paddingHorizontal: 15,
      color: theme.colors.text,
      backgroundColor: theme.colors.surfaceAlt,
      fontSize: 18,
      fontFamily: theme.typography.body.fontFamily,
    },
    button: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 14,
      borderRadius: theme.radii.pill,
      alignItems: 'center',
    },
    buttonText: {
      color: theme.colors.accentText,
      fontSize: 16,
      fontFamily: theme.typography.body.fontFamily,
    },
  });

export default UsernameInputScreen;
