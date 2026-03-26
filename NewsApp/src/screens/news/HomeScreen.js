import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, TextInput, SafeAreaView,
  ScrollView, Modal, Animated, Keyboard
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import api from '../../services/api';
import NewsCard from '../../components/common/NewsCard';
import { getSavedLocation, saveLocation } from '../../utils/storage';
import { useAuth } from '../../context/AuthContext';

const TABS = ['Latest', 'Community'];
const CATEGORIES = ['All', 'Business', 'Entertainment', 'Health', 'Science', 'Sports', 'Technology', 'Top', 'World'];
const SUGGESTED_CHANNELS = ['bbc.co.uk', 'cnn.com', 'reuters.com', 'aljazeera.com', 'theguardian.com', 'nytimes.com', 'bloomberg.com', 'techcrunch.com'];
const HEADER_MAX_HEIGHT = 330;

// Memoized NewsCard for performance
const MemoizedNewsCard = React.memo(NewsCard);

export default function HomeScreen({ navigation, route }) {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('Latest');
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [nextPage, setNextPage] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [location, setLocation] = useState(user?.city ? {
    city: user.city,
    country_code: user.country_code || 'us',
    latitude: user.latitude,
    longitude: user.longitude,
  } : null);

  // Effect to listen for location updates from ChangeLocationScreen (serializable navigation fix)
  useEffect(() => {
    if (route.params?.updatedLocation) {
      setLocation(route.params.updatedLocation);
      // Clean up the param to prevent re-triggering
      navigation.setParams({ updatedLocation: undefined });
    }
  }, [route.params?.updatedLocation]);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const [lastSelected, setLastSelected] = useState('');

  // Filter States
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterDomain, setFilterDomain] = useState('');
  const [filterTimeframe, setFilterTimeframe] = useState('');
  const [filterSort, setFilterSort] = useState('');

  // Draft Filter States
  const [draftDomain, setDraftDomain] = useState('');
  const [draftTimeframe, setDraftTimeframe] = useState('');
  const [draftSort, setDraftSort] = useState('');

  const [availableChannels, setAvailableChannels] = useState([]);

  // Animation Refs
  const scrollY = React.useRef(new Animated.Value(0)).current;

  // Clamp scrollY to 0+ to avoid issues with bouncy scrolling (iOS)
  const clampedScrollY = scrollY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolateLeft: 'clamp',
  });

  const clampedScroll = Animated.diffClamp(clampedScrollY, 0, HEADER_MAX_HEIGHT);

  const headerTranslate = clampedScroll.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT],
    outputRange: [0, -HEADER_MAX_HEIGHT],
    extrapolate: 'clamp',
  });

  // Auto-detect location on first load if not saved
  useEffect(() => {
    const initLocation = async () => {
      const saved = await getSavedLocation();
      if (saved) {
        setLocation(saved);
      } else {
        // Friendly onboarding prompt for new users
        Alert.alert(
          'Enable Location',
          'To give you the most relevant local news from your city, could we detect your location?',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Detect My City', onPress: () => detectLocation() }
          ],
          { cancelable: true }
        );
      }
    };
    initLocation();
  }, []);

  useFocusEffect(useCallback(() => {
    fetchNews();
  }, [tab, location, selectedCategory, filterDomain, filterTimeframe, filterSort]));

  const detectLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show Intelligent News App.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geocode = await Location.reverseGeocodeAsync(pos.coords);
      if (geocode.length > 0) {
        const place = geocode[0];
        const newLoc = {
          city: place.city || place.region || '',
          country_code: (place.isoCountryCode || 'us').toLowerCase(),
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setLocation(newLoc);
        await saveLocation(newLoc);
        if (user) {
          await api.patch('/api/auth/profile/', {
            city: newLoc.city,
            country_code: newLoc.country_code,
            latitude: newLoc.latitude,
            longitude: newLoc.longitude,
          });
        }
      }
    } catch { }
  };

  const fetchNews = async (page = null, append = false, queryOverride = null) => {
    if (!append) {
      setLoading(true);
      if (!refreshing) setNews([]); // Clear ONLY on fresh navigate/tab change, not on pull-to-refresh
    }
    try {
      let data;
      const currentQuery = queryOverride !== null ? queryOverride : search.trim();
      if (tab === 'Latest') {
        const params = { country: location.country_code };
        if (currentQuery) params.q = currentQuery;
        if (selectedCategory !== 'All') params.category = selectedCategory.toLowerCase();
        if (filterDomain.trim()) params.domain = filterDomain.trim();
        if (filterTimeframe) params.timeframe = filterTimeframe;
        if (filterSort) params.prioritydomain = filterSort;
        if (page) params.page = page;
        const res = await api.get('/api/news/external/', { params });
        data = res.data;
        const newItems = data.results || [];
        const combined = append ? [...news, ...newItems] : newItems;
        // Deduplicate by article_id or id
        const seen = new Set();
        const unique = combined.filter((item) => {
          const id = item.article_id || item.id;
          if (id === undefined || id === null) return true;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        setNews(unique);
        setTotalResults(data.totalResults || 0);
        setNextPage(data.nextPage || null);

        if (data.results) {
          const channels = [...new Set(data.results.map(item => item.source_id).filter(Boolean))];
          setAvailableChannels(prev => [...new Set([...prev, ...channels])].slice(0, 15));
        }
      } else {
        const params = { country: location.country_code };
        if (currentQuery) params.q = currentQuery;
        const res = await api.get('/api/news/community/', { params });
        const newItems = res.data.results || [];
        const combined = append ? [...news, ...newItems] : newItems;
        // Deduplicate by article_id or id
        const seen = new Set();
        const unique = combined.filter((item) => {
          const id = item.article_id || item.id;
          if (id === undefined || id === null) return true;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        setNews(unique);
        setTotalResults(res.data.count || res.data.length || 0);
        setNextPage(null);
      }
    } catch {
      if (!append) setNews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setNextPage(null);
    fetchNews();
  };

  const loadMore = () => {
    if (nextPage && !loadingMore && tab === 'Latest') {
      setLoadingMore(true);
      fetchNews(nextPage, true);
    }
  };

  const handleSearch = () => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    setSuggestions([]);
    setSearching(false);
    setNextPage(null);
    fetchNews();
  };

  useEffect(() => {
    if (search.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (search === lastSelected) {
      setShowSuggestions(false);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      fetchSuggestions();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, lastSelected]);

  const fetchSuggestions = async () => {
    setFetchingSuggestions(true);
    setShowSuggestions(true);
    try {
      const res = await api.get('/api/news/suggestions/', {
        params: { q: search, country: location.country_code }
      });
      setSuggestions(res.data);
    } catch {
      setSuggestions([]);
    } finally {
      setFetchingSuggestions(false);
    }
  };

  const handleSuggestionSelect = (item) => {
    Keyboard.dismiss();
    setLastSelected(item.title);
    setSearch(item.title);
    setShowSuggestions(false);
    setSuggestions([]);
    if (item.type === 'community') {
      navigation.navigate('NewsDetail', { item, isCommunity: true, userCountry: location?.country_code });
    } else {
      handleSearch();
    }
  };

  const applyFilters = () => {
    setFilterDomain(draftDomain);
    setFilterTimeframe(draftTimeframe);
    setFilterSort(draftSort);
    setShowFilterModal(false);
    setNextPage(null);
  };

  const clearFilters = () => {
    setDraftDomain('');
    setDraftTimeframe('');
    setDraftSort('');
    setFilterDomain('');
    setFilterTimeframe('');
    setFilterSort('');
    setShowFilterModal(false);
    setNextPage(null);
  };

  const openFilters = () => {
    setDraftDomain(filterDomain);
    setDraftTimeframe(filterTimeframe);
    setDraftSort(filterSort);
    setShowFilterModal(true);
  };

  const locationLabel = location
    ? (location.city ? `${location.city} · ${location.country_code?.toUpperCase()}` : location.country_code?.toUpperCase())
    : 'Detecting...';

  return (
    <SafeAreaView style={styles.safe}>
      {/* News List */}
      <Animated.FlatList
        data={news}
        keyExtractor={(item, i) => `${item.article_id || item.id || ''}-${i}`}
        renderItem={({ item }) => (
          <MemoizedNewsCard
            item={item}
            isCommunity={tab === 'Community'}
            userCountry={location?.country_code}
            onPress={() => navigation.navigate('NewsDetail', { item, isCommunity: tab === 'Community', userCountry: location?.country_code })}
          />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingTop: tab === 'Latest' ? HEADER_MAX_HEIGHT + 20 : HEADER_MAX_HEIGHT + 20 }
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a73e8']} progressViewOffset={HEADER_MAX_HEIGHT} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          (!loading && news.length === 0) ? (
            <View style={[styles.center, { marginTop: HEADER_MAX_HEIGHT / 2 }]}>
              <Ionicons name="newspaper-outline" size={60} color="#ddd" />
              <Text style={styles.emptyText}>No news found.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={null}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      />

      {/* Floating Header */}
      <Animated.View style={[
        styles.headerContainer,
        { transform: [{ translateY: headerTranslate }] }
      ]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.appTitle}>Intelligent News App</Text>
          <TouchableOpacity
            style={styles.locationBtn}
            onPress={() => navigation.navigate('ChangeLocation', { location })}
          >
            <Ionicons name="location-outline" size={14} color="#1a73e8" />
            <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
            <Ionicons name="chevron-down" size={14} color="#1a73e8" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search news..."
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                if (text !== lastSelected) setLastSelected('');
              }}
              onSubmitEditing={handleSearch}
              placeholderTextColor="#aaa"
              returnKeyType="search"
              onFocus={() => {
                if (search.length >= 2 && search !== lastSelected) setShowSuggestions(true);
              }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearch(''); setLastSelected(''); setSuggestions([]); setShowSuggestions(false); fetchNews(null, false, '');
              }}>
                <Ionicons name="close-circle" size={16} color="#aaa" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={openFilters}>
            <Ionicons name="options-outline" size={24} color="#1a73e8" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabActive]}
              onPress={() => { setTab(t); setSelectedCategory('All'); }}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Row */}
        <View style={styles.countRow}>
          {!loading && (
            <Text style={styles.countText}>
              {`${totalResults} article${totalResults !== 1 ? 's' : ''} found`}
            </Text>
          )}
        </View>

        {/* Categories */}
        {tab === 'Latest' && (
          <View style={styles.categoriesWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </Animated.View>

      {/* Suggestions Dropdown (Highest Layer) */}
      {showSuggestions && (search.length >= 2) && (
        <View style={[styles.suggestionsDropdown, { top: 135 }]}>
          {fetchingSuggestions ? (
            <View style={styles.suggestionLoading}>
              <Text style={styles.suggestionLoadingText}>Searching...</Text>
            </View>
          ) : suggestions.length === 0 ? (
            <View style={styles.suggestionEmpty}>
              <Text style={styles.suggestionEmptyText}>No matches found</Text>
            </View>
          ) : (
            <FlatList
              data={suggestions}
              keyExtractor={(item, i) => i.toString()}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionSelect(item)}
                >
                  <Ionicons name={item.type === 'community' ? 'people-outline' : 'globe-outline'} size={14} color="#666" style={{ marginRight: 10 }} />
                  <Text style={styles.suggestionText} numberOfLines={1}>{item.title}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* Consolidated Loader Overlay (Center of the screen below header) */}
      {loading && !refreshing && news.length === 0 && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#1a73e8" />
        </View>
      )}

      {/* Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Advanced Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.filterLabel}>News Channel (Domain)</Text>
              <TextInput style={styles.filterInput} placeholder="e.g. bbc.co.uk" value={draftDomain} onChangeText={setDraftDomain} autoCapitalize="none" />
              
              <View style={styles.suggestedChannelsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedChannelsScroll}>
                  {[...new Set([...availableChannels, ...SUGGESTED_CHANNELS])].map((ch) => (
                    <TouchableOpacity 
                      key={ch} 
                      style={[styles.channelChip, draftDomain === ch && styles.channelChipActive]} 
                      onPress={() => setDraftDomain(ch)}
                    >
                      <Text style={[styles.channelChipText, draftDomain === ch && styles.channelChipTextActive]}>{ch}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <Text style={styles.filterLabel}>Date & Time</Text>
              <View style={styles.filterOptions}>
                {['', '24', '48', '7d'].map((tf) => (
                  <TouchableOpacity key={tf} style={[styles.filterOption, draftTimeframe === tf && styles.filterOptionActive]} onPress={() => setDraftTimeframe(tf)}>
                    <Text style={[styles.filterOptionText, draftTimeframe === tf && styles.filterOptionTextActive]}>{tf === '' ? 'All Time' : tf === '7d' ? 'Past 7 days' : `Past ${tf} hours`}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalBtnClear} onPress={clearFilters}><Text style={styles.modalBtnClearText}>Clear</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnApply} onPress={applyFilters}><Text style={styles.modalBtnApplyText}>Apply</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7ff' },
  headerContainer: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 1000, backgroundColor: '#fff', paddingTop: 35,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    overflow: 'visible',
  },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  appTitle: { fontSize: 20, fontWeight: '800', color: '#1a73e8' },
  locationBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f0fe', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, maxWidth: 180 },
  locationText: { fontSize: 12, color: '#1a73e8', marginHorizontal: 4, fontWeight: '500' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#222', marginLeft: 6 },
  filterBtn: { marginLeft: 12, padding: 4 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabBtn: { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#1a73e8' },
  tabText: { fontSize: 14, color: '#888', fontWeight: '500' },
  tabTextActive: { color: '#1a73e8', fontWeight: '700' },
  categoriesWrapper: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 10 },
  categoriesScroll: { paddingHorizontal: 16 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5', marginRight: 8 },
  categoryChipActive: { backgroundColor: '#1a73e8' },
  categoryText: { fontSize: 13, color: '#555' },
  categoryTextActive: { color: '#fff' },
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: '#aaa', fontSize: 15, marginTop: 12 },
  retryBtn: { marginTop: 16, backgroundColor: '#1a73e8', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
  countRow: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  countText: { fontSize: 13, color: '#888' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 20 },
  filterLabel: { fontSize: 14, fontWeight: '700', color: '#444', marginBottom: 10 },
  filterInput: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 20 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  filterOption: { backgroundColor: '#f5f5f5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filterOptionActive: { backgroundColor: '#1a73e8' },
  filterOptionText: { color: '#555', fontSize: 13 },
  filterOptionTextActive: { color: '#fff' },
  modalFooter: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#eee' },
  modalBtnClear: { flex: 1, paddingVertical: 14, alignItems: 'center', marginRight: 10, borderRadius: 8, backgroundColor: '#f5f5f5' },
  modalBtnClearText: { color: '#555' },
  modalBtnApply: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#1a73e8' },
  modalBtnApplyText: { color: '#fff' },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 247, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 500, // Below the floating header (1000) but above the list
    paddingTop: HEADER_MAX_HEIGHT,
  },
  suggestionsDropdown: {
    position: 'absolute', left: 16, right: 60,
    backgroundColor: '#fff', borderRadius: 12, elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
    zIndex: 2000, maxHeight: 300, paddingVertical: 8,
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  suggestionText: { fontSize: 14, color: '#333', flex: 1 },
  suggestionLoading: { flexDirection: 'row', alignItems: 'center', padding: 20, justifyContent: 'center' },
  suggestionLoadingText: { marginLeft: 10, color: '#666' },
  suggestionEmpty: { padding: 20, alignItems: 'center' },
  suggestionEmptyText: { color: '#999' },
  suggestedChannelsWrapper: { marginBottom: 20, marginTop: -10 },
  suggestedChannelsScroll: { paddingVertical: 5 },
  channelChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f0f4f8', marginRight: 8, borderWidth: 1, borderColor: '#d1d9e6' },
  channelChipActive: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  channelChipText: { fontSize: 12, color: '#555' },
  channelChipTextActive: { color: '#fff', fontWeight: '600' },
});
