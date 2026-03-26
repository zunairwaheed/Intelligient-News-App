import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, SafeAreaView, Alert, RefreshControl, TextInput, Modal, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const STATUS_COLORS = {
  pending: { bg: '#fff8e1', text: '#f9a825', icon: 'time-outline' },
  approved: { bg: '#e8f5e9', text: '#43a047', icon: 'checkmark-circle-outline' },
  rejected: { bg: '#fce4ec', text: '#e53935', icon: 'close-circle-outline' },
};

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Profile Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editCity, setEditCity] = useState(user?.city || '');
  const [editCountry, setEditCountry] = useState(user?.country_code || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Change Password State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Password Visibility States
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const fetchUserProfile = async () => {
    try {
      const res = await api.get('/api/auth/profile/');
      await updateUser(res.data);
    } catch {
      // ignore
    }
  };

  useFocusEffect(useCallback(() => {
    fetchUserProfile();
    fetchMySubmissions();
  }, []));

  const fetchMySubmissions = async () => {
    try {
      const res = await api.get('/api/news/my-submissions/');
      setSubmissions(res.data.results || res.data);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          await logout();
          navigation.navigate('Login');
        }
      },
    ]);
  };

  const handleUpdateProfile = async () => {
    setUpdatingProfile(true);
    try {
      const res = await api.patch('/api/auth/profile/', {
        username: editUsername,
        bio: editBio,
        phone: editPhone,
        city: editCity,
        country_code: editCountry.toLowerCase(),
      });
      // Update local context
      await updateUser(res.data);
      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err) {
      console.error('Profile update error:', err);
      const errorData = err.response?.data;
      let errorMsg = 'Failed to update profile local error.';
      if (errorData) {
        if (typeof errorData === 'object') {
          errorMsg = Object.values(errorData).flat().join('\n');
        } else if (typeof errorData === 'string') {
          errorMsg = errorData;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      Alert.alert('Update Failed', errorMsg);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    setUpdatingPassword(true);
    try {
      await api.post('/api/auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully.');
    } catch (err) {
      const msg = err.response?.data?.old_password || 'Failed to change password.';
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteSubmission = (id) => {
    Alert.alert('Delete News', 'Are you sure you want to delete this submission?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/api/news/delete/${id}/`);
            fetchMySubmissions();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete news.');
          }
        }
      },
    ]);
  };

  const renderSubmission = ({ item }) => {
    const s = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    return (
      <TouchableOpacity
        style={styles.submissionCard}
        onPress={() => item.status === 'approved' && navigation.navigate('NewsDetail', {
          item,
          isCommunity: true,
          userCountry: user?.country_code
        })}
      >
        <View style={styles.submissionHeader}>
          <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <Ionicons name={s.icon} size={13} color={s.text} />
            <Text style={[styles.statusText, { color: s.text }]}>{item.status}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.submissionDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
            <TouchableOpacity onPress={() => handleDeleteSubmission(item.id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color="#e53935" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.submissionTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.submissionLocation}>
          <Ionicons name="location-outline" size={12} color="#888" /> {item.location_name}
        </Text>
        {item.status === 'rejected' && item.rejection_reason ? (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionLabel}>Reason:</Text>
            <Text style={styles.rejectionText}>{item.rejection_reason}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Profile Info Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileTop}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{user?.username?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View style={styles.mainInfo}>
            <Text style={styles.userNameLarge}>{user?.username}</Text>
            <Text style={styles.userEmailLarge}>{user?.email}</Text>
            {(user?.city || user?.country_code) ? (
              <View style={styles.locationBadge}>
                <Ionicons name="location" size={12} color="#fff" />
                <Text style={styles.locationBadgeText}>
                  {user.city || 'Unknown'}
                  {user?.country_code ? `, ${user.country_code.toUpperCase()}` : ''}
                </Text>
              </View>
            ) : (
              <View style={[styles.locationBadge, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="location-outline" size={12} color="#1a73e8" />
                <Text style={[styles.locationBadgeText, { color: '#1a73e8' }]}>Location not set</Text>
              </View>
            )}
          </View>
        </View>
        {user?.bio ? (
          <Text style={styles.bioText}>{user.bio}</Text>
        ) : (
          <Text style={[styles.bioText, { color: '#bbb', fontStyle: 'italic' }]}>No bio added yet.</Text>
        )}
      </View>

      {/* Settings Sections */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsGroupTitle}>Account Settings</Text>

        <TouchableOpacity style={styles.settingItem} onPress={() => {
          setEditUsername(user?.username || '');
          setEditBio(user?.bio || '');
          setEditPhone(user?.phone || '');
          setEditCity(user?.city || '');
          setEditCountry(user?.country_code || '');
          setShowEditModal(true);
        }}>
          <View style={[styles.settingIcon, { backgroundColor: '#e8f0fe' }]}>
            <Ionicons name="person-outline" size={20} color="#1a73e8" />
          </View>
          <Text style={styles.settingLabel}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={() => setShowPasswordModal(true)}>
          <View style={[styles.settingIcon, { backgroundColor: '#fdf4e3' }]}>
            <Ionicons name="lock-closed-outline" size={20} color="#f9a825" />
          </View>
          <Text style={styles.settingLabel}>Change Password</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        {user?.is_staff && (
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('AdminReview')}>
            <View style={[styles.settingIcon, { backgroundColor: '#e8f5e9' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#43a047" />
            </View>
            <Text style={styles.settingLabel}>Admin Panel</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.settingItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
          <View style={[styles.settingIcon, { backgroundColor: '#fce4ec' }]}>
            <Ionicons name="log-out-outline" size={20} color="#e53935" />
          </View>
          <Text style={[styles.settingLabel, { color: '#e53935' }]}>Sign Out</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionDivider} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Submissions</Text>
        <Text style={styles.sectionCount}>{submissions.length} articles</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderSubmission}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchMySubmissions(); }}
            colors={['#1a73e8']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No submissions yet</Text>
          </View>
        }
      />

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput style={styles.input} value={editUsername} onChangeText={setEditUsername} placeholder="Username" />

              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Tell us about yourself..."
                multiline
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="Phone number" keyboardType="phone-pad" />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput style={styles.input} value={editCity} onChangeText={setEditCity} placeholder="City" />
                </View>
                <View style={{ width: 100 }}>
                  <Text style={styles.inputLabel}>Country (ISO)</Text>
                  <TextInput style={styles.input} value={editCountry} onChangeText={setEditCountry} placeholder="US" autoCapitalize="characters" maxLength={2} />
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateProfile} disabled={updatingProfile}>
                {updatingProfile ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.modalBodyInternal}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    secureTextEntry={!showOldPass}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    placeholder="Enter current password"
                  />
                  <TouchableOpacity onPress={() => setShowOldPass(!showOldPass)} style={styles.eyeBtn}>
                    <Ionicons name={showOldPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    secureTextEntry={!showNewPass}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                  />
                  <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)} style={styles.eyeBtn}>
                    <Ionicons name={showNewPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    secureTextEntry={!showConfirmPass}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)} style={styles.eyeBtn}>
                    <Ionicons name={showConfirmPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.passwordRequirements}>
                  <Text style={styles.requirementText}>• Minimum 8 characters</Text>
                  <Text style={styles.requirementText}>• Must match current password</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPasswordModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, updatingPassword && { opacity: 0.7 }]}
                onPress={handleChangePassword}
                disabled={updatingPassword}
              >
                {updatingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fe', marginTop: 30 },
  headerContent: { paddingBottom: 10 },
  profileCard: {
    backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12,
  },
  profileTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a73e8',
    justifyContent: 'center', alignItems: 'center', elevation: 2,
  },
  avatarLargeText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  mainInfo: { marginLeft: 20, flex: 1 },
  userNameLarge: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },
  userEmailLarge: { fontSize: 14, color: '#666', marginTop: 4 },
  locationBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a73e8',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 8,
  },
  locationBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600', marginLeft: 4 },
  bioText: { fontSize: 14, color: '#444', lineHeight: 22 },
  settingsSection: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, paddingVertical: 8 },
  settingsGroupTitle: { fontSize: 12, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: 16, marginVertical: 12 },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  settingIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingLabel: { flex: 1, marginLeft: 14, fontSize: 15, fontWeight: '600', color: '#333' },
  sectionDivider: { height: 1, backgroundColor: '#eee', marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  sectionCount: { fontSize: 13, color: '#888', fontWeight: '500' },
  list: { paddingBottom: 20 },
  submissionCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  submissionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700', marginLeft: 4, textTransform: 'uppercase' },
  submissionDate: { fontSize: 11, color: '#999' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  deleteBtn: { padding: 4, marginLeft: 12 },
  submissionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', lineHeight: 24 },
  submissionLocation: { fontSize: 12, color: '#666', marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  rejectionBox: { backgroundColor: '#fff1f0', borderRadius: 8, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#ffa39e' },
  rejectionLabel: { fontSize: 12, fontWeight: '800', color: '#cf1322' },
  rejectionText: { fontSize: 12, color: '#434343', marginTop: 4 },
  emptyContainer: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { color: '#999', fontSize: 16, marginTop: 16, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  modalBody: { padding: 20 },
  modalBodyScroll: { maxHeight: 400 },
  modalBodyInternal: { paddingHorizontal: 20, paddingVertical: 15 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 15, color: '#333' },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 16,
    paddingRight: 12,
  },
  passwordInput: { flex: 1, padding: 12, fontSize: 15, color: '#333' },
  eyeBtn: { padding: 4 },
  passwordRequirements: { marginTop: 4, marginBottom: 15 },
  requirementText: { fontSize: 13, color: '#666', marginBottom: 4 },
  row: { flexDirection: 'row' },
  modalFooter: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', marginRight: 12, borderRadius: 12, backgroundColor: '#f5f5f5' },
  cancelBtnText: { fontSize: 16, fontWeight: '700', color: '#666' },
  saveBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#1a73e8' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  center: { padding: 40, alignItems: 'center' },
});
