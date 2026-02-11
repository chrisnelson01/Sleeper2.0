// /components/PlayerOptionsModal.js

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../styles/theme';

const PlayerOptionsModal = ({
  visible,
  onClose,
  onRfa,
  onAmnesty,
  onExtend,
  onAddContract,
  selectedPlayer,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Player Options</Text>
          {/* Display selected player details if needed */}
          {selectedPlayer && (
            <Text style={styles.playerDetails}>
              {`${selectedPlayer.first_name} ${selectedPlayer.last_name}`}
            </Text>
          )}

          {/* Conditionally render buttons */}
          {selectedPlayer && selectedPlayer.contract !== 0 && (
            <>
              <TouchableOpacity style={styles.modalButton} onPress={onRfa}>
                <Text style={styles.modalButtonText}>Add as RFA</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={onAmnesty}>
                <Text style={styles.modalButtonText}>Amnesty Player</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={onExtend}>
                <Text style={styles.modalButtonText}>Extend Player</Text>
              </TouchableOpacity>
            </>
          )}
            {selectedPlayer && selectedPlayer.contract === 0 && (
            <>
                <TouchableOpacity style={styles.modalButton} onPress={onAddContract}>
                    <Text style={styles.modalButtonText}>Add Contract</Text>
                </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      width: '85%',
      padding: 20,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    modalTitle: {
      fontSize: 22,
      marginBottom: 10,
      color: theme.colors.text,
      fontFamily: theme.typography.title.fontFamily,
    },
    playerDetails: {
      fontSize: 18,
      color: theme.colors.text,
      marginBottom: 10,
      fontFamily: theme.typography.body.fontFamily,
    },
    modalButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 10,
      borderRadius: theme.radii.pill,
      width: '80%',
      alignItems: 'center',
      marginVertical: 10,
    },
    modalButtonText: {
      color: theme.colors.accentText,
      fontSize: 16,
      fontFamily: theme.typography.body.fontFamily,
    },
    closeButtonText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      marginTop: 10,
      fontFamily: theme.typography.small.fontFamily,
    },
  });

export default PlayerOptionsModal;
