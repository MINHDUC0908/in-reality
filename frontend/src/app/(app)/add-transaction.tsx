import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, Input, Button, Card, DatePickerModal } from '@/components';
import { colors, typography, spacing, borderRadius } from '@/theme';
import { walletApi, type Wallet } from '@/features/wallets';
import {
  categoryApi,
  type Category,
  type CreateCategoryDto,
  CreateCategoryModal,
} from '@/features/categories';
import { transactionApi, type AnomalyCheckResult } from '@/features/transactions';
import { budgetApi, type BudgetStatus } from '@/features/budgets';
import { formatCurrency, formatAmountInput, parseAmountInput, generateAmountSuggestions } from '@/utils/format';
import { useRefreshStore } from '@/lib/refreshStore';

export default function AddTransactionScreen() {
  const router = useRouter();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  // amount lưu chuỗi đã định dạng VD "3.000.000" để hiển thị
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [budgetsStatus, setBudgetsStatus] = useState<BudgetStatus[]>([]);
  const [anomalyResult, setAnomalyResult] = useState<AnomalyCheckResult | null>(null);
  const [isCheckingAnomaly, setIsCheckingAnomaly] = useState(false);
  const [dismissedAnomaly, setDismissedAnomaly] = useState(false);

  const handleCreateCategory = async (dto: CreateCategoryDto) => {
    const newCat = await categoryApi.createCategory(dto);
    const updated = await categoryApi.getCategories();
    setCategories(updated);
    setSelectedCategoryId(newCat.id);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoadingData(true);
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const [walletList, categoryList, budgetList] = await Promise.all([
        walletApi.getWallets(),
        categoryApi.getCategories(),
        budgetApi.getBudgetStatus(currentMonth, currentYear).catch(() => []),
      ]);

      setWallets(walletList);
      setCategories(categoryList);
      setBudgetsStatus(budgetList);

      if (walletList.length > 0) {
        setSelectedWalletId(walletList[0].id);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tải danh sách ví và danh mục');
    } finally {
      setIsLoadingData(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    const currentValid = filteredCategories.some((c) => c.id === selectedCategoryId);
    if (!currentValid && filteredCategories.length > 0) {
      setSelectedCategoryId(filteredCategories[0].id);
    }
  }, [type, filteredCategories]);

  // Handler nhập số tiền: tự động định dạng dấu . và cập nhật state
  const handleAmountChange = (text: string) => {
    const formatted = formatAmountInput(text);
    setAmount(formatted);
    if (errorMessage) setErrorMessage(null);
  };

  // Gợi ý số tiền dựa trên số người dùng đang nhập
  const amountSuggestions = generateAmountSuggestions(amount);

  // Kiểm tra bất thường AI khi người dùng nhập tiền hoặc đổi danh mục
  useEffect(() => {
    setDismissedAnomaly(false);
    const numericAmount = parseAmountInput(amount);
    if (type !== 'expense' || numericAmount <= 0) {
      setAnomalyResult(null);
      setIsCheckingAnomaly(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingAnomaly(true);
        const result = await transactionApi.checkAnomaly({
          amount: parseAmountInput(amount),
          categoryId: selectedCategoryId || undefined,
          transactionDate,
        });
        setAnomalyResult(result);
      } catch (err) {
        console.warn('AI Anomaly check failed:', err);
      } finally {
        setIsCheckingAnomaly(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [amount, selectedCategoryId, transactionDate, type]);

  const handleSubmit = async () => {
    const numericAmount = parseAmountInput(amount);

    if (!numericAmount || numericAmount <= 0) {
      setErrorMessage('Vui lòng nhập số tiền hợp lệ (> 0)');
      return;
    }

    if (!selectedWalletId) {
      setErrorMessage('Vui lòng chọn ví thanh toán');
      return;
    }

    if (!selectedCategoryId) {
      setErrorMessage('Vui lòng chọn danh mục');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      await transactionApi.createTransaction({
        walletId: selectedWalletId,
        categoryId: selectedCategoryId,
        amount: numericAmount,
        type,
        description: description.trim() || undefined,
        transactionDate,
      });

      useRefreshStore.getState().triggerRefresh();
      router.back();
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tạo giao dịch. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Thêm giao dịch"
        showBack
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Segmented Switch Thu / Chi */}
          <View style={styles.toggleSegment}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setType('expense')}
              style={[
                styles.segmentItem,
                type === 'expense' && styles.segmentExpenseActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  type === 'expense' && styles.segmentTextActive,
                ]}
              >
                Khoản chi
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setType('income')}
              style={[
                styles.segmentItem,
                type === 'income' && styles.segmentIncomeActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  type === 'income' && styles.segmentTextActive,
                ]}
              >
                Khoản thu
              </Text>
            </TouchableOpacity>
          </View>

          {/* Ô nhập số tiền */}
          <Card style={styles.amountCard}>
            <Text style={styles.amountLabel}>Số tiền (VND) *</Text>
            <Input
              placeholder="0"
              value={amount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              style={styles.amountInput}
            />

            {/* Gợi ý số tiền nhanh */}
            {amountSuggestions.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionRow}
                keyboardShouldPersistTaps="handled"
              >
                {amountSuggestions.map((v) => (
                  <TouchableOpacity
                    key={v}
                    activeOpacity={0.7}
                    onPress={() => setAmount(formatAmountInput(String(v)))}
                    style={styles.suggestionChip}
                  >
                    <Text style={styles.suggestionChipText}>
                      {formatAmountInput(String(v))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Cảnh báo nếu chi tiêu vượt ngân sách tháng */}
            {(() => {
              const numAmount = parseAmountInput(amount);
              const activeBudget =
                type === 'expense'
                  ? budgetsStatus.find((b) => b.categoryId === selectedCategoryId)
                  : null;

              if (!activeBudget) return null;

              const isOverNow = activeBudget.isOverBudget;
              const willBeOver = numAmount > 0 && numAmount > activeBudget.remaining;

              if (!isOverNow && !willBeOver) return null;

              return (
                <View style={styles.budgetWarningBanner}>
                  <Ionicons name="warning" size={14} color={colors.warning} />
                  <Text style={styles.budgetWarningText}>
                    {isOverNow
                      ? `Ngân sách "${activeBudget.categoryName}" tháng này đã bị vượt mức!`
                      : `Giao dịch này sẽ vượt ngân sách còn lại (${formatCurrency(activeBudget.remaining)})`}
                  </Text>
                </View>
              );
            })()}
          </Card>

          {/* Chọn Ví */}
          <View style={styles.pickerSection}>
            <Text style={styles.pickerTitle}>Ví thanh toán *</Text>
            {wallets.length === 0 ? (
              <Text style={styles.emptyNotice}>Chưa có ví nào trong hệ thống</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {wallets.map((w) => {
                  const isSelected = selectedWalletId === w.id;
                  return (
                    <TouchableOpacity
                      key={w.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedWalletId(w.id)}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {w.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Chọn Danh mục */}
          <View style={styles.pickerSection}>
            <Text style={styles.pickerTitle}>Danh mục giao dịch *</Text>
            {filteredCategories.length === 0 ? (
              <Text style={styles.emptyNotice}>Không có danh mục nào</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {/* Nút thêm nhanh danh mục */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsCreateCategoryModalOpen(true)}
                  style={[styles.chip, styles.chipAddBtn]}
                >
                  <Ionicons name="add" size={15} color={colors.primary} style={{ marginRight: 2 }} />
                  <Text style={[styles.chipText, { color: colors.primary, fontWeight: '600' }]}>
                    Thêm mới
                  </Text>
                </TouchableOpacity>

                {filteredCategories.map((c) => {
                  const isSelected = selectedCategoryId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedCategoryId(c.id)}
                      style={[
                        styles.chip,
                        isSelected && (type === 'expense' ? styles.chipExpenseActive : styles.chipIncomeActive),
                      ]}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Chọn ngày giao dịch thông minh */}
          <View style={styles.pickerSection}>
            <View style={styles.dateHeaderRow}>
              <Text style={styles.pickerTitle}>Ngày giao dịch</Text>
              <Text style={styles.dateSelectedPreview}>{transactionDate}</Text>
            </View>

            <View style={styles.dateChipsRow}>
              {/* Nút Hôm nay */}
              {(() => {
                const today = new Date().toISOString().slice(0, 10);
                const isSelected = transactionDate === today;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setTransactionDate(today)}
                    style={[styles.dateChip, isSelected && styles.dateChipActive]}
                  >
                    <Text style={[styles.dateChipText, isSelected && styles.dateChipTextActive]}>
                      Hôm nay
                    </Text>
                  </TouchableOpacity>
                );
              })()}

              {/* Nút Hôm qua */}
              {(() => {
                const yDate = new Date();
                yDate.setDate(yDate.getDate() - 1);
                const yesterday = yDate.toISOString().slice(0, 10);
                const isSelected = transactionDate === yesterday;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setTransactionDate(yesterday)}
                    style={[styles.dateChip, isSelected && styles.dateChipActive]}
                  >
                    <Text style={[styles.dateChipText, isSelected && styles.dateChipTextActive]}>
                      Hôm qua
                    </Text>
                  </TouchableOpacity>
                );
              })()}

              {/* Nút Mở Lịch chọn ngày cụ thể */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsDatePickerOpen(true)}
                style={styles.calendarPickerBtn}
              >
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <Text style={styles.calendarPickerBtnText}>Chọn trên lịch</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Ghi chú */}
          <Input
            label="Ghi chú nội dung (Tùy chọn)"
            value={description}
            onChangeText={setDescription}
            placeholder="VD: Cà phê sáng, mua sách..."
            leftIcon={
              <Ionicons
                name="create-outline"
                size={16}
                color={colors.textMuted}
              />
            }
          />

          {errorMessage && (
            <Text style={styles.errorBanner}>{errorMessage}</Text>
          )}

          {/* AI Phân tích chi tiêu bất thường & Cảnh báo rủi ro */}
          {isCheckingAnomaly && (
            <View style={styles.aiCheckingBadge}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.aiCheckingText}>AI đang đánh giá độ an toàn giao dịch...</Text>
            </View>
          )}

          {anomalyResult &&
            anomalyResult.risk_level !== 'NORMAL' &&
            !dismissedAnomaly && (
              <View
                style={[
                  styles.anomalyCard,
                  anomalyResult.risk_level === 'HIGH'
                    ? styles.anomalyCardHigh
                    : styles.anomalyCardMedium,
                ]}
              >
                <View style={styles.anomalyHeaderRow}>
                  <View style={styles.anomalyTitleGroup}>
                    <Ionicons
                      name={
                        anomalyResult.risk_level === 'HIGH'
                          ? 'shield-half-outline'
                          : 'alert-circle-outline'
                      }
                      size={18}
                      color={
                        anomalyResult.risk_level === 'HIGH'
                          ? colors.expense
                          : colors.warning
                      }
                    />
                    <Text
                      style={[
                        styles.anomalyTitle,
                        anomalyResult.risk_level === 'HIGH'
                          ? styles.anomalyTitleHigh
                          : styles.anomalyTitleMedium,
                      ]}
                    >
                      Cảnh báo rủi ro AI
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.riskBadge,
                      anomalyResult.risk_level === 'HIGH'
                        ? styles.riskBadgeHigh
                        : styles.riskBadgeMedium,
                    ]}
                  >
                    <Text
                      style={[
                        styles.riskBadgeText,
                        anomalyResult.risk_level === 'HIGH'
                          ? styles.riskBadgeTextHigh
                          : styles.riskBadgeTextMedium,
                      ]}
                    >
                      {anomalyResult.risk_level === 'HIGH'
                        ? 'RỦI RO CAO'
                        : 'CẦN LƯU Ý'}{' '}
                      ({Math.round(anomalyResult.risk_score * 100)}%)
                    </Text>
                  </View>
                </View>

                <Text style={styles.anomalyReason}>{anomalyResult.reason}</Text>

                {anomalyResult.suggestion ? (
                  <View style={styles.anomalySuggestionBox}>
                    <Ionicons
                      name="bulb-outline"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.anomalySuggestionText}>
                      {anomalyResult.suggestion}
                    </Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setDismissedAnomaly(true)}
                  style={styles.dismissBtn}
                >
                  <Text style={styles.dismissBtnText}>
                    Tôi hiểu, vẫn muốn tiếp tục giao dịch này
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          {/* Nút lưu */}
          <Button
            title={isSubmitting ? 'Đang lưu...' : 'Lưu giao dịch'}
            onPress={handleSubmit}
            isLoading={isSubmitting}
            size="md"
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Lịch chọn ngày */}
      <DatePickerModal
        visible={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        value={transactionDate}
        onSelect={(selected) => setTransactionDate(selected)}
      />

      <CreateCategoryModal
        visible={isCreateCategoryModalOpen}
        onClose={() => setIsCreateCategoryModalOpen(false)}
        initialType={type}
        onSubmit={handleCreateCategory}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm + 2,
  },
  toggleSegment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    padding: 3,
    borderRadius: borderRadius.md,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  segmentExpenseActive: {
    backgroundColor: colors.expense,
  },
  segmentIncomeActive: {
    backgroundColor: colors.income,
  },
  segmentText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  amountCard: {
    padding: spacing.md,
  },
  amountLabel: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pickerSection: {
    gap: 4,
  },
  pickerTitle: {
    ...typography.captionMedium,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  chipAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipExpenseActive: {
    backgroundColor: colors.expense,
    borderColor: colors.expense,
  },
  chipIncomeActive: {
    backgroundColor: colors.income,
    borderColor: colors.income,
  },
  chipText: {
    ...typography.captionMedium,
    fontSize: 11.5,
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: colors.textInverse,
  },
  emptyNotice: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  errorBanner: {
    ...typography.caption,
    fontSize: 11,
    color: colors.expense,
    textAlign: 'center',
    backgroundColor: colors.expenseLight,
    padding: spacing.xs + 2,
    borderRadius: borderRadius.sm,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  budgetWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningLight,
    borderWidth: 0.5,
    borderColor: colors.warningBorder,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  budgetWarningText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.warning,
    flex: 1,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateSelectedPreview: {
    ...typography.captionMedium,
    fontSize: 11.5,
    color: colors.primary,
    fontWeight: '600',
  },
  dateChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  dateChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateChipText: {
    ...typography.captionMedium,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  dateChipTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  calendarPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 0.5,
    borderColor: colors.primaryBorder,
  },
  calendarPickerBtnText: {
    ...typography.captionMedium,
    fontSize: 11.5,
    color: colors.primary,
    fontWeight: '600',
  },
  aiCheckingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
  },
  aiCheckingText: {
    ...typography.captionMedium,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  anomalyCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs + 2,
  },
  anomalyCardHigh: {
    backgroundColor: colors.expenseLight,
    borderColor: colors.expenseBorder,
  },
  anomalyCardMedium: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
  },
  anomalyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  anomalyTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  anomalyTitle: {
    ...typography.subtitle,
    fontSize: 13,
    fontWeight: '700',
  },
  anomalyTitleHigh: {
    color: colors.expense,
  },
  anomalyTitleMedium: {
    color: colors.warning,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  riskBadgeHigh: {
    backgroundColor: colors.expense,
  },
  riskBadgeMedium: {
    backgroundColor: colors.warning,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textInverse,
  },
  riskBadgeTextHigh: {
    color: colors.textInverse,
  },
  riskBadgeTextMedium: {
    color: colors.textInverse,
  },
  anomalyReason: {
    ...typography.body,
    fontSize: 12.5,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  anomalySuggestionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    padding: 8,
    borderRadius: borderRadius.sm,
  },
  anomalySuggestionText: {
    ...typography.caption,
    fontSize: 11.5,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  dismissBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  dismissBtnText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  // ─── Gợi ý số tiền nhanh ───────────────────────────────────────────────────
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  suggestionChipText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
