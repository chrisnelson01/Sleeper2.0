import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { useTheme } from '../styles/theme';

const LeagueListScreen = ({ leagues, onSelectLeague, onLogout, error }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const renderLeague = ({ item }) => (
    <TouchableOpacity style={styles.leagueContainer} onPress={() => onSelectLeague(item.league_id)}>
      <View style={styles.leagueInfo}>
        <Text style={styles.leagueName}>{item.name}</Text>
        <Ionicons name="chevron-forward-outline" size={24} color={theme.colors.text} />
      </View>
    </TouchableOpacity>
  );

  return (
    <Screen scroll contentContainerStyle={styles.listContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Your Leagues</Text>
          <Text style={styles.subtitle}>Choose a league to manage contracts.</Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && leagues.length === 0 ? (
        <Text style={styles.emptyText}>No leagues found for this user.</Text>
      ) : null}
      {leagues.map((item) => renderLeague({ item }))}
    </Screen>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    listContainer: {
      paddingBottom: theme.spacing.xxl,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: 28,
      color: theme.colors.text,
      fontFamily: theme.typography.heading.fontFamily,
    },
    subtitle: {
      marginTop: theme.spacing.xs,
      fontSize: 13,
      color: theme.colors.textMuted,
      fontFamily: theme.typography.subtitle.fontFamily,
    },
    logoutButton: {
      backgroundColor: theme.colors.surfaceAlt,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    logoutText: {
      color: theme.colors.text,
      fontSize: 12,
      fontFamily: theme.typography.body.fontFamily,
    },
    errorText: {
      color: '#B23A3A',
      marginBottom: theme.spacing.sm,
      fontFamily: theme.typography.small.fontFamily,
    },
    emptyText: {
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.sm,
      fontFamily: theme.typography.small.fontFamily,
    },
    leagueContainer: {
      ...theme.card,
      marginBottom: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
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
      color: theme.colors.text,
      fontFamily: theme.typography.body.fontFamily,
    },
  });

export default LeagueListScreen;
