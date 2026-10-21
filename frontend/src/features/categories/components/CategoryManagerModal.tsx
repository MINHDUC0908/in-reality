import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppModal, Button, Badge } from '@/components';
import { colors, typography, spacing, borderRadius } from '@/theme';
import type { Category, CreateCategoryDto } from '../types';
import { categoryApi } from '../api';
import { CreateCategoryModal } from './CreateCategoryModal';

interface CategoryManagerModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  onRefresh: () => Promise<void>;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  visible,
  onClose,
  categories,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  const handleDelete = (cat: Category) => {
    if (cat.isDefault) {
      Alert.alert('Thông báo', 'Đây là danh mục hệ thống mặc định, không thể xóa.');
      return;
    }

    Alert.alert(
      'Xóa danh mục',
      `Bạn có chắc chắn muốn xóa danh mục "${cat.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeletingId(cat.id);
              await categoryApi.deleteCategory(cat.id);
              await onRefresh();
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể xóa danh mục này');
            } finally {
              setIsDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const handleCreateCategory = async (dto: CreateCategoryDto) => {
    await categoryApi.createCategory(dto);
    await onRefresh();
  };

  return (
    <>
      <AppModal visible={visible} onClose={onClose} title="Quản lý danh mục">
        <View style={styles.container}>
          {/* Segmented Switch Chi tiêu / Thu nhập */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveTab('expense')}
              style={[
                styles.tabBtn,
                activeTab === 'expense' && styles.tabBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'expense' && styles.tabBtnTextActive,
                ]}
              >
                Chi tiêu ({categories.filter((c) => c.type === 'expense').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveTab('income')}
              style={[
                styles.tabBtn,
                activeTab === 'income' && styles.tabBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'income' && styles.tabBtnTextActive,
                ]}
              >
                Thu nhập ({categories.filter((c) => c.type === 'income').length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Danh sách danh mục */}
          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {filteredCategories.map((cat) => (
              <View key={cat.id} style={styles.categoryRow}>
                <View style={styles.catLeft}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor:
                          cat.type === 'income'
                            ? colors.incomeLight
                            : colors.expenseLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        cat.type === 'income'
                          ? 'arrow-down-circle'
                          : 'arrow-up-circle'
                      }
                      size={16}
                      color={
                        cat.type === 'income' ? colors.income : colors.expense
                      }
                    />
                  </View>
                  <Text style={styles.catName}>{cat.name}</Text>
                </View>

                <View style={styles.catRight}>
                  {cat.isDefault ? (
                    <Badge label="Mặc định" variant="default" />
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.6}
                      onPress={() => handleDelete(cat)}
                      disabled={isDeletingId === cat.id}
                      style={styles.deleteBtn}
                    >
                      {isDeletingId === cat.id ? (
                        <ActivityIndicator size="small" color={colors.expense} />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color={colors.expense}
                        />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Nút thêm danh mục mới */}
          <Button
            title="+ Thêm danh mục mới"
            variant="primary"
            size="md"
            onPress={() => setIsAddModalOpen(true)}
            style={styles.addBtn}
          />
        </View>
      </AppModal>

      {/* Modal nhập tên danh mục */}
      <CreateCategoryModal
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        initialType={activeTab}
        onSubmit={handleCreateCategory}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 420,
    gap: spacing.sm,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    padding: 3,
    borderRadius: borderRadius.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.surface,
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabBtnText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  scrollList: {
    maxHeight: 280,
    marginTop: spacing.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  catRight: {
    marginLeft: spacing.sm,
  },
  deleteBtn: {
    padding: 6,
  },
  addBtn: {
    marginTop: spacing.xs,
  },
});
