import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Badge } from '@/components';
import { colors, typography, spacing, borderRadius } from '@/theme';
import { formatCurrency } from '@/utils/format';
import type { BudgetStatus } from '../types';

interface BudgetCardProps {
  status: BudgetStatus;
  onPress?: () => void;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({ status, onPress }) => {
  const percent = Math.min(Math.max(status.percentUsed, 0), 100);
  const isOver = status.isOverBudget || status.percentUsed >= 100;

  const getProgressColor = () => {
    if (isOver) return colors.expense;
    if (status.percentUsed > 80) return colors.warning;
    return colors.income;
  };

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleInfo}>
          <Text style={styles.categoryName} numberOfLines={1}>
            {status.categoryName || 'Danh mục'}
          </Text>
          <Text style={styles.limitText}>
            Hạn mức: {formatCurrency(status.amountLimit)}
          </Text>
        </View>

        <Badge
          label={isOver ? 'Vượt mức' : `${Math.round(status.percentUsed)}%`}
          variant={isOver ? 'danger' : status.percentUsed > 80 ? 'warning' : 'success'}
        />
      </View>

      {/* Thanh tiến độ mảnh và mượt mà */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${percent}%`,
              backgroundColor: getProgressColor(),
            },
          ]}
        />
      </View>

      <View style={styles.footerRow}>
        <View>
          <Text style={styles.footerLabel}>Đã chi</Text>
          <Text style={[styles.footerValue, { color: isOver ? colors.expense : colors.textPrimary }]}>
            {formatCurrency(status.spent)}
          </Text>
        </View>

        <View style={styles.footerRight}>
          <Text style={styles.footerLabel}>
            {isOver ? 'Vượt quá' : 'Còn lại'}
          </Text>
          <Text
            style={[
              styles.footerValue,
              { color: isOver ? colors.expense : colors.income },
            ]}
          >
            {formatCurrency(Math.abs(status.remaining))}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xs + 2,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  categoryName: {
    ...typography.bodyBold,
    fontSize: 13.5,
    marginBottom: 1,
  },
  limitText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  footerLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 1,
  },
  footerValue: {
    ...typography.bodyBold,
    fontSize: 12.5,
    letterSpacing: -0.2,
  },
});
