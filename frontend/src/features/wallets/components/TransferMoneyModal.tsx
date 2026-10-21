import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';
import { walletApi } from '../api';
import type { Wallet } from '../types';
import { formatCurrency } from '@/utils/format';
import { useRefreshStore } from '@/lib/refreshStore';

interface TransferMoneyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  wallets: Wallet[];
}

const PRESET_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000];

export function TransferMoneyModal({
  visible,
  onClose,
  onSuccess,
  wallets,
}: TransferMoneyModalProps) {
  const [fromWalletId, setFromWalletId] = useState<string>('');
  const [toWalletId, setToWalletId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible && wallets.length >= 2) {
      if (!fromWalletId || !wallets.find((w) => w.id === fromWalletId)) {
        setFromWalletId(wallets[0].id);
      }
      if (!toWalletId || toWalletId === wallets[0].id || !wallets.find((w) => w.id === toWalletId)) {
        const other = wallets.find((w) => w.id !== wallets[0].id);
        setToWalletId(other ? other.id : wallets[1].id);
      }
    }
  }, [visible, wallets]);

  const fromWallet = wallets.find((w) => w.id === fromWalletId);
  const toWallet = wallets.find((w) => w.id === toWalletId);

  const handleSwap = () => {
    const temp = fromWalletId;
    setFromWalletId(toWalletId);
    setToWalletId(temp);
  };

  const handleAmountChange = (text: string) => {
    // Chỉ giữ số
    const cleanNumber = text.replace(/[^0-9]/g, '');
    setAmountStr(cleanNumber);
  };

  const handleApplyPreset = (value: number) => {
    const current = parseInt(amountStr || '0', 10);
    setAmountStr(String(current + value));
  };

  const handleSelectMax = () => {
    if (fromWallet && Number(fromWallet.balance) > 0) {
      setAmountStr(String(Math.floor(Number(fromWallet.balance))));
    }
  };

  const handleTransfer = async () => {
    if (!fromWalletId || !toWalletId) {
      Alert.alert('Lỗi', 'Vui lòng chọn ví nguồn và ví đích');
      return;
    }

    if (fromWalletId === toWalletId) {
      Alert.alert('Lỗi', 'Ví nguồn và ví nhận tiền không được trùng nhau');
      return;
    }

    const numAmount = parseInt(amountStr, 10);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ (> 0)');
      return;
    }

    if (fromWallet && Number(fromWallet.balance) < numAmount) {
      Alert.alert(
        'Số dư không đủ',
        `Ví "${fromWallet.name}" hiện chỉ có ${formatCurrency(Number(fromWallet.balance))}, không đủ chuyển ${formatCurrency(numAmount)}`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await walletApi.transferMoney({
        fromWalletId,
        toWalletId,
        amount: numAmount,
        note: note.trim() || undefined,
        date: new Date().toISOString().slice(0, 10),
      });

      Alert.alert(
        'Thành công',
        `Đã chuyển ${formatCurrency(numAmount)} từ ${fromWallet?.name} sang ${toWallet?.name}`,
      );

      // Kích hoạt làm mới toàn cục
      useRefreshStore.getState().triggerRefresh();
      setAmountStr('');
      setNote('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      Alert.alert('Lỗi chuyển tiền', err.message || 'Không thể thực hiện chuyển tiền');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Chuyển tiền giữa các ví</Text>
                <Text style={styles.headerSubtitle}>Điều chuyển số dư nội bộ an toàn</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            {/* Wallet Selection Row */}
            <View style={styles.transferPairContainer}>
              {/* Ví nguồn */}
              <View style={styles.walletBox}>
                <Text style={styles.walletBoxLabel}>VÍ NGUỒN (TRỪ)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                  {wallets.map((w) => {
                    const isSelected = w.id === fromWalletId;
                    return (
                      <TouchableOpacity
                        key={w.id}
                        activeOpacity={0.7}
                        onPress={() => setFromWalletId(w.id)}
                        style={[
                          styles.walletChip,
                          isSelected && styles.walletChipActiveFrom,
                        ]}
                      >
                        <Text
                          style={[
                            styles.walletChipText,
                            isSelected && styles.walletChipTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {w.name}
                        </Text>
                        <Text style={styles.walletChipSub}>
                          {formatCurrency(Number(w.balance))}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Nút Swap đổi chiều */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSwap}
                style={styles.swapBtn}
              >
                <Ionicons name="sync" size={16} color={colors.primary} />
              </TouchableOpacity>

              {/* Ví đích */}
              <View style={styles.walletBox}>
                <Text style={styles.walletBoxLabel}>VÍ ĐÍCH (NHẬN)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                  {wallets.map((w) => {
                    const isSelected = w.id === toWalletId;
                    const isSameAsFrom = w.id === fromWalletId;
                    return (
                      <TouchableOpacity
                        key={w.id}
                        activeOpacity={0.7}
                        disabled={isSameAsFrom}
                        onPress={() => setToWalletId(w.id)}
                        style={[
                          styles.walletChip,
                          isSelected && styles.walletChipActiveTo,
                          isSameAsFrom && styles.walletChipDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.walletChipText,
                            isSelected && styles.walletChipTextActive,
                            isSameAsFrom && styles.walletChipTextDisabled,
                          ]}
                          numberOfLines={1}
                        >
                          {w.name}
                        </Text>
                        <Text style={styles.walletChipSub}>
                          {formatCurrency(Number(w.balance))}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Input Amount */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeaderRow}>
                <Text style={styles.fieldLabel}>Số tiền muốn chuyển</Text>
                {fromWallet && (
                  <TouchableOpacity onPress={handleSelectMax}>
                    <Text style={styles.maxText}>Chuyển toàn bộ</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencyPrefix}>VNĐ</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={amountStr ? Number(amountStr).toLocaleString('vi-VN') : ''}
                  onChangeText={handleAmountChange}
                />
                {amountStr ? (
                  <TouchableOpacity onPress={() => setAmountStr('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Preset Buttons */}
              <View style={styles.presetRow}>
                {PRESET_AMOUNTS.map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={styles.presetPill}
                    onPress={() => handleApplyPreset(val)}
                  >
                    <Text style={styles.presetPillText}>
                      +{val >= 1000000 ? `${val / 1000000}tr` : `${val / 1000}k`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Ghi chú */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>Ghi chú (Tùy chọn)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="VD: Chuyển tiền tiết kiệm, đổi ví chi tiêu..."
                placeholderTextColor={colors.textMuted}
                value={note}
                onChangeText={setNote}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                style={styles.cancelBtn}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleTransfer}
                style={[
                  styles.submitBtn,
                  (!amountStr || isSubmitting) && styles.submitBtnDisabled,
                ]}
                disabled={!amountStr || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="checkmark-sharp" size={18} color={colors.textInverse} />
                    <Text style={styles.submitBtnText}>Xác nhận chuyển</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
    maxHeight: '90%',
    ...shadows.floating,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.screenTitle,
    fontSize: 16,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  transferPairContainer: {
    gap: spacing.xs,
    position: 'relative',
  },
  walletBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  walletBoxLabel: {
    ...typography.captionMedium,
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  pickerScroll: {
    flexDirection: 'row',
  },
  walletChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: 8,
    minWidth: 100,
  },
  walletChipActiveFrom: {
    borderColor: colors.expense,
    backgroundColor: colors.expenseLight,
  },
  walletChipActiveTo: {
    borderColor: colors.income,
    backgroundColor: colors.incomeLight,
  },
  walletChipDisabled: {
    opacity: 0.35,
  },
  walletChipText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.textPrimary,
  },
  walletChipTextActive: {
    fontWeight: '700',
  },
  walletChipTextDisabled: {
    color: colors.textMuted,
  },
  walletChipSub: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  swapBtn: {
    alignSelf: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: -8,
    zIndex: 10,
    ...shadows.sm,
  },
  fieldSection: {
    gap: 6,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  maxText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  currencyPrefix: {
    ...typography.captionMedium,
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 8,
    fontWeight: '700',
  },
  amountInput: {
    flex: 1,
    ...typography.heroAmount,
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  presetPillText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  noteInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.body,
    fontSize: 13,
    color: colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    ...typography.captionMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  submitBtnDisabled: {
    backgroundColor: colors.borderDark,
    elevation: 0,
    shadowOpacity: 0,
  },
  submitBtnText: {
    ...typography.captionMedium,
    fontSize: 13,
    color: colors.textInverse,
    fontWeight: '700',
  },
});
