import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, EmptyState, Card } from '@/components';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';
import {
  budgetApi,
  type BudgetStatus,
  type CreateBudgetDto,
  BudgetCard,
  CreateBudgetModal,
} from '@/features/budgets';
import { categoryApi, type Category } from '@/features/categories';
import { formatCurrency } from '@/utils/format';
import { useRefreshStore } from '@/lib/refreshStore';

export default function BudgetsScreen() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    categoryApi.getCategories().then(setCategories).catch(() => {});
  }, []);

  const loadBudgets = useCallback(async () => {
    try {
      const statuses = await budgetApi.getBudgetStatus(selectedMonth, selectedYear);
      setBudgetStatuses(statuses);
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu ngân sách', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedMonth, selectedYear]);

  const refreshKey = useRefreshStore((state) => state.refreshKey);

  useEffect(() => {
    loadBudgets();
  }, [refreshKey, loadBudgets]);

  useFocusEffect(
    useCallback(() => {
      categoryApi.getCategories().then(setCategories).catch(() => {});
      loadBudgets();
    }, [loadBudgets])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    loadBudgets();
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleCreateBudget = async (dto: CreateBudgetDto) => {
    await budgetApi.createBudget(dto);
    useRefreshStore.getState().triggerRefresh();
    loadBudgets();
  };

  const totalLimit = budgetStatuses.reduce((acc, b) => acc + b.amountLimit, 0);
  const totalSpent = budgetStatuses.reduce((acc, b) => acc + b.spent, 0);
  const overBudgetCount = budgetStatuses.filter((b) => b.isOverBudget).length;
  const overallPercent = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Quản lý ngân sách"
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsCreateModalOpen(true)}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={18} color={colors.textInverse} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Bộ chuyển tháng thanh lịch */}
        <View style={styles.monthSelector}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePrevMonth}
            style={styles.monthArrowBtn}
          >
            <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.monthTitleWrapper}>
            <Ionicons
              name="calendar-clear-outline"
              size={15}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.monthText}>
              Tháng {selectedMonth}, {selectedYear}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleNextMonth}
            style={styles.monthArrowBtn}
          >
            <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Tổng quan ngân sách tháng */}
        {budgetStatuses.length > 0 && (
          <Card style={styles.overviewCard}>
            <View style={styles.overviewTop}>
              <View>
                <Text style={styles.overviewSub}>Tổng ngân sách tháng</Text>
                <Text style={styles.overviewMainAmount}>{formatCurrency(totalLimit)}</Text>
              </View>
              <View style={[styles.percentBadge, overallPercent > 100 && styles.percentBadgeOver]}>
                <Text style={[styles.percentBadgeText, overallPercent > 100 && styles.percentBadgeTextOver]}>
                  {overallPercent}% đã dùng
                </Text>
              </View>
            </View>

            <View style={styles.overviewBottom}>
              <View>
                <Text style={styles.overviewSub}>Đã chi</Text>
                <Text style={[styles.spentText, overallPercent > 100 && { color: colors.expense }]}>
                  {formatCurrency(totalSpent)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.overviewSub}>Còn lại</Text>
                <Text style={styles.remainText}>
                  {formatCurrency(Math.max(totalLimit - totalSpent, 0))}
                </Text>
              </View>
            </View>

            {overBudgetCount > 0 && (
              <View style={styles.warningStrip}>
                <Ionicons name="alert-circle" size={14} color={colors.expense} />
                <Text style={styles.warningStripText}>
                  {overBudgetCount} danh mục đã vượt định mức quy định
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Danh sách ngân sách */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : budgetStatuses.length === 0 ? (
          <EmptyState
            icon="pie-chart-outline"
            title="Chưa đặt hạn mức"
            description={`Chưa có ngân sách cho tháng ${selectedMonth}/${selectedYear}. Hãy thiết lập để quản lý chi tiêu hiệu quả.`}
            actionTitle="+ Thiết lập ngân sách"
            onActionPress={() => setIsCreateModalOpen(true)}
          />
        ) : (
          <View style={styles.budgetList}>
            {budgetStatuses.map((status) => (
              <BudgetCard key={status.categoryId} status={status} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal thiết lập ngân sách */}
      <CreateBudgetModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        categories={categories}
        currentMonth={selectedMonth}
        currentYear={selectedYear}
        onSubmit={handleCreateBudget}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm + 2,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
  },
  monthArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthText: {
    ...typography.captionMedium,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  overviewCard: {
    padding: spacing.md,
  },
  overviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  overviewSub: {
    ...typography.caption,
    fontSize: 10.5,
    color: colors.textMuted,
    marginBottom: 2,
  },
  overviewMainAmount: {
    ...typography.cardTitle,
    fontSize: 18,
    color: colors.primary,
  },
  percentBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  percentBadgeOver: {
    backgroundColor: colors.expenseLight,
  },
  percentBadgeText: {
    ...typography.captionMedium,
    fontSize: 10.5,
    color: colors.primary,
  },
  percentBadgeTextOver: {
    color: colors.expense,
  },
  overviewBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderLight,
  },
  spentText: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  remainText: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.income,
  },
  warningStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.expenseLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  warningStripText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.expense,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  budgetList: {
    gap: 0,
  },
});
