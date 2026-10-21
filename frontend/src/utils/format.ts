/**
 * Format số khi người dùng nhập trong ô số tiền, hiển thị dấu . ngăn cách hàng nghìn.
 * VD: "3000000" → "3.000.000"
 */
export function formatAmountInput(raw: string): string {
  // Chỉ giữ lại chữ số
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // Định dạng dấu . từng 3 chữ số từ phải sang trái
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parse chuỗi số tiền đã định dạng về số nguyên để gửi API.
 * VD: "3.000.000" → 3000000
 */
export function parseAmountInput(formatted: string): number {
  const digits = formatted.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

/**
 * Tạo danh sách gợi ý số tiền từ chuỗi người dùng đang nhập.
 * VD: nhập "3" → [300, 3_000, 30_000, 300_000, 3_000_000]
 */
export function generateAmountSuggestions(raw: string): number[] {
  const digits = raw.replace(/\D/g, '');
  if (!digits || digits.length > 8) return [];

  const base = parseInt(digits, 10);
  if (base <= 0) return [];

  // Nhân với các mũ 10 phổ biến để tạo gợi ý
  const multipliers = [100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000];
  const suggestions = multipliers
    .map((m) => base * m)
    .filter((v) => v >= 1_000 && v <= 999_000_000); // Từ 1K đến 999M VND

  // Loại bỏ trùng và sắp xếp tăng dần
  return [...new Set(suggestions)].sort((a, b) => a - b).slice(0, 5);
}

/**
 * Format số tiền VND sang chuỗi hiển thị đẹp (VD: 1.500.000 ₫)
 */
export function formatCurrency(amount: number | string | null | undefined, currency: string = 'VND'): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return `0 ₫`;
  }

  const num = Number(amount);
  const formatted = new Intl.NumberFormat('vi-VN').format(num);

  if (currency.toUpperCase() === 'VND') {
    return `${formatted} ₫`;
  }

  return `${formatted} ${currency}`;
}

/**
 * Format ngày (YYYY-MM-DD) sang hiển thị người dùng (DD/MM/YYYY)
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}
