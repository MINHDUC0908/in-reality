import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';
import { formatCurrency } from '@/utils/format';
import type { Wallet } from '../types';

interface WalletCardProps {
  wallet: Wallet;
  isSelected?: boolean;
  onPress?: () => void;
  onDelete?: () => void;
  variant?: 'gradient' | 'minimal';
}

export const WalletCard: React.FC<WalletCardProps> = ({
  wallet,
  isSelected = false,
  onPress,
  onDelete,
  variant = 'gradient',
}) => {
  const gradientColors: [string, string, ...string[]] = isSelected
    ? [colors.primaryDark, colors.primary, '#10B981']
    : ['#1E293B', '#334155'];

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={!onPress}
        style={styles.cardShadowWrapper}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientCard, isSelected && styles.gradientCardSelected]}
        >
          {/* Vòng tròn hoa văn nền tinh tế */}
          <View style={styles.bgDecorCircle1} />
          <View style={styles.bgDecorCircle2} />

          {/* Hàng trên: Chip sim thẻ + Tên ví + Nút xóa */}
          <View style={styles.cardTopRow}>
            <View style={styles.chipRow}>
              <View style={styles.simChip}>
                <Ionicons name="hardware-chip-outline" size={18} color="rgba(255, 255, 255, 0.7)" />
              </View>
              <Text style={styles.walletNameOnCard} numberOfLines={1}>
                {wallet.name}
              </Text>
            </View>

            {onDelete && (
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={onDelete}
                style={styles.deleteCardBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={15} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            )}
          </View>

          {/* Phần giữa: Số dư nổi bật */}
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabelOnCard}>Số dư khả dụng</Text>
            <Text style={styles.balanceValueOnCard}>
              {formatCurrency(wallet.balance, wallet.currency)}
            </Text>
          </View>

          {/* Hàng dưới: Số thẻ tượng trưng & Đơn vị tiền tệ */}
          <View style={styles.cardBottomRow}>
            <Text style={styles.maskedNumber}>•••• •••• •••• {wallet.id ? wallet.id.slice(-4).toUpperCase() : '8821'}</Text>
            <View style={styles.currencyPill}>
              <Text style={styles.currencyPillText}>{wallet.currency || 'VND'}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Minimal variant (dùng trong picker/list ngắn)
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.minimalCard, isSelected && styles.minimalCardSelected]}
    >
      <View style={styles.minimalLeft}>
        <View style={styles.minimalIcon}>
          <Ionicons name="wallet-outline" size={18} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.minimalName}>{wallet.name}</Text>
          <Text style={styles.minimalCurrency}>{wallet.currency}</Text>
        </View>
      </View>
      <Text style={styles.minimalBalance}>
        {formatCurrency(wallet.balance, wallet.currency)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardShadowWrapper: {
    marginVertical: spacing.xs + 2,
    ...shadows.floating,
  },
  gradientCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    minHeight: 150,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  gradientCardSelected: {
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
  },
  bgDecorCircle1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  bgDecorCircle2: {
    position: 'absolute',
    bottom: -50,
    left: '30%',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  simChip: {
    width: 30,
    height: 22,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  walletNameOnCard: {
    ...typography.cardTitle,
    color: colors.textInverse,
    fontSize: 13.5,
    fontWeight: '600',
    flex: 1,
  },
  deleteCardBtn: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
  },
  balanceSection: {
    marginVertical: spacing.xs,
  },
  balanceLabelOnCard: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
    marginBottom: 2,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  balanceValueOnCard: {
    ...typography.heroAmount,
    color: colors.textInverse,
    fontSize: 22,
    fontWeight: '700',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  maskedNumber: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    letterSpacing: 1,
  },
  currencyPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  currencyPillText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
    fontSize: 10.5,
  },
  // Minimal card
  minimalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xs,
  },
  minimalCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  minimalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  minimalIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalName: {
    ...typography.bodyBold,
    fontSize: 13,
  },
  minimalCurrency: {
    ...typography.caption,
    fontSize: 11,
  },
  minimalBalance: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
});
