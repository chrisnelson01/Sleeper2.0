// /components/ConfirmationModal.js

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../styles/theme';

const ConfirmationModal = ({ visible, onClose, onConfirm, message }) => {
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
          <Text style={styles.modalTitle}>{message}</Text>
          <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
            <Text style={styles.buttonText}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>No</Text>
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
      fontSize: 18,
      color: theme.colors.text,
      marginBottom: 20,
      textAlign: 'center',
      fontFamily: theme.typography.body.fontFamily,
    },
    confirmButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 15,
      borderRadius: theme.radii.pill,
      width: '90%',
      alignItems: 'center',
      marginBottom: 10,
    },
    cancelButton: {
      backgroundColor: theme.colors.surface,
      paddingVertical: 15,
      borderRadius: theme.radii.pill,
      width: '90%',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonText: {
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

export default ConfirmationModal;
