import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';

export default function NavBar({ navigation, route, isOwner }) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = getStyles(theme);

  const handleIconPress = (screenName) => {
    navigation.navigate(screenName);
  };

  return (
    <View style={styles.container}>
      {[
        { name: 'MyTeam', icon: 'person', label: 'My Team' },
        { name: 'Teams', icon: 'people', label: 'All Teams' },
        { name: 'Future', icon: 'podium', label: 'Cap' },
        { name: 'AllContracts', icon: 'document', label: 'Contracts' },
        { name: 'Activity', icon: 'pulse', label: 'Activity' },
        { name: 'Settings', icon: 'settings', label: 'Settings' },
      ].map((item) => {
        const isActive = route.name === item.name;
        return (
          <Pressable
            key={item.name}
            onPress={() => handleIconPress(item.name)}
            style={[styles.iconButton, isActive && styles.iconButtonActive]}
          >
            <Ionicons
              name={item.icon}
              color={isActive ? colors.accentText : colors.iconMuted}
              size={20}
            />
            <Text style={[styles.iconLabel, isActive && styles.iconLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      height: 86,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      width: '100%',
      paddingHorizontal: 16,
      ...theme.shadows.card,
      borderBottomLeftRadius: theme.radii.xl,
      borderBottomRightRadius: theme.radii.xl,
    },
    iconButton: {
      height: 64,
      width: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: 'transparent',
    },
    iconButtonActive: {
      backgroundColor: theme.colors.accent,
      shadowColor: theme.colors.accent,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    iconLabel: {
      fontSize: 10,
      color: theme.colors.iconMuted,
      fontFamily: theme.typography.micro.fontFamily,
    },
    iconLabelActive: {
      color: theme.colors.accentText,
      fontWeight: '600',
    },
  });
