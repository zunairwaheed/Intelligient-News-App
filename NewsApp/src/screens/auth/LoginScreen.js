import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
  SafeAreaView, ActivityIndicator, Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation, route }) {
  const { login } = useAuth();
  const redirectTo = route.params?.redirectTo;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Forgot password state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      if (redirectTo) {
        navigation.navigate('Tabs', { screen: redirectTo });
      } else {
        navigation.navigate('Tabs');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed. Check your credentials.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password/', {
        email: email.trim().toLowerCase(),
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      Alert.alert('Success', 'Password has been updated successfully!');
      setIsForgotPassword(false);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update password. Please check your details.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../../assets/icon.png')} 
                style={styles.logoImage} 
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>Intelligent News App</Text>
            <Text style={styles.tagline}>Welcome back to your community</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>{isForgotPassword ? 'Reset Password' : 'Sign In'}</Text>
            <Text style={styles.subtitle}>
              {isForgotPassword
                ? 'Enter your email to reset your password'
                : 'Sign in to access personalized news'}
            </Text>

            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color="#1a73e8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
              </View>

              {!isForgotPassword ? (
                <>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={18} color="#1a73e8" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.passInput]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Password"
                      secureTextEntry={!showPass}
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
                      <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.forgotBtn} onPress={() => setIsForgotPassword(true)}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, loading && styles.btnDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={18} color="#1a73e8" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.passInput]}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="New Password"
                      secureTextEntry={!showNewPass}
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNewPass(!showNewPass)}>
                      <Ionicons name={showNewPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={18} color="#1a73e8" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.passInput]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm Password"
                      secureTextEntry={!showConfirmPass}
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPass(!showConfirmPass)}>
                      <Ionicons name={showConfirmPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.btn, loading && styles.btnDisabled]}
                    onPress={handleResetPassword}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update Password</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.backToLoginBtn} onPress={() => setIsForgotPassword(false)}>
                    <Text style={styles.backToLoginText}>Back to Sign In</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Tabs', { screen: 'Home' })}>
              <Text style={styles.homeBtnText}>Explore as Guest</Text>
            </TouchableOpacity>

            {!isForgotPassword && (
              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Signup', { redirectTo })}>
                  <Text style={styles.linkBold}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a73e8' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: '#1a73e8',
  },
  logoContainer: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    overflow: 'hidden',
  },
  logoImage: { width: 60, height: 60 },
  appName: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 24,
    marginTop: -16,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  subtitle: { fontSize: 13, color: '#777', marginTop: 4, marginBottom: 20 },
  form: { marginBottom: 0 },
  label: { fontSize: 11, fontWeight: '800', color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f9fe',
    borderWidth: 1, borderColor: '#edf2f7', borderRadius: 10,
    marginBottom: 12, paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 10, fontSize: 15, color: '#2d3748',
  },
  passInput: { paddingRight: 40 },
  eyeBtn: { position: 'absolute', right: 12, padding: 4 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 12 },
  forgotText: { color: '#1a73e8', fontSize: 13, fontWeight: '700' },
  btn: {
    backgroundColor: '#1a73e8', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 10,
    shadowColor: '#1a73e8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  homeBtn: { marginTop: 12, paddingVertical: 8, alignItems: 'center' },
  homeBtnText: { color: '#1a73e8', fontSize: 13, fontWeight: '700' },
  backToLoginBtn: { alignSelf: 'center', marginTop: 12 },
  backToLoginText: { color: '#777', fontSize: 13, fontWeight: '600' },
  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 20, paddingBottom: 20
  },
  footerText: { color: '#777', fontSize: 13 },
  linkBold: { color: '#1a73e8', fontWeight: '800' },
});
