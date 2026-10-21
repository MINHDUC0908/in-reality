import { TextStyle } from 'react-native';
import { colors } from './colors';

export const typography = {
  // Số tiền hero trên Dashboard - gọn gàng, tinh tế kiểu Fintech
  heroAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  } as TextStyle,

  // Tiêu đề màn hình chính (18-19px đậm vừa phải, hiện đại)
  screenTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  } as TextStyle,

  // Tiêu đề card / section (14px semi-bold)
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  } as TextStyle,

  // Tiêu đề phụ (13px medium)
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  } as TextStyle,

  // Nội dung chính (13px - thanh thoát, dễ đọc)
  body: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textPrimary,
    lineHeight: 18,
  } as TextStyle,

  bodyBold: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 18,
  } as TextStyle,

  // Chữ phụ / ghi chú (11.5px màu xám sắc sảo)
  caption: {
    fontSize: 11.5,
    fontWeight: '400',
    color: colors.textMuted,
    lineHeight: 15,
  } as TextStyle,

  captionMedium: {
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 15,
  } as TextStyle,

  // Label nút / badge
  button: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textInverse,
    letterSpacing: 0.1,
  } as TextStyle,

  badge: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  } as TextStyle,
} as const;
