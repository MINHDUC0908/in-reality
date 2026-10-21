import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { ScreenHeader, Card, Button, Input, Badge } from '@/components';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';
import {
  receiptApi,
  type ScanReceiptResponse,
  type ConfirmReceiptDto,
  type Receipt,
} from '@/features/receipts';
import { walletApi, type Wallet } from '@/features/wallets';
import { categoryApi, type Category } from '@/features/categories';
import { formatCurrency, formatDate } from '@/utils/format';
import { useRefreshStore } from '@/lib/refreshStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ScanReceiptScreen() {
  const router = useRouter();

  // Tab: 'scan' | 'history'
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanReceiptResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Form xác nhận sau khi quét
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>('');

  // Lịch sử hóa đơn
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState<boolean>(false);
  const [isRefreshingReceipts, setIsRefreshingReceipts] = useState<boolean>(false);

  // Xem ảnh lớn
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const loadReceipts = useCallback(async () => {
    try {
      setIsLoadingReceipts(true);
      const data = await receiptApi.getReceipts();
      setReceipts(data || []);
    } catch (err: any) {
      console.error('Lỗi tải danh sách hóa đơn', err);
    } finally {
      setIsLoadingReceipts(false);
      setIsRefreshingReceipts(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([walletApi.getWallets(), categoryApi.getCategories()])
      .then(([walletList, categoryList]) => {
        setWallets(walletList);
        setCategories(categoryList);
        if (walletList.length > 0) {
          setSelectedWalletId(walletList[0].id);
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadReceipts();
    }
  }, [activeTab, loadReceipts]);

  const handlePickImage = async (useCamera: boolean) => {
    try {
      // Tắt allowsEditing để tránh lỗi crash/hủy camera trên Android, đồng thời giữ nguyên vẹn chiều dài hóa đơn
      // Chất lượng 0.8 giúp ảnh nhẹ (~200KB) nhưng chữ số hóa đơn vẫn cực nét cho AI OCR
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      };

      let result: ImagePicker.ImagePickerResult;

      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Quyền truy cập', 'Cần cấp quyền camera để chụp hóa đơn');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Quyền truy cập', 'Cần cấp quyền thư viện để chọn ảnh hóa đơn');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setImageUri(selectedAsset.uri);
        setScanResult(null);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể chọn ảnh');
    }
  };

  const handleStartScan = async () => {
    if (!imageUri) {
      Alert.alert('Thông báo', 'Vui lòng chọn hoặc chụp ảnh hóa đơn trước');
      return;
    }

    try {
      setIsScanning(true);
      const filename = imageUri.split('/').pop() || 'receipt.jpg';
      const ext = filename.split('.').pop()?.toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      const result = await receiptApi.scanReceipt(imageUri, filename, mimeType);
      setScanResult(result);

      if (result.amount) {
        setAmount(String(result.amount));
      }
      if (result.merchantName) {
        setDescription(result.merchantName);
      }
      if (result.transactionDate) {
        setTransactionDate(result.transactionDate);
      } else {
        setTransactionDate(new Date().toISOString().slice(0, 10));
      }
      if (result.suggestedCategory?.id) {
        setSelectedCategoryId(result.suggestedCategory.id);
      } else if (categories.length > 0) {
        const expenseCat = categories.find((c) => c.type === 'expense');
        if (expenseCat) setSelectedCategoryId(expenseCat.id);
      }
    } catch (err: any) {
      Alert.alert('Lỗi phân tích', err.message || 'Không thể đọc nội dung hóa đơn');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmTransaction = async () => {
    if (!scanResult) return;

    if (!selectedWalletId) {
      Alert.alert('Lỗi', 'Vui lòng chọn ví thanh toán');
      return;
    }

    const numAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }

    try {
      setIsConfirming(true);
      const dto: ConfirmReceiptDto = {
        walletId: selectedWalletId,
        categoryId: selectedCategoryId || undefined,
        amount: numAmount,
        transactionDate: transactionDate || undefined,
        description: description.trim() || undefined,
      };

      await receiptApi.confirmReceipt(scanResult.receiptId, dto);
      useRefreshStore.getState().triggerRefresh();

      Alert.alert('Thành công', 'Đã lưu giao dịch từ hóa đơn thành công!', [
        {
          text: 'Xem giao dịch',
          onPress: () => {
            setImageUri(null);
            setScanResult(null);
            router.push('/(app)/(tabs)/transactions');
          },
        },
        {
          text: 'Ở lại',
          onPress: () => {
            setImageUri(null);
            setScanResult(null);
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể lưu giao dịch');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDeleteReceipt = (receipt: Receipt) => {
    Alert.alert(
      'Xóa hóa đơn',
      'Bạn có chắc chắn muốn xóa bản ghi hóa đơn này khỏi kho?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await receiptApi.deleteReceipt(receipt.id);
              setReceipts((prev) => prev.filter((r) => r.id !== receipt.id));
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể xóa hóa đơn');
            }
          },
        },
      ],
    );
  };

  const handleReviewReceiptFromHistory = (receipt: Receipt) => {
    const raw = receipt.rawOcrJson;
    setImageUri(receipt.imageUrl);
    setScanResult({
      receiptId: receipt.id,
      imageUrl: receipt.imageUrl,
      merchantName: raw?.ocr?.merchant_name || null,
      amount: raw?.ocr?.total_amount || null,
      transactionDate: raw?.ocr?.transaction_date || null,
      items: raw?.ocr?.items || [],
      suggestedCategory: null,
      confidenceScore: receipt.ocrConfidence ? Number(receipt.ocrConfidence) : 0.9,
      source: 'cache',
    });

    if (raw?.ocr?.total_amount) setAmount(String(raw.ocr.total_amount));
    if (raw?.ocr?.merchant_name) setDescription(raw.ocr.merchant_name);
    if (raw?.ocr?.transaction_date) setTransactionDate(raw.ocr.transaction_date);

    setActiveTab('scan');
  };

  const getStatusBadge = (status: Receipt['ocrStatus']) => {
    switch (status) {
      case 'confirmed':
        return <Badge label="Đã lưu giao dịch" variant="success" />;
      case 'done':
        return <Badge label="Chờ xác nhận" variant="info" />;
      case 'failed':
        return <Badge label="Phân tích lỗi" variant="danger" />;
      default:
        return <Badge label="Đang chờ" variant="warning" />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Quét hóa đơn AI"
        subtitle="Trích xuất tự động cửa hàng, số tiền và lưu trữ hóa đơn"
      />

      {/* Segmented Tab Bar */}
      <View style={styles.tabContainer}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveTab('scan')}
            style={[styles.tabBtn, activeTab === 'scan' && styles.tabBtnActive]}
          >
            <Ionicons
              name="scan"
              size={15}
              color={activeTab === 'scan' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'scan' && styles.tabBtnTextActive,
              ]}
            >
              Quét hóa đơn
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveTab('history')}
            style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          >
            <Ionicons
              name="images-outline"
              size={15}
              color={activeTab === 'history' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'history' && styles.tabBtnTextActive,
              ]}
            >
              Kho hóa đơn
            </Text>
            {receipts.length > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{receipts.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= TAB 1: SCAN HÓA ĐƠN ================= */}
      {activeTab === 'scan' ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Khung Viewfinder quét ảnh */}
          <View style={styles.viewfinderContainer}>
            {imageUri ? (
              <View style={styles.previewImageFrame}>
                <ExpoImage
                  source={{ uri: imageUri }}
                  style={styles.previewImage}
                  contentFit="contain"
                  transition={200}
                />
                {/* Nút phóng to xem toàn màn hình */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setPreviewModalUrl(imageUri)}
                  style={styles.expandPreviewBtn}
                >
                  <Ionicons name="expand" size={16} color={colors.textInverse} />
                </TouchableOpacity>

                {/* Nút xóa/chọn lại ảnh */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setImageUri(null);
                    setScanResult(null);
                  }}
                  style={styles.closePreviewBtn}
                >
                  <Ionicons name="close" size={16} color={colors.textInverse} />
                </TouchableOpacity>

                {/* Tag trạng thái ảnh đã sẵn sàng */}
                <View style={styles.readyBadge}>
                  <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                  <Text style={styles.readyBadgeText}>Ảnh đã sẵn sàng quét</Text>
                </View>
              </View>
            ) : (
              <View style={styles.viewfinderBox}>
                <View style={[styles.cornerBracket, styles.topLeft]} />
                <View style={[styles.cornerBracket, styles.topRight]} />
                <View style={[styles.cornerBracket, styles.bottomLeft]} />
                <View style={[styles.cornerBracket, styles.bottomRight]} />

                <View style={styles.centerAim}>
                  <Ionicons name="scan-outline" size={32} color={colors.primary} />
                  <Text style={styles.aimPrompt}>Đặt hóa đơn vào chính giữa khung hình</Text>
                </View>
              </View>
            )}

            {/* Nút hành động chọn nguồn ảnh */}
            <View style={styles.sourceButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handlePickImage(true)}
                style={styles.sourceBtn}
              >
                <Ionicons name="camera" size={18} color={colors.primary} />
                <Text style={styles.sourceBtnText}>Chụp ảnh</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handlePickImage(false)}
                style={styles.sourceBtn}
              >
                <Ionicons name="images" size={18} color={colors.primary} />
                <Text style={styles.sourceBtnText}>Thư viện ảnh</Text>
              </TouchableOpacity>
            </View>

            {imageUri && !scanResult && (
              <Button
                title={isScanning ? 'AI đang phân tích...' : 'Bắt đầu quét hóa đơn'}
                variant="primary"
                size="md"
                isLoading={isScanning}
                onPress={handleStartScan}
                style={styles.scanActionBtn}
              />
            )}
          </View>

          {/* Khung biên lai kết quả sau khi quét AI */}
          {scanResult && (
            <View style={styles.receiptContainer}>
              <View style={styles.receiptCard}>
                <View style={styles.receiptTopHeader}>
                  <View style={styles.receiptStoreInfo}>
                    <Text style={styles.receiptStoreName} numberOfLines={1}>
                      {scanResult.merchantName || 'Hóa đơn mua sắm'}
                    </Text>
                    <Text style={styles.receiptDateText}>
                      {scanResult.transactionDate || 'Hôm nay'}
                    </Text>
                  </View>
                  <Badge
                    label={`${Math.round(scanResult.confidenceScore * 100)}% tin cậy`}
                    variant={scanResult.confidenceScore > 0.7 ? 'success' : 'warning'}
                  />
                </View>

                <View style={styles.dashedDivider} />

                <View style={styles.confirmSection}>
                  <Text style={styles.fieldLabel}>Ví thanh toán *</Text>
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
                          style={[styles.smallChip, isSelected && styles.smallChipSelected]}
                        >
                          <Text style={[styles.smallChipText, isSelected && styles.smallChipTextSelected]}>
                            {w.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={styles.fieldLabel}>Danh mục gợi ý</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                  >
                    {categories
                      .filter((c) => c.type === 'expense')
                      .map((c) => {
                        const isSelected = selectedCategoryId === c.id;
                        return (
                          <TouchableOpacity
                            key={c.id}
                            activeOpacity={0.7}
                            onPress={() => setSelectedCategoryId(c.id)}
                            style={[styles.smallChip, isSelected && styles.smallChipSelected]}
                          >
                            <Text style={[styles.smallChipText, isSelected && styles.smallChipTextSelected]}>
                              {c.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </ScrollView>

                  <Input
                    label="Tổng tiền thanh toán (VND) *"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                  />

                  <Input
                    label="Tên cửa hàng / Nội dung"
                    value={description}
                    onChangeText={setDescription}
                  />

                  <Input
                    label="Ngày giao dịch (YYYY-MM-DD)"
                    value={transactionDate}
                    onChangeText={setTransactionDate}
                  />

                  {scanResult.items && scanResult.items.length > 0 && (
                    <View style={styles.itemsSummary}>
                      <Text style={styles.itemsSummaryTitle}>Mặt hàng bóc tách ({scanResult.items.length})</Text>
                      {scanResult.items.map((it, idx) => (
                        <View key={idx} style={styles.itemLine}>
                          <Text style={styles.itemLineName} numberOfLines={1}>• {it.name}</Text>
                          <Text style={styles.itemLinePrice}>{formatCurrency(it.price)}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <Button
                    title={isConfirming ? 'Đang tạo giao dịch...' : 'Xác nhận lưu giao dịch'}
                    variant="primary"
                    size="md"
                    isLoading={isConfirming}
                    onPress={handleConfirmTransaction}
                    style={styles.confirmBtn}
                  />
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        /* ================= TAB 2: KHO HÓA ĐƠN ================= */
        <ScrollView
          contentContainerStyle={styles.historyScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshingReceipts}
              onRefresh={() => {
                setIsRefreshingReceipts(true);
                loadReceipts();
              }}
              tintColor={colors.primary}
            />
          }
        >
          {isLoadingReceipts && !isRefreshingReceipts ? (
            <View style={styles.historyLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : receipts.length === 0 ? (
            <View style={styles.emptyHistoryBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="receipt-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có hóa đơn nào</Text>
              <Text style={styles.emptySubtitle}>
                Chụp hoặc tải ảnh hóa đơn ở tab "Quét hóa đơn" để AI tự động lưu trữ và phân tích.
              </Text>
              <TouchableOpacity
                style={styles.switchTabBtn}
                onPress={() => setActiveTab('scan')}
              >
                <Text style={styles.switchTabBtnText}>Quét hóa đơn ngay</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.receiptsGrid}>
              {receipts.map((rc) => {
                const raw = rc.rawOcrJson;
                const merchant = raw?.ocr?.merchant_name || 'Hóa đơn chưa đặt tên';
                const total = raw?.ocr?.total_amount ? Number(raw.ocr.total_amount) : null;
                const dateStr = rc.createdAt ? formatDate(rc.createdAt) : '';

                return (
                  <View key={rc.id} style={styles.receiptCardItem}>
                    {/* Ảnh thu nhỏ có thể bấm xem lớn */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setPreviewModalUrl(rc.imageUrl)}
                      style={styles.receiptThumbWrapper}
                    >
                      <ExpoImage
                        source={{ uri: rc.imageUrl }}
                        style={styles.receiptThumbImage}
                        contentFit="cover"
                      />
                      <View style={styles.expandIconOverlay}>
                        <Ionicons name="expand" size={14} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>

                    {/* Nội dung hóa đơn */}
                    <View style={styles.receiptInfoBlock}>
                      <View style={styles.receiptInfoHeader}>
                        <Text style={styles.receiptMerchant} numberOfLines={1}>
                          {merchant}
                        </Text>
                        <TouchableOpacity
                          style={{ padding: 4 }}
                          onPress={() => handleDeleteReceipt(rc)}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.expense} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.receiptMetaRow}>
                        <Text style={styles.receiptDate}>{dateStr}</Text>
                        {total !== null && (
                          <Text style={styles.receiptAmount}>{formatCurrency(total)}</Text>
                        )}
                      </View>

                      <View style={styles.receiptStatusRow}>
                        {getStatusBadge(rc.ocrStatus)}
                        {rc.ocrConfidence && (
                          <Text style={styles.confidenceText}>
                            Độ tin cậy: {Math.round(Number(rc.ocrConfidence) * 100)}%
                          </Text>
                        )}
                      </View>

                      {/* Nút hành động */}
                      {rc.ocrStatus === 'done' && (
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => handleReviewReceiptFromHistory(rc)}
                          style={styles.confirmSmallBtn}
                        >
                          <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                          <Text style={styles.confirmSmallBtnText}>Xác nhận vào giao dịch</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal phóng to ảnh hóa đơn */}
      <Modal
        visible={!!previewModalUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewModalUrl(null)}
      >
        <View style={styles.previewModalOverlay}>
          <TouchableOpacity
            style={styles.previewModalClose}
            onPress={() => setPreviewModalUrl(null)}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {previewModalUrl && (
            <ExpoImage
              source={{ uri: previewModalUrl }}
              style={styles.previewModalImage}
              contentFit="contain"
            />
          )}
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
  tabContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    padding: 3,
    borderRadius: borderRadius.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
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
    color: colors.primary,
    fontWeight: '700',
  },
  badgeCount: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  badgeCountText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textInverse,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  viewfinderContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    ...shadows.sm,
  },
  previewImageFrame: {
    width: '100%',
    height: 320,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  expandPreviewBtn: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePreviewBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  readyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  viewfinderBox: {
    width: '100%',
    height: 220,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cornerBracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.primary,
  },
  topLeft: {
    top: 16,
    left: 16,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  topRight: {
    top: 16,
    right: 16,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  bottomLeft: {
    bottom: 16,
    left: 16,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  bottomRight: {
    bottom: 16,
    right: 16,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  centerAim: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  aimPrompt: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  sourceButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.md,
  },
  sourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 0.5,
    borderColor: colors.primaryBorder,
  },
  sourceBtnText: {
    ...typography.captionMedium,
    color: colors.primary,
    fontSize: 12,
  },
  scanActionBtn: {
    width: '100%',
    marginTop: spacing.sm,
  },
  receiptContainer: {
    marginTop: spacing.xs,
  },
  receiptCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  receiptTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  receiptStoreInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  receiptStoreName: {
    ...typography.screenTitle,
    fontSize: 15,
    color: colors.textPrimary,
  },
  receiptDateText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: spacing.sm,
  },
  confirmSection: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  smallChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  smallChipText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  smallChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  itemsSummary: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  itemsSummaryTitle: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLineName: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  itemLinePrice: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textPrimary,
  },
  confirmBtn: {
    marginTop: spacing.xs,
  },
  // Lịch sử hóa đơn styles
  historyScrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
  },
  historyLoader: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyHistoryBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.screenTitle,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...typography.body,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  switchTabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  switchTabBtnText: {
    ...typography.captionMedium,
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  receiptsGrid: {
    gap: spacing.sm,
  },
  receiptCardItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
    ...shadows.sm,
  },
  receiptThumbWrapper: {
    width: 76,
    height: 90,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    position: 'relative',
  },
  receiptThumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  expandIconOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptInfoBlock: {
    flex: 1,
    justifyContent: 'space-between',
  },
  receiptInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptMerchant: {
    ...typography.captionMedium,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  receiptMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  receiptDate: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
  },
  receiptAmount: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.expense,
    fontWeight: '700',
  },
  receiptStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
  },
  confirmSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingVertical: 3,
  },
  confirmSmallBtnText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  previewModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  previewModalImage: {
    width: SCREEN_WIDTH - 32,
    height: '80%',
  },
});
