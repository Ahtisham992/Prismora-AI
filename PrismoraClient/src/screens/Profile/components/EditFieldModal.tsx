// src/screens/Profile/components/EditFieldModal.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { Typography } from '../../../components/atoms/Typography';
import Icon from 'react-native-vector-icons/Ionicons';

interface EditFieldModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  title: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  multiline?: boolean;
  icon: string;
}

export const EditFieldModal: React.FC<EditFieldModalProps> = ({
  visible,
  onClose,
  onSave,
  title,
  value,
  placeholder,
  maxLength,
  keyboardType = 'default',
  multiline = false,
  icon,
}) => {
  const { colors, spacing } = useTheme();
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value, visible]);

  const handleSave = () => {
    if (inputValue.trim()) {
      onSave(inputValue.trim());
      onClose();
    }
  };

  const handleCancel = () => {
    setInputValue(value);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
                    <Typography variant="body" style={{ color: colors.textSecondary }}>
                      Cancel
                    </Typography>
                  </TouchableOpacity>
                  
                  <View style={styles.headerCenter}>
                    <Icon name={icon} size={20} color={colors.primary} />
                    <Typography variant="h3" style={[styles.modalTitle, { color: colors.text }]}>
                      {title}
                    </Typography>
                  </View>
                  
                  <TouchableOpacity 
                    onPress={handleSave} 
                    style={styles.headerButton}
                    disabled={!inputValue.trim()}
                  >
                    <Typography 
                      variant="body" 
                      style={{ 
                        color: inputValue.trim() ? colors.primary : colors.textSecondary,
                        fontWeight: '600',
                      }}
                    >
                      Save
                    </Typography>
                  </TouchableOpacity>
                </View>

                {/* Input Field */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      multiline && styles.textArea,
                      { 
                        backgroundColor: colors.surface,
                        color: colors.text,
                        borderColor: colors.border,
                      }
                    ]}
                    value={inputValue}
                    onChangeText={setInputValue}
                    placeholder={placeholder}
                    placeholderTextColor={colors.placeholder}
                    maxLength={maxLength}
                    keyboardType={keyboardType}
                    multiline={multiline}
                    numberOfLines={multiline ? 4 : 1}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={multiline ? undefined : handleSave}
                  />
                  
                  {maxLength && (
                    <Typography 
                      variant="caption" 
                      style={[styles.charCount, { color: colors.textSecondary }]}
                    >
                      {inputValue.length} / {maxLength}
                    </Typography>
                  )}
                </View>

                {/* Helper Text */}
                {title === 'Username' && (
                  <View style={styles.helperContainer}>
                    <Icon name="information-circle-outline" size={16} color={colors.textSecondary} />
                    <Typography variant="caption" style={{ color: colors.textSecondary, marginLeft: 6 }}>
                      Username can only be changed once every 14 days
                    </Typography>
                  </View>
                )}

                {title === 'Phone No' && (
                  <View style={styles.helperContainer}>
                    <Icon name="information-circle-outline" size={16} color={colors.textSecondary} />
                    <Typography variant="caption" style={{ color: colors.textSecondary, marginLeft: 6 }}>
                      Your phone number will be kept private
                    </Typography>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    minWidth: 60,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontWeight: '600',
  },
  inputContainer: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  charCount: {
    textAlign: 'right',
    marginTop: 8,
    fontSize: 12,
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});