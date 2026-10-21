import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/store';
import { colors } from '@/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Tiêu chí
  const has8 = password.length >= 8;
  const hasCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNum = /\d/.test(password);
  const hasSym = /[\W_]/.test(password);
  const passOk = has8 && hasCase && hasNum && hasSym;

  const submit = async () => {
    setError(null);
    const n = fullName.trim();
    const e = email.trim();
    if (!n) return setError('Nhập họ và tên');
    if (!e) return setError('Nhập email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return setError('Email không đúng định dạng');
    if (!passOk) return setError('Mật khẩu chưa đủ mạnh');
    if (password !== confirmPassword) return setError('Mật khẩu xác nhận không khớp');
    try {
      await register({ fullName: n, email: e, password });
      await login({ email: e, password });
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại');
    }
  };

  return (
    <View style={s.root}>
      {/* Gradient header nhỏ gọn hơn login */}
      <LinearGradient
        colors={[colors.primaryDark, colors.primary, '#10B981']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.circle1} />
        <View style={s.circle2} />

        <View style={s.headerInner}>
          {/* Nút back */}
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={s.heading}>Tạo tài khoản</Text>
          <Text style={s.sub}>Chỉ mất 30 giây để bắt đầu quản lý chi tiêu</Text>
        </View>
      </LinearGradient>

      {/* Form */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.formArea}
      >
        <ScrollView
          contentContainerStyle={s.formScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {error ? (
            <View style={s.errorRow}>
              <Ionicons name="warning-outline" size={16} color="#EF4444" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Họ tên */}
          <Text style={s.label}>Họ và tên</Text>
          <View style={s.inputWrap}>
            <Ionicons name="person-outline" size={18} color="#94A3B8" style={s.ico} />
            <TextInput
              style={s.input} placeholder="Nguyễn Văn A" placeholderTextColor="#CBD5E1"
              returnKeyType="next" value={fullName}
              onChangeText={(t) => { setFullName(t); setError(null); }}
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </View>

          {/* Email */}
          <Text style={s.label}>Email</Text>
          <View style={s.inputWrap}>
            <Ionicons name="mail-outline" size={18} color="#94A3B8" style={s.ico} />
            <TextInput
              ref={emailRef} style={s.input} placeholder="you@example.com"
              placeholderTextColor="#CBD5E1" keyboardType="email-address"
              autoCapitalize="none" autoCorrect={false} returnKeyType="next"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null); }}
              onSubmitEditing={() => passRef.current?.focus()}
            />
          </View>

          {/* Mật khẩu */}
          <Text style={s.label}>Mật khẩu</Text>
          <View style={s.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={s.ico} />
            <TextInput
              ref={passRef} style={s.input} placeholder="Tối thiểu 8 ký tự"
              placeholderTextColor="#CBD5E1" secureTextEntry={!showPassword}
              autoCapitalize="none" returnKeyType="next" value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Criteria */}
          {password.length > 0 ? (
            <View style={s.critRow}>
              <Chip ok={has8} text="8+ ký tự" />
              <Chip ok={hasCase} text="Hoa & thường" />
              <Chip ok={hasNum} text="Số" />
              <Chip ok={hasSym} text="Đặc biệt" />
            </View>
          ) : null}

          {/* Xác nhận */}
          <Text style={s.label}>Xác nhận mật khẩu</Text>
          <View style={s.inputWrap}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#94A3B8" style={s.ico} />
            <TextInput
              ref={confirmRef} style={s.input} placeholder="Nhập lại mật khẩu"
              placeholderTextColor="#CBD5E1" secureTextEntry={!showConfirm}
              autoCapitalize="none" returnKeyType="go" value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
              onSubmitEditing={submit}
            />
            <TouchableOpacity onPress={() => setShowConfirm((v) => !v)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity onPress={submit} disabled={isLoading} activeOpacity={0.9}>
            <LinearGradient
              colors={isLoading ? [colors.borderDark, colors.borderDark] : [colors.primaryDark, colors.primary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.submitBtn}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitText}>Tạo tài khoản</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Điều khoản */}
          <Text style={s.terms}>
            Bằng cách đăng ký, bạn đồng ý với{' '}
            <Text style={s.termsLink}>Điều khoản sử dụng</Text> và{' '}
            <Text style={s.termsLink}>Chính sách bảo mật</Text> của chúng tôi.
          </Text>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.footerText}>Đã có tài khoản?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.7}>
              <Text style={s.footerLink}> Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Chip({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={ok ? s.chipOk : s.chip}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
        size={12}
        color={ok ? colors.income : colors.textMuted}
      />
      <Text style={ok ? s.chipTextOk : s.chipText}>{text}</Text>
    </View>
  );
}

const HEADER_H = 220;
const OVERLAP = 28;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  header: {
    height: HEADER_H, paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 24, overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', top: -30, right: -50,
    width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circle2: {
    position: 'absolute', bottom: 30, left: -20,
    width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerInner: { flex: 1, justifyContent: 'center' },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  heading: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  formArea: {
    flex: 1, marginTop: -OVERLAP, backgroundColor: '#fff',
    borderTopLeftRadius: OVERLAP, borderTopRightRadius: OVERLAP,
    shadowColor: '#1E3A5F', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
  },
  formScroll: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },

  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.expenseLight, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14,
    marginBottom: 16, borderWidth: 1, borderColor: colors.expenseBorder,
  },
  errorText: { flex: 1, fontSize: 13, color: colors.expense, fontWeight: '500' },

  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 7, marginLeft: 2 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceAlt, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, height: 50, marginBottom: 14,
  },
  ico: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: colors.textPrimary },

  critRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14, marginTop: -4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surfaceAlt, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.border,
  },
  chipOk: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.incomeLight, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.incomeBorder,
  },
  chipText: { fontSize: 11, color: colors.textSecondary },
  chipTextOk: { fontSize: 11, color: colors.income, fontWeight: '600' },

  submitBtn: {
    height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 6,
    shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 5,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  terms: {
    fontSize: 11.5, color: colors.textMuted, textAlign: 'center',
    lineHeight: 18, marginTop: 20, paddingHorizontal: 8,
  },
  termsLink: { color: colors.primary, fontWeight: '600' },

  footer: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginTop: 20,
  },
  footerText: { fontSize: 14, color: colors.textSecondary },
  footerLink: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
