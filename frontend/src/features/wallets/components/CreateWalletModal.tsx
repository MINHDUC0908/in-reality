import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { AppModal, Input, Button } from '@/components';
import { spacing } from '@/theme';
import type { CreateWalletDto } from '../types';

interface CreateWalletModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateWalletDto) => Promise<void>;
}

export const CreateWalletModal: React.FC<CreateWalletModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('VND');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên ví');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        balance: balance ? parseFloat(balance.replace(/[^0-9.]/g, '')) || 0 : 0,
        currency: currency.trim() || 'VND',
      });
      setName('');
      setBalance('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể tạo ví. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal visible={visible} onClose={onClose} title="Thêm ví mới">
      <View style={styles.form}>
        <Input
          label="Tên ví *"
          placeholder="Ví tiền mặt, MB Bank, MoMo..."
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (error) setError(null);
          }}
          error={error || undefined}
        />

        <Input
          label="Số dư ban đầu"
          placeholder="0"
          value={balance}
          onChangeText={setBalance}
          keyboardType="numeric"
          helperText="Đơn vị tiền tệ: VND"
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
            title={isSubmitting ? 'Đang tạo...' : 'Tạo ví'}
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
    gap: spacing.xs,
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
