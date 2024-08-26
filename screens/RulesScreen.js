import React, { useState, useEffect } from 'react';
import { ScrollView, Text, View, StyleSheet, ActivityIndicator } from 'react-native';

const RulesScreen = ({ route }) => {
  const { leagueId } = route.params; // Pass the leagueId from navigation params
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch rules when the component mounts
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const response = await fetch(`https://chrisnel01.pythonanywhere.com/api/rules/${leagueId}`);
        const data = await response.json();

        if (response.ok) {
          setRules(data);
        } else {
          setError(data.error || 'Failed to fetch rules');
        }
      } catch (err) {
        setError('Failed to fetch rules');
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, [leagueId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff00" />
        <Text style={styles.loadingText}>Loading Rules...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {rules && rules.map((rule, index) => (
        <View key={rule.rule_id} style={styles.ruleContainer}>
          <Text style={styles.ruleText}>{rule.rule_text}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181c28',
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 18,
  },
  ruleContainer: {
    backgroundColor: '#293142',
    marginBottom: 10,
    padding: 15,
    borderRadius: 8,
    borderColor: 'white',
    borderWidth: 1,
  },
  ruleText: {
    color: 'white',
    fontSize: 16,
  },
});

export default RulesScreen;
