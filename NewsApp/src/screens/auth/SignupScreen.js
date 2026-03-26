import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
  SafeAreaView, ActivityIndicator, Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

// Field must be defined OUTSIDE the screen component so React doesn't
// create a new component type on every re-render (which would dismiss the keyboard).
const Field = ({ label, placeholder, keyboard = 'default', secure = false, value, onChangeText, showPass, onToggleShow, icon }) => (
  <>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrapper}>
      <Ionicons name={icon} size={18} color="#1a73e8" style={styles.inputIcon} />
      <TextInput
        style={[styles.input, secure && styles.passInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboard}
        autoCapitalize="none"
        secureTextEntry={secure && !showPass}
        placeholderTextColor="#999"
      />
      {secure && (
        <TouchableOpacity style={styles.eyeBtn} onPress={onToggleShow}>
          <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  </>
);

export default function SignupScreen({ navigation, route }) {
  const { register } = useAuth();
  const redirectTo = route.params?.redirectTo;
  const [form, setForm] = useState({ username: '', email: '', phone: '', password: '', password2: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSignup = async () => {
    const { username, email, password, password2 } = form;
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (password !== password2) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        password2,
        phone: form.phone.trim(),
      });
      if (redirectTo) {
        navigation.navigate('Tabs', { screen: redirectTo });
      } else {
        navigation.navigate('Tabs');
      }
    } catch (err) {
      console.log('Registration error:', JSON.stringify(err.response?.data));
      const data = err.response?.data;
      let msg = 'Registration failed. Please try again.';
      if (data) {
        if (typeof data === 'string') {
          msg = data;
        } else {
          msg = Object.entries(data)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join('\n');
        }
      }
      Alert.alert('Sign Up Failed', msg);
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
            <Text style={styles.tagline}>Join our global news community</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Enter your details to get started</Text>

            <View style={styles.form}>
              <Field
                label="Username"
                placeholder="Choose a username"
                value={form.username}
                onChangeText={set('username')}
                icon="person-outline"
              />
              <Field
                label="Email"
                placeholder="you@example.com"
                keyboard="email-address"
                value={form.email}
                onChangeText={set('email')}
                icon="mail-outline"
              />
              <Field
                label="Phone (optional)"
                placeholder="+1 234 567 8900"
                keyboard="phone-pad"
                value={form.phone}
                onChangeText={set('phone')}
                icon="call-outline"
              />
              <Field
                label="Password"
                placeholder="Min. 8 characters"
                secure
                showPass={showPass}
                onToggleShow={() => setShowPass(!showPass)}
                value={form.password}
                onChangeText={set('password')}
                icon="lock-closed-outline"
              />

              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color="#1a73e8" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passInput]}
                  value={form.password2}
                  onChangeText={set('password2')}
                  placeholder="Repeat password"
                  secureTextEntry={!showPass}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => navigation.navigate('Tabs', { screen: 'Home' })}
            >
              <Text style={styles.homeBtnText}>Explore as Guest</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login', { redirectTo })}>
                <Text style={styles.linkBold}>Sign In</Text>
              </TouchableOpacity>
            </View>
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
  btn: {
    backgroundColor: '#1a73e8', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 10,
    shadowColor: '#1a73e8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  homeBtn: { marginTop: 12, paddingVertical: 8, alignItems: 'center' },
  homeBtnText: { color: '#1a73e8', fontSize: 13, fontWeight: '700' },
  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 20, paddingBottom: 20
  },
  footerText: { color: '#777', fontSize: 13 },
  linkBold: { color: '#1a73e8', fontWeight: '800' },
});
