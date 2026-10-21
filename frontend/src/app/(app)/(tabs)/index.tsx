import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows } from '@/theme';
import { useAuthStore } from '@/lib/store';
import { useRefreshStore } from '@/lib/refreshStore';
import {
  walletApi,
  type Wallet,
  type CreateWalletDto,
  CreateWalletModal,
  TransferMoneyModal,
} from '@/features/wallets';
import {
  transactionApi,
  type Transaction,
} from '@/features/transactions';
import { budgetApi, type BudgetStatus } from '@/features/budgets';
import { formatCurrency, formatDate } from '@/utils/format';

// Bộ màu danh mục hài hòa tươi sáng & rõ ràng (Fresh & Crisp FinTech)
const CATEGORY_COLORS = ['#059669', '#0284C7', '#F59E0B', '#E11D48', '#0D9488', '#6366F1'];

function getCategoryIcon(catName?: string, isIncome?: boolean): keyof typeof Ionicons.glyphMap {
  if (isIncome) return 'wallet-outline';
  if (!catName) return 'receipt-outline';
  const lower = catName.toLowerCase();
  if (lower.includes('ăn') || lower.includes('uống') || lower.includes('cà phê') || lower.includes('food'))
    return 'cafe-outline';
  if (lower.includes('mua') || lower.includes('shopping') || lower.includes('sắm') || lower.includes('chợ'))
    return 'cart-outline';
  if (lower.includes('xe') || lower.includes('xăng') || lower.includes('di chuyển') || lower.includes('grab'))
    return 'car-outline';
  if (lower.includes('điện') || lower.includes('nước') || lower.includes('hóa đơn'))
    return 'flash-outline';
  if (lower.includes('nhà') || lower.includes('phòng')) return 'home-outline';
  if (lower.includes('lương') || lower.includes('thưởng')) return 'cash-outline';
  return 'card-outline';
}

function getWalletTypeMeta(name: string) {
  const lower = name.toLowerCase();
  if (
    lower.includes('vcb') ||
    lower.includes('vietcom') ||
    lower.includes('bank') ||
    lower.includes('ngân hàng') ||
    lower.includes('mb') ||
    lower.includes('tech') ||
    lower.includes('bidv')
  ) {
    return { tag: 'Ngân hàng', icon: 'business' as const, bg: colors.secondaryLight, color: colors.secondary };
  }
  if (
    lower.includes('momo') ||
    lower.includes('zalo') ||
    lower.includes('viettel') ||
    lower.includes('shopee') ||
    lower.includes('ví')
  ) {
    return { tag: 'Ví điện tử', icon: 'wallet' as const, bg: colors.primaryLight, color: colors.primary };
  }
  return { tag: 'Tiền mặt', icon: 'cash' as const, bg: colors.accentWarmLight, color: colors.accentWarm };
}

