import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader, Button, Badge } from '@/components';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';
import { useAuthStore } from '@/lib/store';
import { formatDate, formatCurrency } from '@/utils/format';
import { storage } from '@/utils/storage';
import { categoryApi, type Category, CategoryManagerModal } from '@/features/categories';
import { walletApi, type Wallet } from '@/features/wallets';
import { transactionApi } from '@/features/transactions';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  // Core states
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [totalTxCount, setTotalTxCount] = useState<number>(0);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Preference states (Stored in SecureStore)
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isDailyReminderEnabled, setIsDailyReminderEnabled] = useState(true);
  const [isRoundUpEnabled, setIsRoundUpEnabled] = useState(false);
  const [currency, setCurrency] = useState<'VND' | 'USD'>('VND');

  // Time-Cost Reality Check states
  const [isTimeCostModalOpen, setIsTimeCostModalOpen] = useState(false);
  const [monthlyIncomeInput, setMonthlyIncomeInput] = useState('12000000');
  const [workingDaysInput, setWorkingDaysInput] = useState('22');
  const [dailyHoursInput, setDailyHoursInput] = useState('8');
  const [savedHourlyRate, setSavedHourlyRate] = useState<number | null>(null);

  // Currency modal
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);

  // Load initial data
  const loadProfileStats = useCallback(async () => {
    try {
      const [cList, wList, txRes] = await Promise.all([
        categoryApi.getCategories().catch(() => []),
        walletApi.getWallets().catch(() => []),
        transactionApi.getTransactions({ limit: 1 }).catch(() => null),
      ]);

      setCategories(cList || []);
      setWallets(wList || []);
      if (txRes?.meta?.total !== undefined) {
        setTotalTxCount(txRes.meta.total);
      }
    } catch (e) {
      console.warn('Failed to load profile stats:', e);
    }
  }, []);

  // Load preferences from storage
  const loadPreferences = useCallback(async () => {
    try {
      const [bio, rem, round, cur, rate] = await Promise.all([
        storage.getItem('pref_biometrics'),
        storage.getItem('pref_reminder'),
        storage.getItem('pref_roundup'),
        storage.getItem('pref_currency'),
        storage.getItem('pref_hourly_rate'),
      ]);

      if (bio !== null) setIsBiometricEnabled(bio === 'true');
      if (rem !== null) setIsDailyReminderEnabled(rem === 'true');
      if (round !== null) setIsRoundUpEnabled(round === 'true');
      if (cur) setCurrency(cur as 'VND' | 'USD');
      if (rate) setSavedHourlyRate(Number(rate));
    } catch (e) {
      console.warn('Failed to load preferences:', e);
    }
  }, []);

  useEffect(() => {
    loadProfileStats();
    loadPreferences();
  }, [loadProfileStats, loadPreferences]);

  // Preference handlers
  const handleToggleBiometrics = async (val: boolean) => {
    setIsBiometricEnabled(val);
    await storage.setItem('pref_biometrics', String(val));
  };

  const handleToggleReminder = async (val: boolean) => {
    setIsDailyReminderEnabled(val);
    await storage.setItem('pref_reminder', String(val));
  };

  const handleToggleRoundUp = async (val: boolean) => {
    setIsRoundUpEnabled(val);
    await storage.setItem('pref_roundup', String(val));
  };

  const handleSelectCurrency = async (curr: 'VND' | 'USD') => {
    setCurrency(curr);
    await storage.setItem('pref_currency', curr);
    setIsCurrencyModalOpen(false);
  };

  // Save Time-Cost Reality
  const handleSaveTimeCost = async () => {
    const income = Number(monthlyIncomeInput.replace(/[^0-9]/g, '')) || 0;
    const days = Number(workingDaysInput) || 22;
    const hours = Number(dailyHoursInput) || 8;

    if (income <= 0 || days <= 0 || hours <= 0) {
      Alert.alert('Thông tin chưa hợp lệ', 'Vui lòng nhập mức thu nhập và thời gian làm việc hợp lệ.');
      return;
    }

    const calculatedHourly = Math.round(income / (days * hours));
    setSavedHourlyRate(calculatedHourly);
    await storage.setItem('pref_hourly_rate', String(calculatedHourly));
    setIsTimeCostModalOpen(false);
    Alert.alert(
      'Kích hoạt thành công',
      `1 giờ làm việc của bạn được định giá là ${formatCurrency(calculatedHourly)}. App sẽ nhắc nhở thời gian bạn cần lao động khi chi tiêu!`,
    );
  };

  // Export Excel
  const handleExportData = async () => {
    try {
      setIsExporting(true);
      await transactionApi.exportExcel();
    } catch (err: any) {
      Alert.alert('Xuất dữ liệu thất bại', err.message || 'Không thể tạo file xuất dữ liệu.');
    } finally {
      setIsExporting(false);
    }
  };

  // Clear cache
  const handleClearCache = async () => {
    Alert.alert(
      'Làm mới bộ nhớ đệm',
      'Thao tác này sẽ tải lại dữ liệu mới nhất từ máy chủ mà không làm mất thông tin tài khoản của bạn.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Làm mới ngay',
          onPress: async () => {
            await loadProfileStats();
            Alert.alert('Thành công', 'Bộ nhớ đệm đã được làm mới sạch sẽ!');
          },
        },
      ],
    );
  };

  // Logout
  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi SpendWise?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await logout();
            router.replace('/(auth)/login');
          } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể đăng xuất');
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const firstLetter = user?.fullName
    ? user.fullName.charAt(0).toUpperCase()
    : 'U';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="Cá nhân" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= 1. USER PROFILE CARD VỚI BADGE & STATS ================= */}
        <View style={styles.userCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>{firstLetter}</Text>
              <View style={styles.onlineBadge} />
            </View>

            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.fullName || 'Người dùng'}
                </Text>
                <View style={styles.proTag}>
                  <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                  <Text style={styles.proTagText}>Pro</Text>
                </View>
              </View>
              <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
              <Text style={styles.userJoinDate}>
                Thành viên từ {user?.createdAt ? formatDate(user.createdAt) : 'Gần đây'}
              </Text>
            </View>
          </View>

          {/* Quick Stats Bar */}
          <View style={styles.statsDivider} />
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{wallets.length}</Text>
              <Text style={styles.statLabel}>Ví chi tiêu</Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalTxCount}</Text>
              <Text style={styles.statLabel}>Giao dịch</Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{categories.length}</Text>
              <Text style={styles.statLabel}>Danh mục</Text>
            </View>
          </View>
        </View>

        {/* ================= 2. TÍNH NĂNG ĐỘC ĐÁO & THÔNG MINH ================= */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>TÍNH NĂNG TÀI CHÍNH THÔNG MINH</Text>

          <View style={styles.settingsGroup}>
            {/* Quy đổi giá trị giờ làm việc */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsTimeCostModalOpen(true)}
              style={styles.settingsRow}
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="hourglass-outline" size={16} color={colors.primary} />
                </View>
                <View style={styles.labelCol}>
                  <Text style={styles.settingsLabel}>Quy đổi "Giờ làm việc"</Text>
                  <Text style={styles.settingsSubLabel}>
                    {savedHourlyRate
                      ? `Đang áp dụng: ${formatCurrency(savedHourlyRate)}/giờ`
                      : 'Cân nhắc mua sắm bốc đồng theo công sức'}
                  </Text>
                </View>
              </View>
              <View style={styles.badgeRow}>
                {savedHourlyRate ? (
                  <Badge label="Đang bật" variant="success" dot />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Hũ tích lũy làm tròn số lẻ (Micro-saving) */}
            <View style={styles.settingsRow}>
              <View style={styles.settingsLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.accentWarmLight }]}>
                  <Ionicons name="wallet-outline" size={16} color={colors.accentWarm} />
                </View>
                <View style={styles.labelCol}>
                  <Text style={styles.settingsLabel}>Làm tròn số lẻ tiết kiệm</Text>
                  <Text style={styles.settingsSubLabel}>
                    {isRoundUpEnabled ? 'Tích lũy ~140.000 ₫ tháng này' : 'Tự động gom số lẻ vào hũ tích lũy'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isRoundUpEnabled}
                onValueChange={handleToggleRoundUp}
                trackColor={{ false: colors.borderDark, true: colors.primary }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : isRoundUpEnabled ? '#FFFFFF' : '#F1F5F9'}
              />
            </View>

            <View style={styles.rowDivider} />

            {/* Quản lý danh mục */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsCategoryModalOpen(true)}
              style={styles.settingsRow}
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.secondaryLight }]}>
                  <Ionicons name="pricetags-outline" size={16} color={colors.secondary} />
                </View>
                <View style={styles.labelCol}>
                  <Text style={styles.settingsLabel}>Quản lý danh mục thu chi</Text>
                  <Text style={styles.settingsSubLabel}>{categories.length} danh mục đang hoạt động</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= 3. QUẢN LÝ DỮ LIỆU & BÁO CÁO ================= */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>DỮ LIỆU & SAO LƯU</Text>

          <View style={styles.settingsGroup}>
            {/* Xuất file Excel / CSV */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleExportData}
              disabled={isExporting}
              style={styles.settingsRow}
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.incomeLight }]}>
                  <Ionicons name="download-outline" size={16} color={colors.income} />
                </View>
                <View style={styles.labelCol}>
                  <Text style={styles.settingsLabel}>Xuất sao lưu (Excel / CSV)</Text>
                  <Text style={styles.settingsSubLabel}>Tải về toàn bộ lịch sử chi tiêu</Text>
                </View>
              </View>
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="share-outline" size={16} color={colors.primary} />
              )}
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Đơn vị tiền tệ */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsCurrencyModalOpen(true)}
              style={styles.settingsRow}
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons name="cash-outline" size={16} color={colors.textPrimary} />
                </View>
                <View style={styles.labelCol}>
                  <Text style={styles.settingsLabel}>Đơn vị tiền tệ chính</Text>
                  <Text style={styles.settingsSubLabel}>Định dạng hiển thị trên toàn app</Text>
                </View>
              </View>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyBadgeText}>{currency === 'VND' ? 'VNĐ (₫)' : 'USD ($)'}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Làm mới bộ nhớ đệm */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClearCache}
              style={styles.settingsRow}
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
                </View>
                <View style={styles.labelCol}>
                  <Text style={styles.settingsLabel}>Làm mới bộ nhớ đệm</Text>
                  <Text style={styles.settingsSubLabel}>Cập nhật lại số liệu nhanh nhất</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= 4. BẢO MẬT & THÔNG BÁO ================= */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>BẢO MẬT & THÔNG BÁO</Text>

          <View style={styles.settingsGroup}>
            {/* Sinh trắc học */}
            <View style={styles.settingsRow}>
              <View style={styles.settingsLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="finger-print-outline" size={16} color={colors.primary} />
                </View>
                <View style={styles.labelCol}>
                  <Text style={styles.settingsLabel}>Khóa Face ID / Vân tay</Text>
                  <Text style={styles.settingsSubLabel}>Bảo vệ riêng tư khi mở ứng dụng</Text>
                </View>
              </View>
              <Switch
                value={isBiometricEnabled}
                onValueChange={handleToggleBiometrics}
                trackColor={{ false: colors.borderDark, true: colors.primary }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : isBiometricEnabled ? '#FFFFFF' : '#F1F5F9'}
              />
            </View>

            <View style={styles.rowDivider} />

            {/* Nhắc nhở ghi chép mỗi tối */}
            <View style={styles.settingsRow}>
              <View style={styles.settingsLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.accentWarmLight }]}>
                  <Ionicons name="notifications-outline" size={16} color={colors.accentWarm} />
                </View>
                <View style={styles.labelCol}>
                  <Text style={styles.settingsLabel}>Nhắc ghi chép 20:00 mỗi tối</Text>
                  <Text style={styles.settingsSubLabel}>Duy trì thói quen kiểm soát tài chính</Text>
                </View>
              </View>
              <Switch
                value={isDailyReminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: colors.borderDark, true: colors.primary }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : isDailyReminderEnabled ? '#FFFFFF' : '#F1F5F9'}
              />
            </View>
          </View>
        </View>
        {/* ================= 6. THÔNG TIN PHIÊN BẢN & ĐĂNG XUẤT ================= */}
        <View style={styles.footerCol}>
          <Button
            title={isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất tài khoản'}
            variant="outline"
            size="md"
            leftIcon={<Ionicons name="log-out-outline" size={16} color={colors.expense} />}
            textStyle={{ color: colors.expense, fontSize: 13, fontWeight: '700' }}
            style={styles.logoutBtn}
            onPress={handleLogout}
            isLoading={isLoggingOut}
          />
        </View>
      </ScrollView>

      {/* ================= MODAL QUẢN LÝ DANH MỤC ================= */}
      <CategoryManagerModal
        visible={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          loadProfileStats();
        }}
        categories={categories}
        onRefresh={loadProfileStats}
      />

      {/* ================= MODAL CÀI ĐẶT "QUY ĐỔI GIỜ LÀM VIỆC" ================= */}
      <Modal
        visible={isTimeCostModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTimeCostModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="hourglass" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Quy đổi "Giờ làm việc"</Text>
                <Text style={styles.modalSubtitle}>Định giá giá trị thời gian lao động của bạn</Text>
              </View>
              <TouchableOpacity onPress={() => setIsTimeCostModalOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Nhập mức thu nhập trung bình và số giờ làm việc. App sẽ tự động tính xem mỗi giờ của bạn trị giá bao nhiêu tiền để giúp bạn suy nghĩ kỹ trước khi mua sắm bốc đồng.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Thu nhập hàng tháng (VNĐ)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={monthlyIncomeInput}
                onChangeText={setMonthlyIncomeInput}
                placeholder="12000000"
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Ngày làm / tháng</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={workingDaysInput}
                  onChangeText={setWorkingDaysInput}
                  placeholder="22"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Số giờ làm / ngày</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={dailyHoursInput}
                  onChangeText={setDailyHoursInput}
                  placeholder="8"
                />
              </View>
            </View>

            {/* Live calculation preview */}
            {(() => {
              const inc = Number(monthlyIncomeInput.replace(/[^0-9]/g, '')) || 0;
              const d = Number(workingDaysInput) || 1;
              const h = Number(dailyHoursInput) || 1;
              const perHour = Math.round(inc / (d * h));
              return (
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Mỗi giờ làm việc của bạn trị giá:</Text>
                  <Text style={styles.previewValue}>{formatCurrency(perHour)} / giờ</Text>
                  <Text style={styles.previewSub}>
                    Ví dụ: Món đồ 300.000 ₫ = ~{Math.round((300000 / perHour) * 10) / 10} giờ làm việc của bạn.
                  </Text>
                </View>
              );
            })()}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsTimeCostModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveTimeCost}
              >
                <Text style={styles.modalSaveText}>Lưu thiết lập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL CHỌN TIỀN TỆ ================= */}
      <Modal
        visible={isCurrencyModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCurrencyModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.currencyModalCard}>
            <Text style={styles.modalTitle}>Chọn đơn vị tiền tệ</Text>
            <Text style={styles.modalSubtitle}>Định dạng số tiền hiển thị trong ứng dụng</Text>

            <TouchableOpacity
              style={[styles.currencyOption, currency === 'VND' && styles.currencyOptionActive]}
              onPress={() => handleSelectCurrency('VND')}
            >
              <View style={styles.currencyOptionLeft}>
                <Text style={styles.currencySymbol}>₫</Text>
                <Text style={styles.currencyName}>Việt Nam Đồng (VNĐ)</Text>
              </View>
              {currency === 'VND' && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.currencyOption, currency === 'USD' && styles.currencyOptionActive]}
              onPress={() => handleSelectCurrency('USD')}
            >
              <View style={styles.currencyOptionLeft}>
                <Text style={styles.currencySymbol}>$</Text>
                <Text style={styles.currencyName}>Đô la Mỹ (USD)</Text>
              </View>
              {currency === 'USD' && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeCurrencyBtn}
              onPress={() => setIsCurrencyModalOpen(false)}
            >
              <Text style={styles.closeCurrencyText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },

  /* 1. User Profile Card */
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 0.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...shadows.sm,
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textInverse,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.income,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  proTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  userJoinDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* Quick Stats Row */
  statsDivider: {
    height: 0.5,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statSeparator: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  /* Section Groups */
  sectionBlock: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  settingsGroup: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    ...shadows.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelCol: {
    flex: 1,
    gap: 2,
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  settingsSubLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  rowDivider: {
    height: 0.5,
    backgroundColor: colors.borderLight,
  },

  /* AI Status Card */
  aiStatusCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    gap: 8,
  },
  aiStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  aiTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  aiFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiFeatureText: {
    fontSize: 11.5,
    color: colors.textSecondary,
  },

  /* Footer & Logout */
  footerCol: {
    gap: 12,
    marginTop: 4,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: '500',
  },
  logoutBtn: {
    width: '100%',
    borderColor: colors.expenseBorder,
    backgroundColor: colors.surface,
    borderRadius: 14,
    height: 48,
  },

  /* Modal Time-Cost Reality */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
    gap: 14,
    ...shadows.floating,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  modalDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  inputGroup: {
    gap: 4,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
  },
  previewBox: {
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    gap: 2,
  },
  previewLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  previewValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  previewSub: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Currency Modal */
  currencyModalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  currencyOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  currencyOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    width: 24,
    textAlign: 'center',
  },
  currencyName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeCurrencyBtn: {
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  closeCurrencyText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
