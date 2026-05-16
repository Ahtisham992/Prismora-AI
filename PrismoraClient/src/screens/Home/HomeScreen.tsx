import React, { useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reels from '../../components/molecules/ReelItem';
import { postsService } from '../../services/postsService';

const LOGO = require('../../assets/icons/PrismoraLogo.png');
const LIMIT = 5;

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const [reels, setReels] = useState<any[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFeed = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await postsService.fetchFeed(cursor || undefined, LIMIT);
      const { data, nextCursor } = response.data;
      const mappedData = data.map((item: any) => ({
        ...item,
        creator: {
          id: item.creator.id,
          name: item.creator.username,
          avatar: item.creator.profilePhoto,
        },
      }));
      setReels(prev => {
        const newData = mappedData.filter(
          (item: any) => !prev.some(p => p.id === item.id)
        );
        return [...prev, ...newData];
      });
      setCursor(nextCursor ?? null);
    } catch (err) {
      console.log('Feed error:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFeed(); }, []);
  useEffect(() => {
    if (reels.length > 0 && reels.length % LIMIT === 0) {
      fetchFeed();
    }
  }, [reels.length]);

  return (
    <View style={styles.container}>
      <Reels data={reels} />

      {/*
        Logo row — positioned to match the Header on other screens:
        • top = insets.top + 12  (insets.top clears status bar; +12 matches
          the breathing room the Screen/SafeAreaView gives other headings)
        • left = 16  (same as Header paddingHorizontal)
      */}
      <View
        style={[styles.logoRow, { top: insets.top + 12 }]}
        pointerEvents="none"
      >
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <View style={styles.textBlock}>
          <Text style={styles.brandName}>Prismora</Text>
          <Text style={styles.brandSuffix}> AI</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  logoRow: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 99,
  },
  logo: {
    width: 36,
    height: 36,
  },
  textBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 8,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  brandSuffix: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7C3AED',   // brand purple — matches the tab bar active colour
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default HomeScreen;