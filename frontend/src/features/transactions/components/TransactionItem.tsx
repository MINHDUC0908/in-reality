import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '@/theme';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Transaction } from '../types';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  onDelete?: () => void;
}

// Hàm gán icon theo tên danh mục
function getCategoryIcon(catName?: string, isIncome?: boolean): keyof typeof Ionicons.glyphMap {
  if (isIncome) return 'trending-up';
  if (!catName) return 'receipt-outline';
  const lower = catName.toLowerCase();
  if (lower.includes('ăn') || lower.includes('uống') || lower.includes('food') || lower.includes('cà phê')) return 'restaurant-outline';
  if (lower.includes('mua') || lower.includes('shopping') || lower.includes('sắm')) return 'bag-handle-outline';
  if (lower.includes('xe') || lower.includes('xăng') || lower.includes('di chuyển') || lower.includes('grab')) return 'car-outline';
  if (lower.includes('điện') || lower.includes('nước') || lower.includes('bill') || lower.includes('hóa đơn')) return 'flash-outline';
  if (lower.includes('nhà') || lower.includes('phòng')) return 'home-outline';
  if (lower.includes('học') || lower.includes('sách')) return 'school-outline';
  if (lower.includes('lương') || lower.includes('thưởng')) return 'wallet-outline';
  return 'card-outline';
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
  onDelete,
}) => {
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? colors.income : colors.textPrimary;
  const amountPrefix = isIncome ? '+' : '-';
  const iconName = getCategoryIcon(transaction.category?.name, isIncome);
  const iconBg = isIncome ? colors.incomeLight : colors.surfaceAlt;
  const iconColor = isIncome ? colors.income : colors.textSecondary;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      style={styles.container}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={18} color={iconColor} />
      </View>

      <View style={styles.details}>
        <Text style={styles.categoryName} numberOfLines={1}>
          {transaction.category?.name || (isIncome ? 'Thu nhập' : 'Chi tiêu')}
        </Text>
        <View style={styles.metaRow}>
          {transaction.description ? (
            <Text style={styles.description} numberOfLines={1}>
              {transaction.description}
            </Text>
          ) : null}
          {transaction.description && transaction.wallet?.name ? (
            <Text style={styles.dotSeparator}>•</Text>
          ) : null}
          {transaction.wallet?.name ? (
            <Text style={styles.walletTag} numberOfLines={1}>
              {transaction.wallet.name}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rightContent}>
        <Text
          style={[
            styles.amount,
            { color: amountColor },
            isIncome && { fontWeight: '700' },
          ]}
        >
          {amountPrefix}{formatCurrency(transaction.amount)}
        </Text>
        <Text style={styles.dateText}>{formatDate(transaction.transactionDate)}</Text>
      </View>

      {onDelete && (
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={onDelete}
          style={styles.deleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={13} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    marginBottom: 6,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryName: {
    ...typography.bodyBold,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  description: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    maxWidth: 130,
  },
  dotSeparator: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginHorizontal: 4,
  },
  walletTag: {
    ...typography.caption,
    fontSize: 10.5,
    color: colors.primary,
    fontWeight: '500',
  },
  rightContent: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  amount: {
    ...typography.bodyBold,
    fontSize: 13.5,
    letterSpacing: -0.2,
  },
  dateText: {
    ...typography.caption,
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  deleteBtn: {
    marginLeft: spacing.xs + 2,
    padding: 3,
  },
});
