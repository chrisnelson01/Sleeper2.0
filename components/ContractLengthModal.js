import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../styles/theme';

const ContractLengthModal = ({ visible, onClose, contractLength, setContractLength, onConfirmContractLength, selectedPlayer}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [length, setLength] = useState(parseInt(contractLength, 10) || 1);
  const increaseLength = () => setLength(length + 1);
  const decreaseLength = () => {
    if (length > 0) setLength(length - 1);
  };

  const handleConfirm = () => {
    setContractLength(length.toString());
    onConfirmContractLength();
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Contract Length</Text>

          <View style={styles.lengthButtonContainer}>
            <TouchableOpacity
              style={styles.lengthButton}
              onPress={decreaseLength}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.contractLengthText}>{length}</Text>
            <TouchableOpacity
              style={styles.lengthButton}
              onPress={increaseLength}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.modalButton, styles.confirmButton]}
            onPress={handleConfirm}
          >
            <Text style={styles.modalButtonText}>Confirm</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
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
    lengthButtonContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    lengthButton: {
      backgroundColor: theme.colors.surfaceAlt,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: theme.radii.md,
      marginHorizontal: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonText: {
      color: theme.colors.text,
      fontSize: 18,
      fontFamily: theme.typography.body.fontFamily,
    },
    contractLengthText: {
      color: theme.colors.text,
      fontSize: 24,
      paddingHorizontal: 20,
      fontFamily: theme.typography.title.fontFamily,
    },
    modalButton: {
      paddingVertical: 10,
      borderRadius: theme.radii.pill,
      width: '80%',
      alignItems: 'center',
      marginVertical: 10,
    },
    confirmButton: {
      backgroundColor: theme.colors.accent,
    },
    cancelButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalButtonText: {
      color: theme.colors.accentText,
      fontSize: 16,
      fontFamily: theme.typography.body.fontFamily,
    },
    cancelText: {
      color: theme.colors.text,
      fontSize: 16,
      fontFamily: theme.typography.body.fontFamily,
    },
  });

export default ContractLengthModal;
