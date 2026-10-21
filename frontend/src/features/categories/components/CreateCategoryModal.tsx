import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppModal, Input, Button } from '@/components';
import { colors, typography, spacing, borderRadius } from '@/theme';
import type { CreateCategoryDto } from '../types';

interface CreateCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  initialType?: 'expense' | 'income';
  onSubmit: (dto: CreateCategoryDto) => Promise<void>;
}

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  visible,
  onClose,
  initialType = 'expense',
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(initialType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cập nhật lại initialType khi modal mở
  React.useEffect(() => {
    if (visible) {
      setType(initialType);
      setName('');
      setError(null);
    }
  }, [visible, initialType]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên danh mục');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        type,
      });
      setName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể tạo danh mục. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal visible={visible} onClose={onClose} title="Thêm danh mục mới">
      <View style={styles.form}>
        {/* Toggle loại danh mục: Chi tiêu hay Thu nhập */}
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
              Chi tiêu
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
              Thu nhập
            </Text>
          </TouchableOpacity>
        </View>

        <Input
          label="Tên danh mục *"
          placeholder="VD: Ăn ngoài, Học phí, Lương thưởng..."
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (error) setError(null);
          }}
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
            title={isSubmitting ? 'Đang tạo...' : 'Tạo danh mục'}
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
  toggleSegment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    padding: 3,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
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
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
});
