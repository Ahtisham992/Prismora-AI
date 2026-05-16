// components/atoms/UploadProgressIndicator.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface UploadProgressIndicatorProps {
  visible: boolean;
  progress: number;
  fileName?: string;
  onDismiss?: () => void;
}

export const UploadProgressIndicator: React.FC<UploadProgressIndicatorProps> = ({
  visible,
  progress,
  fileName = 'Video',
  onDismiss,
}) => {
  const { colors, spacing, radius } = useTheme();
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible && progress === 0) return null;

  const isComplete = progress >= 100;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          transform: [{ translateY: slideAnim }],
        },
        styles.shadow,
      ]}
    >
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isComplete ? colors.success : colors.primary,
            borderRadius: radius.sm,
          },
        ]}
      >
        <Ionicons
          name={isComplete ? 'checkmark' : 'cloud-upload-outline'}
          size={20}
          color={colors.onPrimary}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {isComplete ? 'Upload Complete' : 'Uploading'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {fileName}
        </Text>

        {/* Progress Bar */}
        {!isComplete && (
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        )}

        {/* Progress Text */}
        {!isComplete && (
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {Math.round(progress)}%
          </Text>
        )}
      </View>

      {/* Dismiss Button */}
      {isComplete && onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    zIndex: 1000,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    marginTop: 2,
  },
  dismissButton: {
    padding: 4,
  },
});

export default UploadProgressIndicator;