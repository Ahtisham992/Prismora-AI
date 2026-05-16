// AddTabButton.js
import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export const AddTabButton = ({ onPress, colors }) => (
  <TouchableOpacity style={styles.container} activeOpacity={0.8} onPress={onPress}>
    <View style={[styles.button, { backgroundColor: colors.primary }]}>
      <Ionicons name="add" size={30} color="#fff" />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
