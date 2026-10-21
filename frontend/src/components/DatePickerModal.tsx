import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppModal } from './Modal';
import { colors, typography, borderRadius, spacing } from '@/theme';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  value: string; // YYYY-MM-DD
  onSelect: (dateStr: string) => void;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  value,
  onSelect,
}) => {
  // Parse date ban đầu
  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(
    isNaN(initialDate.getTime()) ? new Date().getFullYear() : initialDate.getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    isNaN(initialDate.getTime()) ? new Date().getMonth() : initialDate.getMonth(),
  );

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Tính số ngày trong tháng và ngày bắt đầu (Thứ 2 = 0, CN = 6)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday-first

  const todayStr = new Date().toISOString().slice(0, 10);

  const handlePickDay = (day: number) => {
    const formattedMonth = String(viewMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const result = `${viewYear}-${formattedMonth}-${formattedDay}`;
    onSelect(result);
    onClose();
  };

  return (
    <AppModal visible={visible} onClose={onClose} title="Chọn ngày giao dịch">
      {/* Month Navigation */}
      <View style={styles.navRow}>
        <TouchableOpacity activeOpacity={0.7} onPress={prevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          Tháng {viewMonth + 1}, {viewYear}
        </Text>
        <TouchableOpacity activeOpacity={0.7} onPress={nextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, idx) => (
          <Text key={idx} style={styles.weekText}>
            {w}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.grid}>
        {/* Empty cells for padding before the 1st of month */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.dayCell} />
        ))}

        {/* Days of month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const formattedMonth = String(viewMonth + 1).padStart(2, '0');
          const formattedDay = String(day).padStart(2, '0');
          const thisDateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;
          const isSelected = thisDateStr === value;
          const isToday = thisDateStr === todayStr;

          return (
            <TouchableOpacity
              key={`day-${day}`}
              activeOpacity={0.7}
              onPress={() => handlePickDay(day)}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                !isSelected && isToday && styles.dayCellToday,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.dayTextSelected,
                  !isSelected && isToday && styles.dayTextToday,
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick button Today */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          onSelect(todayStr);
          onClose();
        }}
        style={styles.pickTodayBtn}
      >
        <Text style={styles.pickTodayText}>Chọn hôm nay</Text>
      </TouchableOpacity>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  navBtn: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  monthTitle: {
    ...typography.cardTitle,
    fontSize: 14,
    color: colors.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xs,
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  weekText: {
    ...typography.captionMedium,
    fontSize: 11,
    color: colors.textMuted,
    width: '14.28%',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: spacing.xs,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryLight,
  },
  dayText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.textPrimary,
  },
  dayTextSelected: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: '600',
  },
  pickTodayBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
  },
  pickTodayText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
