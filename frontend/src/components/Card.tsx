import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { colors, borderRadius, shadows, spacing } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: keyof typeof spacing;
  radius?: keyof typeof borderRadius;
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  padding = 'lg',
  radius = 'lg',
  bordered = false,
}) => {
  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: borderRadius[radius],
    padding: spacing[padding],
    borderWidth: bordered ? 1 : 0.5,
    borderColor: colors.borderLight,
    ...shadows.card,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.72}
        onPress={onPress}
        style={[cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};