export default function WalletsDashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [summaryItems, setSummaryItems] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'year'>('month');
  const [selectedOverviewWalletId, setSelectedOverviewWalletId] = useState<string>('all');
  const [overviewSummaryItems, setOverviewSummaryItems] = useState<any[]>([]);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const [walletList, txRes, summaryRes, budgetRes, overviewRes] = await Promise.all([
        walletApi.getWallets().catch(() => []),
        transactionApi.getTransactions({ limit: 6 }).catch(() => ({ data: [] })),
        transactionApi.getSummary(currentMonth, currentYear).catch(() => []),
        budgetApi.getBudgetStatus(currentMonth, currentYear).catch(() => []),
        transactionApi.getSummary({
          period: timeFilter,
          walletId: selectedOverviewWalletId === 'all' ? undefined : selectedOverviewWalletId,
        }).catch(() => []),
      ]);

      setWallets(walletList || []);
      setRecentTransactions(txRes?.data || []);
      setSummaryItems(Array.isArray(summaryRes) ? summaryRes : []);
      setOverviewSummaryItems(Array.isArray(overviewRes) ? overviewRes : []);
      setBudgets(Array.isArray(budgetRes) ? budgetRes : []);

      let inc = 0;
      let exp = 0;
      if (Array.isArray(summaryRes)) {
        summaryRes.forEach((item) => {
          const totalVal = Number(item.total) || 0;
          if (item.type === 'income') inc += totalVal;
          if (item.type === 'expense') exp += totalVal;
        });
      }
      setMonthlyIncome(inc);
      setMonthlyExpense(exp);
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu dashboard', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [timeFilter, selectedOverviewWalletId]);

  const loadOverviewBreakdown = useCallback(async (period: 'week' | 'month' | 'year', walletId: string) => {
    try {
      setIsOverviewLoading(true);
      const res = await transactionApi.getSummary({
        period,
        walletId: walletId === 'all' ? undefined : walletId,
      });
      setOverviewSummaryItems(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error('Lỗi lọc tổng quan chi tiêu', err);
    } finally {
      setIsOverviewLoading(false);
    }
  }, []);

  const handleTimeFilterChange = (newPeriod: 'week' | 'month' | 'year') => {
    setTimeFilter(newPeriod);
    loadOverviewBreakdown(newPeriod, selectedOverviewWalletId);
  };

  const handleWalletFilterChange = (newWalletId: string) => {
    setSelectedOverviewWalletId(newWalletId);
    loadOverviewBreakdown(timeFilter, newWalletId);
  };

  const refreshKey = useRefreshStore((state) => state.refreshKey);

  useEffect(() => {
    loadDashboardData();
  }, [refreshKey, loadDashboardData]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleCreateWallet = async (dto: CreateWalletDto) => {
    await walletApi.createWallet(dto);
    useRefreshStore.getState().triggerRefresh();
    loadDashboardData();
  };

  // Tổng số dư thực tế từ danh sách ví từ Backend
  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);

  // Phân bổ chi tiêu thực tế từ summaryItems
  const expenseSummaryItems = summaryItems
    .filter((item) => item.type === 'expense' && Number(item.total) > 0)
    .sort((a, b) => Number(b.total) - Number(a.total));

  const totalExpenseBreakdown =
    expenseSummaryItems.reduce((acc, curr) => acc + Number(curr.total), 0) || monthlyExpense || 1;

  // Phân bổ chi tiêu thực tế cho "Tổng quan chi tiêu" theo bộ lọc Tuần / Tháng / Năm / Ví
  const overviewExpenseItems = overviewSummaryItems
    .filter((item) => item.type === 'expense' && Number(item.total) > 0)
    .sort((a, b) => Number(b.total) - Number(a.total));

  const overviewExpenseTotal = overviewExpenseItems.reduce(
    (acc, curr) => acc + (Number(curr.total) || 0),
    0
  );

  const totalOverviewBreakdown = overviewExpenseTotal || 1;

  const periodLabel =
    timeFilter === 'week' ? 'tuần này' : timeFilter === 'month' ? 'tháng này' : 'năm nay';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ================= 1. TOP HEADER ================= */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../../../assets/images/spendwise-app-logo.png')}
                style={styles.appLogoImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.appNameContainer}>
              <View style={styles.appNameRow}>
                <Text style={styles.headerBrandSpend}>Spend</Text>
                <Text style={styles.headerBrandWise}>Wise</Text>
              </View>
              <Text style={styles.headerTagline}>Tài chính thông minh</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.iconButton}
              onPress={() => Alert.alert('Thông báo', 'Bạn không có thông báo mới')}
            >
              <Ionicons name="notifications-outline" size={20} color="#1E293B" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.avatarButton}
              onPress={() => router.push('/(app)/(tabs)/profile')}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= 2. HERO BALANCE CARD (Dữ liệu thực từ BE) ================= */}
        <LinearGradient
          colors={[colors.cardDarkStart, colors.cardDarkEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Ionicons
            name="wallet"
            size={120}
            color="rgba(255,255,255,0.04)"
            style={styles.heroWatermark}
          />

          <View style={styles.heroBalanceContainer}>
            <Text style={styles.heroBalanceText}>
              {formatCurrency(totalBalance)}
            </Text>
          </View>

          <View style={styles.heroStatsRow}>
            {/* Thu nhập tháng thực tế */}
            <View style={styles.heroStatPill}>
              <View style={[styles.statIconBadge, { backgroundColor: colors.income }]}>
                <Ionicons name="arrow-up" size={12} color="#FFFFFF" />
              </View>
              <View style={styles.statPillTextCol}>
                <Text style={styles.statPillLabel}>Thu nhập tháng</Text>
                <Text style={styles.incomePillValue} numberOfLines={1}>
                  +{formatCurrency(monthlyIncome)}
                </Text>
              </View>
            </View>

            {/* Chi tiêu tháng thực tế */}
            <View style={styles.heroStatPill}>
              <View style={[styles.statIconBadge, { backgroundColor: colors.expense }]}>
                <Ionicons name="arrow-down" size={12} color="#FFFFFF" />
              </View>
              <View style={styles.statPillTextCol}>
                <Text style={styles.statPillLabel}>Chi tiêu tháng</Text>
                <Text style={styles.expensePillValue} numberOfLines={1}>
                  -{formatCurrency(monthlyExpense)}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ================= 3. TÀI KHOẢN & VÍ (Render động từ BE) ================= */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Tài khoản & Ví</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsWalletModalVisible(true)}
          >
            <Text style={styles.sectionSubLink}>
              {wallets.length > 0 ? `${wallets.length} tài khoản` : '+ Thêm ví'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.walletsHorizontalList}
        >
          {wallets.length > 0 ? (
            wallets.map((wallet) => {
              const meta = getWalletTypeMeta(wallet.name);
              return (
                <View key={wallet.id} style={styles.walletCardMini}>
                  <View style={styles.walletCardTop}>
                    <View style={[styles.walletMiniIcon, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={15} color={meta.color} />
                    </View>
                    <Text style={[styles.walletTagText, { color: meta.color }]} numberOfLines={1}>
                      {meta.tag}
                    </Text>
                  </View>

                  <View style={styles.walletCardBottom}>
                    <Text style={styles.walletNameText} numberOfLines={1}>
                      {wallet.name}
                    </Text>
                    <Text style={styles.walletBalanceText}>
                      {formatCurrency(Number(wallet.balance || 0))}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.emptyWalletPromptCard}
              onPress={() => setIsWalletModalVisible(true)}
            >
              <Ionicons name="card-outline" size={24} color={colors.primary} />
              <Text style={styles.emptyPromptTitle}>Chưa có ví chi tiêu</Text>
              <Text style={styles.emptyPromptSub}>Chạm để thêm ví đầu tiên của bạn</Text>
            </TouchableOpacity>
          )}

          {/* Nút thêm ví nhanh */}
          {wallets.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.addWalletCardMini}
              onPress={() => setIsWalletModalVisible(true)}
            >
              <View style={styles.addWalletMiniCircle}>
                <Ionicons name="add" size={18} color={colors.primary} />
              </View>
              <Text style={styles.addWalletMiniText}>Thêm ví</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* ================= 4. QUICK ACTION BAR ================= */}
        <View style={styles.quickActionsCard}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/(app)/add-transaction?type=expense')}
            style={styles.quickActionBtn}
          >
            <View style={[styles.actionCircle, { backgroundColor: colors.expenseLight }]}>
              <Ionicons name="remove" size={22} color={colors.expense} />
            </View>
            <Text style={styles.actionLabel}>Chi tiêu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/(app)/add-transaction?type=income')}
            style={styles.quickActionBtn}
          >
            <View style={[styles.actionCircle, { backgroundColor: colors.incomeLight }]}>
              <Ionicons name="add" size={22} color={colors.income} />
            </View>
            <Text style={styles.actionLabel}>Thu nhập</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/(app)/(tabs)/scan')}
            style={styles.quickActionBtn}
          >
            <View style={[styles.actionCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="scan-outline" size={20} color={colors.primary} />
              <View style={[styles.aiBadgeMini, { backgroundColor: colors.primary }]}>
                <Ionicons name="sparkles" size={8} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.actionLabel}>Quét bill</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              if (wallets.length < 2) {
                Alert.alert(
                  'Cần tối thiểu 2 ví',
                  'Bạn cần có ít nhất 2 ví chi tiêu để thực hiện chuyển tiền qua lại. Hãy tạo thêm ví nhé!',
                );
                return;
              }
              setIsTransferModalVisible(true);
            }}
            style={styles.quickActionBtn}
          >
            <View style={[styles.actionCircle, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="swap-horizontal" size={20} color={colors.textPrimary} />
            </View>
            <Text style={styles.actionLabel}>Chuyển tiền</Text>
          </TouchableOpacity>
        </View>

        {/* ================= 5. AI SMART INSIGHT BANNER (Tự động sinh từ dữ liệu BE) ================= */}
        <LinearGradient
          colors={['#F0FDF4', '#ECFDF5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiBannerCard}
        >
          <View style={styles.aiBannerHeader}>
            <View style={styles.aiPillBadge}>
              <Ionicons name="sparkles" size={11} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.aiPillBadgeText}>AI Phân tích thông minh</Text>
            </View>
            <Text style={styles.aiBannerTimeText}>Hôm nay</Text>
          </View>

          {expenseSummaryItems.length > 0 ? (
            <Text style={styles.aiBannerContent}>
              Danh mục chi tiêu nhiều nhất tháng này là{' '}
              <Text style={styles.aiHighlightWord}>
                {expenseSummaryItems[0].categoryName || 'Chi tiêu'}
              </Text>{' '}
              với{' '}
              <Text style={styles.aiBoldWord}>
                {formatCurrency(Number(expenseSummaryItems[0].total))}
              </Text>{' '}
              (chiếm{' '}
              <Text style={styles.aiHighlightWord}>
                {Math.round((Number(expenseSummaryItems[0].total) / totalExpenseBreakdown) * 100)}%
              </Text>{' '}
              tổng chi tiêu). Hãy theo dõi ngân sách để duy trì tài chính cân bằng!
            </Text>
          ) : (
            <Text style={styles.aiBannerContent}>
              Bạn chưa có khoản chi tiêu nào trong tháng này. Hãy thêm giao dịch hoặc{' '}
              <Text style={styles.aiBoldWord}>Quét hóa đơn AI</Text> để nhận phân tích thông minh tức thì!
            </Text>
          )}

          <View style={styles.aiBannerFooter}>
            <Text style={styles.aiConfidenceText}>Độ chính xác phân loại 98%</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(app)/(tabs)/budgets')}
              style={styles.aiDetailLink}
            >
              <Text style={styles.aiDetailLinkText}>Xem chi tiết</Text>
              <Ionicons name="arrow-forward" size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ================= 6. TỔNG QUAN CHI TIÊU (Render động từ BE) ================= */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Tổng quan chi tiêu</Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleTimeFilterChange('week')}
              style={[styles.segBtn, timeFilter === 'week' && styles.segBtnActive]}
            >
              <Text style={[styles.segBtnText, timeFilter === 'week' && styles.segBtnTextActive]}>
                Tuần
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleTimeFilterChange('month')}
              style={[styles.segBtn, timeFilter === 'month' && styles.segBtnActive]}
            >
              <Text style={[styles.segBtnText, timeFilter === 'month' && styles.segBtnTextActive]}>
                Tháng
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleTimeFilterChange('year')}
              style={[styles.segBtn, timeFilter === 'year' && styles.segBtnActive]}
            >
              <Text style={[styles.segBtnText, timeFilter === 'year' && styles.segBtnTextActive]}>
                Năm
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Thanh lọc theo Ví nếu người dùng có từ 2 ví trở lên */}
        {wallets.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.overviewWalletFilterRow}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleWalletFilterChange('all')}
              style={[
                styles.overviewWalletChip,
                selectedOverviewWalletId === 'all' && styles.overviewWalletChipActive,
              ]}
            >
              <Text
                style={[
                  styles.overviewWalletChipText,
                  selectedOverviewWalletId === 'all' && styles.overviewWalletChipTextActive,
                ]}
              >
                Tất cả ví
              </Text>
            </TouchableOpacity>
            {wallets.map((w) => {
              const isSelected = selectedOverviewWalletId === w.id;
              return (
                <TouchableOpacity
                  key={w.id}
                  activeOpacity={0.7}
                  onPress={() => handleWalletFilterChange(w.id)}
                  style={[
                    styles.overviewWalletChip,
                    isSelected && styles.overviewWalletChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.overviewWalletChipText,
                      isSelected && styles.overviewWalletChipTextActive,
                    ]}
                  >
                    {w.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.breakdownOverviewCard}>
          <View style={styles.breakdownTopSummary}>
            <View style={styles.breakdownTotalRow}>
              <Text style={styles.breakdownTotalLabel}>
                Tổng chi {periodLabel}:{' '}
                <Text style={styles.breakdownTotalValue}>
                  {formatCurrency(overviewExpenseTotal)}
                </Text>
              </Text>
              {isOverviewLoading && (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 6 }} />
              )}
            </View>
            <Text style={styles.breakdownCategoriesCount}>
              {overviewExpenseItems.length} danh mục
            </Text>
          </View>

          {isOverviewLoading && overviewExpenseItems.length === 0 ? (
            <View style={styles.overviewLoadingBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.overviewLoadingText}>Đang tải dữ liệu {periodLabel}...</Text>
            </View>
          ) : overviewExpenseItems.length > 0 ? (
            <>
              {/* Stacked Progress Bar động từ Backend */}
              <View style={styles.multiProgressBar}>
                {overviewExpenseItems.map((item, idx) => {
                  const pct = Math.max(
                    3,
                    Math.round((Number(item.total) / totalOverviewBreakdown) * 100),
                  );
                  return (
                    <View
                      key={item.categoryId || idx}
                      style={{
                        flex: pct,
                        backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                      }}
                    />
                  );
                })}
              </View>

              {/* Lưới các danh mục chi tiêu */}
              <View style={styles.grid2x2}>
                {overviewExpenseItems.slice(0, 4).map((item, idx) => {
                  const dotColor = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  const pctVal = Math.round((Number(item.total) / totalOverviewBreakdown) * 100);
                  return (
                    <View
                      key={item.categoryId || idx}
                      style={[
                        styles.gridItemCard,
                        { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
                      ]}
                    >
                      <View style={styles.gridItemRow}>
                        <View style={[styles.categoryDotMini, { backgroundColor: dotColor }]} />
                        <Text style={styles.gridItemCatName} numberOfLines={1}>
                          {item.categoryName || 'Khác'} ({pctVal}%)
                        </Text>
                      </View>
                      <Text style={styles.gridItemAmount}>
                        {formatCurrency(Number(item.total))}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.emptyBlockCentered}>
              <Text style={styles.emptyBlockText}>
                Chưa có khoản chi tiêu nào trong {periodLabel}
                {selectedOverviewWalletId !== 'all' ? ' của ví này' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* ================= 7. NGÂN SÁCH THÁNG (Render động từ BE) ================= */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.budgetTitleWrapper}>
            <Text style={styles.sectionTitle}>
              Ngân sách Tháng {new Date().getMonth() + 1}
            </Text>
            {budgets.length > 0 && (
              <View style={styles.budgetStatusPill}>
                <Text style={styles.budgetStatusPillText}>Đang theo dõi</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(app)/(tabs)/budgets')}
          >
            <Text style={styles.manageLinkText}>Quản lý</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.budgetContainerCard}>
          {budgets.length > 0 ? (
            budgets.slice(0, 3).map((b, idx) => {
              const pct = Math.min(100, Math.round(b.percentUsed || 0));
              const isDanger = b.isOverBudget || pct >= 90;
              const barColor = isDanger ? '#EF4444' : '#10B981';
              const icon = getCategoryIcon(b.categoryName);

              return (
                <View key={b.categoryId}>
                  <View style={styles.budgetItemBlock}>
                    <View style={styles.budgetItemHeader}>
                      <View style={styles.budgetNameRow}>
                        <Ionicons
                          name={icon}
                          size={15}
                          color={barColor}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.budgetNameText}>{b.categoryName || 'Danh mục'}</Text>
                      </View>
                      <Text style={[styles.budgetPercentText, { color: barColor }]}>
                        {Math.round(b.percentUsed || 0)}%
                      </Text>
                    </View>

                    <View style={styles.budgetProgressBarBg}>
                      <View
                        style={[
                          styles.budgetProgressFill,
                          { width: `${pct}%`, backgroundColor: barColor },
                        ]}
                      />
                    </View>

                    <View style={styles.budgetFooterRow}>
                      <Text style={styles.budgetFootSub}>Đã chi: {formatCurrency(b.spent)}</Text>
                      <Text style={styles.budgetFootSub}>
                        Giới hạn: {formatCurrency(b.amountLimit)}
                      </Text>
                    </View>
                  </View>
                  {idx < Math.min(budgets.length, 3) - 1 && <View style={styles.budgetDivider} />}
                </View>
              );
            })
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.emptyBlockCentered}
              onPress={() => router.push('/(app)/(tabs)/budgets')}
            >
              <Ionicons name="pie-chart-outline" size={24} color={colors.primary} />
              <Text style={styles.emptyBlockText}>Chưa thiết lập ngân sách cho tháng này</Text>
              <Text style={styles.emptyBlockSubText}>Chạm để thiết lập hạn mức chi tiêu</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ================= 8. GIAO DỊCH GẦN ĐÂY (Render động từ BE) ================= */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(app)/(tabs)/transactions')}
          >
            <Text style={styles.seeAllLinkText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentTxCard}>
          {recentTransactions.length > 0 ? (
            recentTransactions.map((tx, idx) => {
              const isInc = tx.type === 'income';
              const icon = getCategoryIcon(tx.category?.name, isInc);
              const iconColor = isInc ? '#16A34A' : '#DC2626';
              const iconBg = isInc ? '#DCFCE7' : '#FEE2E2';

              return (
                <View key={tx.id}>
                  <View style={styles.txRowItem}>
                    <View style={[styles.txIconBox, { backgroundColor: iconBg }]}>
                      <Ionicons name={icon} size={17} color={iconColor} />
                    </View>

                    <View style={styles.txContentCol}>
                      <View style={styles.txTitleRow}>
                        <Text style={styles.txTitleText} numberOfLines={1}>
                          {tx.description || tx.category?.name || (isInc ? 'Thu nhập' : 'Chi tiêu')}
                        </Text>
                      </View>
                      <Text style={styles.txSubmetaText} numberOfLines={1}>
                        {tx.category?.name || 'Khác'}
                        {tx.wallet?.name ? ` • ${tx.wallet.name}` : ''}
                        {` • ${formatDate(tx.transactionDate)}`}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.txAmountText,
                        { color: isInc ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {isInc ? '+' : '-'} {formatCurrency(Number(tx.amount))}
                    </Text>
                  </View>
                  {idx < recentTransactions.length - 1 && <View style={styles.txDivider} />}
                </View>
              );
            })
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.emptyBlockCentered}
              onPress={() => router.push('/(app)/add-transaction')}
            >
              <Ionicons name="receipt-outline" size={24} color="#94A3B8" />
              <Text style={styles.emptyBlockText}>Chưa có giao dịch gần đây</Text>
              <Text style={styles.emptyBlockSubText}>Chạm để thêm giao dịch đầu tiên</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal tạo ví mới */}
      <CreateWalletModal
        visible={isWalletModalVisible}
        onClose={() => setIsWalletModalVisible(false)}
        onSubmit={handleCreateWallet}
      />

      {/* Modal chuyển tiền giữa các ví */}
      <TransferMoneyModal
        visible={isTransferModalVisible}
        onClose={() => setIsTransferModalVisible(false)}
        wallets={wallets}
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 14,
  },

  /* 1. Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  appLogoImage: {
    width: '100%',
    height: '100%',
  },
  appNameContainer: {
    justifyContent: 'center',
  },
  appNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  headerBrandSpend: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerBrandWise: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  headerTagline: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: -1,
    letterSpacing: 0.2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  avatarButton: {
    padding: 1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  avatarText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },

  /* 2. Hero Card */
  heroCard: {
    borderRadius: 22,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.card,
  },
  heroWatermark: {
    position: 'absolute',
    right: -20,
    bottom: -20,
  },
  heroBalanceContainer: {
    marginBottom: 18,
  },
  heroBalanceText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroStatPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  statIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statPillTextCol: {
    flex: 1,
  },
  statPillLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
    marginBottom: 1,
  },
  incomePillValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  expensePillValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FCA5A5',
  },

  /* 3. Tài khoản & Ví */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSubLink: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  walletsHorizontalList: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 2,
  },
  walletCardMini: {
    width: 156,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  walletCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  walletMiniIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTagText: {
    fontSize: 10.5,
    fontWeight: '600',
    flex: 1,
  },
  walletCardBottom: {
    gap: 2,
  },
  walletNameText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  walletBalanceText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  addWalletCardMini: {
    width: 100,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addWalletMiniCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addWalletMiniText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyWalletPromptCard: {
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyPromptTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyPromptSub: {
    fontSize: 10.5,
    color: colors.textSecondary,
  },

  /* 4. Quick Actions */
  quickActionsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 0.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  actionCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  aiBadgeMini: {
    position: 'absolute',
    top: -2,
    right: -2,
    borderRadius: 6,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  /* 5. AI Insight Banner */
  aiBannerCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    gap: 8,
  },
  aiBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aiPillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  aiBannerTimeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  aiBannerContent: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  aiHighlightWord: {
    fontWeight: '700',
    color: colors.expense,
  },
  aiBoldWord: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  aiBannerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  aiConfidenceText: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
  aiDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  aiDetailLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },

  /* 6. Tổng quan chi tiêu */
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  segBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  segBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  segBtnText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  segBtnTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  breakdownOverviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    gap: 12,
    ...shadows.sm,
  },
  overviewWalletFilterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
    marginTop: -2,
    marginBottom: 4,
  },
  overviewWalletChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  overviewWalletChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  overviewWalletChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  overviewWalletChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  breakdownTopSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownTotalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  breakdownTotalValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  breakdownCategoriesCount: {
    fontSize: 11,
    color: colors.textMuted,
  },
  overviewLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  overviewLoadingText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  multiProgressBar: {
    height: 7,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItemCard: {
    width: '48.5%',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 0.5,
    gap: 2,
  },
  gridItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  categoryDotMini: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gridItemCatName: {
    fontSize: 10.5,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  gridItemAmount: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textPrimary,
    marginLeft: 11,
  },
  emptyBlockCentered: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyBlockText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyBlockSubText: {
    fontSize: 10.5,
    color: colors.textMuted,
  },

  /* 7. Ngân sách */
  budgetTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  budgetStatusPill: {
    backgroundColor: colors.incomeLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  budgetStatusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.income,
  },
  manageLinkText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  budgetContainerCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    gap: 10,
    ...shadows.sm,
  },
  budgetItemBlock: {
    gap: 6,
  },
  budgetItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  budgetPercentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  budgetProgressBarBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  budgetFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetFootSub: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
  budgetDivider: {
    height: 0.5,
    backgroundColor: colors.borderLight,
    marginVertical: 2,
  },

  /* 8. Giao dịch gần đây */
  seeAllLinkText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  recentTxCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  txRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txContentCol: {
    flex: 1,
    gap: 2,
  },
  txTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  txSubmetaText: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
  txAmountText: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  txDivider: {
    height: 0.5,
    backgroundColor: colors.borderLight,
    marginLeft: 48,
  },
});
