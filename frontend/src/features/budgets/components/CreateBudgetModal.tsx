import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AppModal, Input, Button } from '@/components';
import { colors, typography, spacing, borderRadius } from '@/theme';
import type { Category } from '@/features/categories/types';
import type { CreateBudgetDto } from '../types';

interface CreateBudgetModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  currentMonth: number;
  currentYear: number;
  onSubmit: (dto: CreateBudgetDto) => Promise<void>;
}

export const CreateBudgetModal: React.FC<CreateBudgetModalProps> = ({
  visible,
  onClose,
  categories,
  currentMonth,
  currentYear,
  onSubmit,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [amountLimit, setAmountLimit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lọc chỉ các category thuộc loại expense
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const handleSubmit = async () => {
    if (!selectedCategoryId) {
      setError('Vui lòng chọn danh mục chi tiêu');
      return;
    }

    const limitNum = parseFloat(amountLimit.replace(/[^0-9.]/g, ''));
    if (!limitNum || limitNum <= 0) {
      setError('Vui lòng nhập hạn mức hợp lệ (> 0)');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        categoryId: selectedCategoryId,
        amountLimit: limitNum,
        month: currentMonth,
        year: currentYear,
      });
      setSelectedCategoryId('');
      setAmountLimit('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể thiết lập ngân sách');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={`Ngân sách tháng ${currentMonth}/${currentYear}`}
    >
      <View style={styles.form}>
        <Text style={styles.label}>Chọn danh mục chi tiêu *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {expenseCategories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedCategoryId(cat.id);
                  if (error) setError(null);
                }}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Input
          label="Hạn mức chi tiêu tối đa (VND) *"
          placeholder="VD: 3.000.000"
          value={amountLimit}
          onChangeText={(text) => {
            setAmountLimit(text);
            if (error) setError(null);
          }}
          keyboardType="numeric"
          error={error || undefined}
        />

        <View style={styles.buttonGroup}>
          <Button
            title="Hủy"
            variant="outline"
            onPress={onClose}
            style={styles.cancelBtn}
            disabled={isSubmitting}
          />
          <Button
            title={isSubmitting ? 'Đang lưu...' : 'Lưu ngân sách'}
            variant="primary"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            style={styles.submitBtn}
          />
        </View>
      </View>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: spacing.sm,
  },
  label: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  categoryList: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  categoryChipTextSelected: {
    color: colors.textInverse,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
});
