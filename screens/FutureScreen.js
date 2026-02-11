import React from "react";
import { Dimensions, View, Text, StyleSheet, Image } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useAppContext } from '../context/AppContext';
import Screen from '../components/Screen';
import CapBar from '../components/CapBar';
import { useTheme } from '../styles/theme';

const FutureScreen = () => {
  const { rostersData, selectedTeam, userId } = useAppContext();
  const theme = useTheme();
  const styles = getStyles(theme);
  const data = rostersData || [];
  const team = selectedTeam || data.find((t) => String(t.owner_id) === String(userId));

  const screenWidth = Dimensions.get("window").width;
  const chartWidthPercentage = 92;
  const chartText = theme.mode === 'dark' ? '245, 247, 250' : '25, 25, 25';

  const calculateCapSpace = (teamData, years) => {
    const initialCapSpace = Array.from({ length: years + 1 }, () => 260);

    teamData.players.forEach((player) => {
      if (player.contract === 0) {
        initialCapSpace[0] -= parseInt(player.amount, 10);
      } else {
        for (let i = 0; i < Math.min(player.contract, years + 1); i++) {
          initialCapSpace[i] -= parseInt(player.amount, 10);
        }
      }
    });

    return initialCapSpace.slice(0, years + 1);
  };

  const chartData = team
    ? {
        name: team.display_name,
        avatar: team.avatar,
        data: calculateCapSpace(team, 4),
      }
    : null;

  return (
    <Screen scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Cap Outlook</Text>
        <Text style={styles.subtitle}>Projected cap space for the next 4 seasons.</Text>
      </View>

      {!chartData ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Cap outlook will appear once your team loads.</Text>
        </View>
      ) : (
        <View style={styles.chartContainer}>
          <View style={styles.teamHeader}>
            <View style={styles.teamInfo}>
              {chartData.avatar ? (
                <Image
                  source={{ uri: `https://sleepercdn.com/avatars/thumbs/${chartData.avatar}` }}
                  style={styles.avatarImage}
                />
              ) : null}
              <View>
                <Text style={styles.teamName}>{chartData.name}</Text>
                <Text style={styles.teamMeta}>Current roster cap outlook</Text>
              </View>
            </View>
          </View>
          <CapBar total={Number(team?.total_amount || 0)} limit={260} />
          <LineChart
            data={{
              labels: ["Now", "Year 1", "Year 2", "Year 3", "Year 4"],
              datasets: [
                {
                  data: chartData.data,
                },
              ],
            }}
            width={(screenWidth * chartWidthPercentage) / 100}
            height={220}
            yAxisLabel="$"
            chartConfig={{
              backgroundColor: theme.colors.card,
              backgroundGradientFrom: theme.colors.card,
              backgroundGradientTo: theme.colors.card,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(${chartText}, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(${chartText}, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: theme.colors.accent,
              },
            }}
            style={styles.chart}
          />
          <View style={styles.dollarAmountContainer}>
            {chartData.data.map((amount, yearIndex) => (
              <View key={yearIndex} style={styles.amountPill}>
                <Text style={styles.dollarAmountText}>
                  {yearIndex === 0 ? `Now` : `Year ${yearIndex}`}
                </Text>
                <Text style={styles.amountValue}>${amount}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    scrollContent: {
      paddingBottom: theme.spacing.xxl,
      gap: theme.spacing.sm,
    },
    header: {
      marginBottom: theme.spacing.sm,
    },
    title: {
      fontSize: 28,
      color: theme.colors.text,
      fontFamily: theme.typography.heading.fontFamily,
    },
    subtitle: {
      marginTop: theme.spacing.xs,
      color: theme.colors.textMuted,
      fontFamily: theme.typography.subtitle.fontFamily,
    },
    chartContainer: {
      ...theme.card,
      marginVertical: theme.spacing.xs,
      padding: theme.spacing.md,
      borderRadius: theme.radii.lg,
      gap: theme.spacing.sm,
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
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    dollarAmountText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.small.fontFamily,
    },
    amountValue: {
      color: theme.colors.text,
      fontFamily: theme.typography.body.fontFamily,
      fontSize: 14,
    },
    teamName: {
      fontSize: 18,
      color: theme.colors.text,
      fontFamily: theme.typography.body.fontFamily,
    },
    teamMeta: {
      marginTop: 2,
      color: theme.colors.textMuted,
      fontFamily: theme.typography.small.fontFamily,
      fontSize: 12,
    },
    chart: {
      marginTop: theme.spacing.sm,
      borderRadius: theme.radii.lg,
    },
    amountPill: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 2,
    },
    emptyCard: {
      ...theme.card,
      padding: theme.spacing.md,
      alignItems: 'center',
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.small.fontFamily,
    },
  });

export default FutureScreen;
