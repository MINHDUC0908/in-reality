import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { colors, typography, borderRadius, spacing } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
}) => {
  const isButtonDisabled = disabled || isLoading;

  const getContainerStyle = (): ViewStyle => {
    let base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.md,
    };

    // Size
    switch (size) {
      case 'sm':
        base.paddingVertical = spacing.xs + 2;
        base.paddingHorizontal = spacing.md;
        break;
      case 'lg':
        base.paddingVertical = spacing.lg - 2;
        base.paddingHorizontal = spacing.xl;
        break;
      case 'md':
      default:
        base.paddingVertical = spacing.md;
        base.paddingHorizontal = spacing.lg;
        break;
    }

    // Variant
    switch (variant) {
      case 'secondary':
        base.backgroundColor = colors.primaryLight;
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.borderWidth = 1.5;
        base.borderColor = colors.border;
        break;
      case 'danger':
        base.backgroundColor = colors.expense;
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
      case 'primary':
      default:
        base.backgroundColor = colors.primary;
        break;
    }

    if (isButtonDisabled) {
      base.opacity = 0.55;
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    let base: TextStyle = { ...typography.button };

    if (size === 'sm') {
      base.fontSize = 13;
    } else if (size === 'lg') {
      base.fontSize = 16;
    }

    switch (variant) {
      case 'secondary':
        base.color = colors.primary;
        break;
      case 'outline':
        base.color = colors.textPrimary;
        break;
      case 'danger':
        base.color = colors.textInverse;
        break;
      case 'ghost':
        base.color = colors.primary;
        break;
      case 'primary':
      default:
        base.color = colors.textInverse;
        break;
    }

    return base;
  };

  const spinnerColor =
    variant === 'primary' || variant === 'danger'
      ? colors.textInverse
      : colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={isButtonDisabled}
      style={[getContainerStyle(), style]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
});
