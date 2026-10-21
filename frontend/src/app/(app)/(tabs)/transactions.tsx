import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, EmptyState } from '@/components';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';
import {
  transactionApi,
  type Transaction,
  type FilterTransactionDto,
  TransactionItem,
} from '@/features/transactions';
import { walletApi, type Wallet } from '@/features/wallets';
import { categoryApi, type Category } from '@/features/categories';
import { useRefreshStore } from '@/lib/refreshStore';

export default function TransactionsScreen() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filter states
  const [selectedWalletId, setSelectedWalletId] = useState<string | undefined>(undefined);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income'>('all');
  const [keyword, setKeyword] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Pagination & Loading states
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Debounce search
  const searchTimeoutRef = useRef<any>(null);

  useEffect(() => {
    Promise.all([walletApi.getWallets(), categoryApi.getCategories()])
      .then(([wList, cList]) => {
        setWallets(wList || []);
        setCategories(cList || []);
      })
      .catch(() => {});
  }, []);

  const fetchTransactions = useCallback(
    async (pageToLoad: number = 1, append: boolean = false) => {
      try {
        const filter: FilterTransactionDto = {
          page: pageToLoad,
          limit: 15,
          walletId: selectedWalletId,
          type: selectedType === 'all' ? undefined : selectedType,
          categoryId: selectedCategoryId,
          keyword: keyword.trim() || undefined,
        };

        const res = await transactionApi.getTransactions(filter);
        const data = res.data || [];

        if (append) {
          setTransactions((prev) => [...prev, ...data]);
        } else {
          setTransactions(data);
        }

        setPage(pageToLoad);
        setHasNextPage(res.meta?.hasNextPage || false);
      } catch (err: any) {
        console.error('Lỗi tải danh sách giao dịch', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [selectedWalletId, selectedType, selectedCategoryId, keyword],
  );

  const refreshKey = useRefreshStore((state) => state.refreshKey);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchTransactions(1, false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [selectedWalletId, selectedType, selectedCategoryId, keyword, refreshKey, fetchTransactions]);

  useFocusEffect(
    useCallback(() => {
      walletApi.getWallets().then(setWallets).catch(() => {});
      categoryApi.getCategories().then(setCategories).catch(() => {});
      fetchTransactions(1, false);
    }, [fetchTransactions]),
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchTransactions(1, false);
  };

  const onLoadMore = () => {
    if (hasNextPage && !isLoadingMore && !isLoading) {
      setIsLoadingMore(true);
      fetchTransactions(page + 1, true);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const filter: FilterTransactionDto = {
        walletId: selectedWalletId,
        type: selectedType === 'all' ? undefined : selectedType,
        categoryId: selectedCategoryId,
        keyword: keyword.trim() || undefined,
      };

      await transactionApi.exportExcel(filter);
    } catch (err: any) {
      Alert.alert('Lỗi xuất Excel', err.message || 'Không thể tạo file báo cáo lúc này');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = (tx: Transaction) => {
    Alert.alert(
      'Xóa giao dịch',
      'Bạn có chắc chắn muốn xóa giao dịch này? Số dư ví sẽ được hoàn tác tương ứng.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionApi.deleteTransaction(tx.id);
              setTransactions((prev) => prev.filter((item) => item.id !== tx.id));
              useRefreshStore.getState().triggerRefresh();
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể xóa giao dịch');
            }
          },
        },
      ],
    );
  };

  // Lọc category hiển thị theo type được chọn
  const filteredCategories = categories.filter((c) => {
    if (selectedType === 'all') return true;
    return c.type === selectedType;
  });

  const renderHeader = () => (
    <View style={styles.filterSection}>
      {/* Thanh tìm kiếm & lọc nhanh */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo ghi chú, tên cửa hàng..."
          placeholderTextColor={colors.textMuted}
          value={keyword}
          onChangeText={setKeyword}
          returnKeyType="search"
        />
        {keyword ? (
          <Pressable
            onPress={() => setKeyword('')}
            style={styles.clearSearchBtn}
          >
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Phân đoạn Thu / Chi tinh tế */}
      <View style={styles.segmentedControl}>
        {(['all', 'expense', 'income'] as const).map((t) => {
          const isSelected = selectedType === t;
          const label =
            t === 'all' ? 'Tất cả' : t === 'expense' ? 'Khoản chi' : 'Khoản thu';
          return (
            <TouchableOpacity
              key={t}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedType(t);
                setSelectedCategoryId(undefined); // Reset category filter if switching type
              }}
              style={[
                styles.segmentTab,
                isSelected && styles.segmentTabActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  isSelected && styles.segmentTabTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bộ lọc ví dạng chip ngang */}
      {wallets.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedWalletId(undefined)}
            style={[
              styles.filterPill,
              !selectedWalletId && styles.filterPillSelected,
            ]}
          >
            <Ionicons
              name="wallet-outline"
              size={12}
              color={!selectedWalletId ? colors.primary : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterPillText,
                !selectedWalletId && styles.filterPillTextSelected,
              ]}
            >
              Tất cả ví
            </Text>
          </TouchableOpacity>
          {wallets.map((w) => {
            const isSelected = selectedWalletId === w.id;
            return (
              <TouchableOpacity
                key={w.id}
                activeOpacity={0.7}
                onPress={() => setSelectedWalletId(w.id)}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillSelected,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextSelected,
                  ]}
                >
                  {w.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Bộ lọc danh mục dạng chip ngang */}
      {filteredCategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedCategoryId(undefined)}
            style={[
              styles.categoryPill,
              !selectedCategoryId && styles.categoryPillSelected,
            ]}
          >
            <Text
              style={[
                styles.categoryPillText,
                !selectedCategoryId && styles.categoryPillTextSelected,
              ]}
            >
              Mọi danh mục
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
                  styles.categoryPill,
                  isSelected && styles.categoryPillSelected,
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextSelected,
                  ]}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Lịch sử giao dịch"
        rightAction={
          <View style={styles.headerRightActions}>
            {/* Nút Xuất Excel */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleExportExcel}
              disabled={isExporting}
              style={styles.exportBtn}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={15} color={colors.primary} />
                  <Text style={styles.exportBtnText}>Excel</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Nút Thêm giao dịch */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push('/(app)/add-transaction')}
              style={styles.addBtn}
            >
              <Ionicons name="add" size={18} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Bộ lọc & tìm kiếm cố định để gõ text không bị mất focus hay re-render giật danh sách */}
      {renderHeader()}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionItem
              transaction={item}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="Không có giao dịch"
              description={
                keyword || selectedWalletId || selectedCategoryId || selectedType !== 'all'
                  ? 'Không tìm thấy giao dịch nào khớp với bộ lọc hiện tại.'
                  : 'Chưa có khoản thu chi nào được ghi lại.'
              }
              actionTitle="+ Thêm giao dịch"
              onActionPress={() => router.push('/(app)/add-transaction')}
            />
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 0.5,
    borderColor: colors.primaryBorder,
  },
  exportBtnText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
  },
  clearSearchBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    padding: 3,
    borderRadius: borderRadius.md,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  segmentTabActive: {
    backgroundColor: colors.surface,
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  segmentTabText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  segmentTabTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
  },
  filterPillSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterPillText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  filterPillTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  categoryPillSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryPillText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  categoryPillTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
