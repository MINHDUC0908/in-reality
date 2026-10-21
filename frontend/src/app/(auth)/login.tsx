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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/store';
import { colors } from '@/theme';

const { width: SCREEN_W } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passRef = useRef<TextInput>(null);

  const submit = async () => {
    setError(null);
    const e = email.trim();
    if (!e) return setError('Nhập email để tiếp tục');
    if (!password) return setError('Nhập mật khẩu để tiếp tục');
    try {
      await login({ email: e, password });
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Sai email hoặc mật khẩu');
    }
  };

  return (
    <View style={s.root}>
      {/* ─── Phần trên: Gradient header ─── */}
      <LinearGradient
        colors={[colors.primaryDark, colors.primary, '#10B981']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.headerGradient}
      >
        {/* Vòng tròn trang trí */}
        <View style={s.circle1} />
        <View style={s.circle2} />
        <View style={s.circle3} />

        <View style={s.headerContent}>
          <View style={s.logoRow}>
            <View style={s.logoBg}>
              <Ionicons name="wallet" size={22} color={colors.primary} />
            </View>
            <Text style={s.logoText}>SpendWise</Text>
          </View>

          <Text style={s.greeting}>Chào mừng{'\n'}trở lại! 👋</Text>
          <Text style={s.headerSub}>
            Đăng nhập để tiếp tục quản lý chi tiêu của bạn
          </Text>
        </View>
      </LinearGradient>

      {/* ─── Phần dưới: Form trắng bo góc đè lên gradient ─── */}
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
          {/* Error */}
          {error ? (
            <View style={s.errorRow}>
              <Ionicons name="warning-outline" size={16} color="#EF4444" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <Text style={s.label}>Địa chỉ email</Text>
          <View style={s.inputWrap}>
            <Ionicons name="mail-outline" size={18} color="#94A3B8" style={s.inputIco} />
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor="#CBD5E1"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null); }}
              onSubmitEditing={() => passRef.current?.focus()}
            />
          </View>

          {/* Password */}
          <Text style={s.label}>Mật khẩu</Text>
          <View style={s.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={s.inputIco} />
            <TextInput
              ref={passRef}
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor="#CBD5E1"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="go"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              onSubmitEditing={submit}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={18}
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity onPress={submit} disabled={isLoading} activeOpacity={0.9}>
            <LinearGradient
              colors={isLoading ? [colors.borderDark, colors.borderDark] : [colors.primaryDark, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.submitBtn}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitText}>Đăng nhập</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>hoặc</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Social buttons */}
          <View style={s.socialRow}>
            <TouchableOpacity style={s.socialBtn} activeOpacity={0.7}>
              <Ionicons name="logo-google" size={20} color="#EA4335" />
            </TouchableOpacity>
            <TouchableOpacity style={s.socialBtn} activeOpacity={0.7}>
              <Ionicons name="logo-facebook" size={20} color="#1877F2" />
            </TouchableOpacity>
            <TouchableOpacity style={s.socialBtn} activeOpacity={0.7}>
              <Ionicons name="logo-apple" size={20} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.footerText}>Chưa có tài khoản?</Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.7}
            >
              <Text style={s.footerLink}> Đăng ký</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ─── STYLES ────────────────────────────────────────────────────────────── */
const HEADER_H = 280;
const OVERLAP = 32;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  // ─── Gradient Header ───
  headerGradient: {
    height: HEADER_H,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 28,
    overflow: 'hidden',
  },
  // Decorative circles
  circle1: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circle2: {
    position: 'absolute', top: 80, right: 60,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  circle3: {
    position: 'absolute', bottom: 20, left: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerContent: { flex: 1, justifyContent: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  logoBg: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  logoText: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  greeting: {
    fontSize: 28, fontWeight: '800', color: '#fff',
    lineHeight: 36, letterSpacing: -0.3,
  },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 6, lineHeight: 20 },

  // ─── Form Area ───
  formArea: {
    flex: 1,
    marginTop: -OVERLAP,
    backgroundColor: '#fff',
    borderTopLeftRadius: OVERLAP,
    borderTopRightRadius: OVERLAP,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  formScroll: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
  },

  // Error
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.expenseLight, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14,
    marginBottom: 20, borderWidth: 1, borderColor: colors.expenseBorder,
  },
  errorText: { flex: 1, fontSize: 13, color: colors.expense, fontWeight: '500' },

  // Fields
  label: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary,
    marginBottom: 8, marginLeft: 2,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceAlt, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, height: 52,
    marginBottom: 18,
  },
  inputIco: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: colors.textPrimary },

  // Submit
  submitBtn: {
    height: 54, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  // Divider
  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 24, gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },

  // Social
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 28 },
  socialBtn: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, color: colors.textSecondary },
  footerLink: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
