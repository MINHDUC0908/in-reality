import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, borderRadius, spacing } from '@/theme';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  style,
  textStyle,
  dot = false,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: colors.incomeLight,
          text: colors.income,
          dot: colors.income,
          border: colors.incomeBorder,
        };
      case 'danger':
        return {
          bg: colors.expenseLight,
          text: colors.expense,
          dot: colors.expense,
          border: colors.expenseBorder,
        };
      case 'warning':
        return {
          bg: colors.warningLight,
          text: colors.warning,
          dot: colors.warning,
          border: colors.warningBorder,
        };
      case 'info':
        return {
          bg: colors.primaryLight,
          text: colors.primary,
          dot: colors.primary,
          border: colors.primaryBorder,
        };
      case 'default':
      default:
        return {
          bg: colors.surfaceAlt,
          text: colors.textSecondary,
          dot: colors.textMuted,
          border: colors.border,
        };
    }
  };

  const scheme = getColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: scheme.bg,
          borderColor: scheme.border,
        },
        style,
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: scheme.dot }]} />}
      <Text style={[styles.text, { color: scheme.text }, textStyle]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 0.5,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  text: {
    ...typography.badge,
    fontSize: 11,
  },
});
