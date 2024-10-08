import React, { useState } from "react";
import { ScrollView, SafeAreaView, Dimensions, TouchableOpacity, View, Text, StyleSheet, Image } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Ionicons } from '@expo/vector-icons';

const FutureScreen = ({ route }) => {
  const { data } = route.params;
  const screenWidth = Dimensions.get("window").width;
  const chartWidthPercentage = 92; // Set your desired percentage

  const [expandedTeam, setExpandedTeam] = useState(null);

  const toggleTeamExpansion = (teamId) => {
    setExpandedTeam((prevTeam) => (prevTeam === teamId ? null : teamId));
  };

const calculateCapSpace = (team, years) => {
  // Initialize the cap space array starting from year 0
  const initialCapSpace = Array.from({ length: years + 1 }, () => 260);

  team.players.forEach((player) => {
    // If the player's contract is 0, it should still affect the cap space for Year 0
    if (player.contract === 0) {
      initialCapSpace[0] -= parseInt(player.amount);
    } else {
      // Otherwise, subtract for each year the contract covers
      for (let i = 0; i < Math.min(player.contract, years + 1); i++) {
        initialCapSpace[i] -= parseInt(player.amount);
      }
    }
  });

  // Return the cap space data for the given number of years, including year 0
  return initialCapSpace.slice(0, years + 1);
};

const chartData = data.map((team) => {
  return {
    name: team.display_name,
    avatar: team.avatar, // Add avatar URL from team data
    data: calculateCapSpace(team, 4), // Now this includes years 0 to 5
  };
});


  return (
    <View style={{flex: 1, backgroundColor: '#181c28', paddingTop: 10}}>
      <ScrollView>
        {chartData.map((team, index) => {
          const avatarUrl = team.avatar
            ? `https://sleepercdn.com/avatars/thumbs/${team.avatar}`
            : null; // Fallback if no avatar is present

          return (
            <View key={index} style={styles.chartContainer}>
              <TouchableOpacity onPress={() => toggleTeamExpansion(team.name)}>
                <View style={styles.teamHeader}>
                  <View style={styles.teamInfo}>
                    {avatarUrl && (
                      <Image
                        source={{ uri: avatarUrl }}
                        style={styles.avatarImage}
                      />
                    )}
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
                      {team.name}
                    </Text>
                  </View>
                  <Ionicons
                    name={expandedTeam === team.name ? 'chevron-up-outline' : 'chevron-down-outline'}
                    size={24}
                    color="white"
                  />
                </View>
              </TouchableOpacity>
              {expandedTeam === team.name && (
                <React.Fragment>
                  <LineChart
                    data={{
                      labels: ["Now", "Year 1", "Year 2", "Year 3", "Year 4"],
                      datasets: [
                        {
                          data: team.data,
                        },
                      ],
                    }}
                    width={(screenWidth * chartWidthPercentage) / 100}
                    height={220}
                    yAxisLabel="$"
                    chartConfig={{
                      backgroundColor: "#293142",
                      backgroundGradientFrom: "#293142",
                      backgroundGradientTo: "#293142",
                      decimalPlaces: 2,
                      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      style: {
                        borderRadius: 16,
                      },
                      propsForDots: {
                        r: "6",
                        strokeWidth: "2",
                        stroke: "#ffa726",
                      },
                    }}
                  />
                  <View style={styles.dollarAmountContainer}>
                    {team.data.map((amount, yearIndex) => (
                      <Text key={yearIndex} style={styles.dollarAmountText}>
                        {yearIndex === 0 ? `Now: $${amount}` : `Year ${yearIndex}: $${amount}`}
                      </Text>
                    ))}
                  </View>
                </React.Fragment>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#293142',
    borderWidth: 1,
    borderColor: 'white',
    marginHorizontal: 10,
    marginVertical: 5,
    padding: 10,
    borderRadius: 10, // Rounded corners for teams
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  dollarAmountContainer: {
    flexDirection:'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  dollarAmountText: {
    color: 'white',
  },
});

export default FutureScreen;
