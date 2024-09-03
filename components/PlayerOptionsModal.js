// /components/PlayerOptionsModal.js

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const PlayerOptionsModal = ({
  visible,
  onClose,
  onRfa,
  onAmnesty,
  onExtend,
  onAddContract,
  selectedPlayer,
}) => {
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

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    padding: 20,
    backgroundColor: '#181c28',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'white',
  },
  playerDetails: {
    fontSize: 18,
    color: 'white',
    marginBottom: 10,
  },
  modalButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    borderRadius: 5,
    width: '80%',
    alignItems: 'center',
    marginVertical: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 10,
  },
});

export default PlayerOptionsModal;
