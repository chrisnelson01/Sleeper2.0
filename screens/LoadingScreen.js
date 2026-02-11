import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Screen from '../components/Screen';
import { useTheme } from '../styles/theme';

const LoadingScreen = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <Screen contentContainerStyle={styles.content}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
      <Text style={styles.loadingText}>Loading...</Text>
    </Screen>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    loadingText: {
      marginTop: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
      fontFamily: theme.typography.body.fontFamily,
    },
  });

export default LoadingScreen;
