import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Easing,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const NUM_STARS = 40;

const SplashScreen = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const orbitAnim = useRef(new Animated.Value(0)).current;
  
  // Stars animations
  const starAnims = useRef([...Array(NUM_STARS)].map(() => new Animated.Value(Math.random()))).current;

  useEffect(() => {
    // Basic Fade and Scale
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Loop Orbit
    Animated.loop(
      Animated.timing(orbitAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Twinkling Stars
    starAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.2,
            duration: 1000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // Finish after 4 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        onFinish && onFinish();
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const renderStars = () => {
    return starAnims.map((anim, i) => {
      const top = Math.random() * height;
      const left = Math.random() * width;
      const size = Math.random() * 3;
      return (
        <Animated.View
          key={i}
          style={[
            styles.star,
            {
              top,
              left,
              width: size,
              height: size,
              opacity: anim,
            },
          ]}
        />
      );
    });
  };

  const orbitOneX = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.PI * 2],
  });

  const getOrbitStyle = (radius, speedMod, delay) => {
    const x = orbitAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, Math.PI * 2 * speedMod],
    });
    
    return {
      transform: [
        { translateX: Animated.multiply(radius, Animated.map(x, Math.cos)) }, // Wait, map doesn't exist in Animated
        // I'll use a trick or just simplify
      ]
    };
  };

  // Simpler Orbit using translation around center
  const orbit1X = orbitAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 100, 0, -100, 0],
  });
  const orbit1Y = orbitAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [-100, 0, 100, 0, -100],
  });

  const orbit2X = orbitAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -150, 0, 150, 0],
  });
  const orbit2Y = orbitAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [150, 0, -150, 0, 150],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" transparent backgroundColor="transparent" />
      
      {/* Space Background */}
      <View style={styles.starsContainer}>
        {renderStars()}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* Orbiting Planet 1 */}
        <Animated.View style={[styles.orbitingPlanet, { transform: [{ translateX: orbit1X }, { translateY: orbit1Y }] }]}>
          <View style={[styles.planet, { width: 15, height: 15, backgroundColor: '#4fc3f7' }]} />
        </Animated.View>

        {/* Orbiting Planet 2 */}
        <Animated.View style={[styles.orbitingPlanet, { transform: [{ translateX: orbit2X }, { translateY: orbit2Y }] }]}>
          <View style={[styles.planet, { width: 10, height: 10, backgroundColor: '#ff8a65' }]} />
        </Animated.View>

        {/* Center Planet (Global News) */}
        <View style={styles.centerPlanetContainer}>
          <View style={styles.glow} />
          <Image 
            source={require('../../../assets/icon.png')} 
            style={styles.logoImage} 
            resizeMode="contain" 
          />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.appName}>Intelligent News App</Text>
          <View style={styles.taglineWrapper}>
            <View style={styles.line} />
            <Text style={styles.tagline}>GLOBAL PERSPECTIVE</Text>
            <View style={styles.line} />
          </View>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Stay Connected to the World</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050a14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  starsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 5,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPlanetContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderRadius: 30,
    elevation: 20, shadowColor: '#1a73e8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  logoImage: { width: 150, height: 150 },
  glow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(26, 115, 232, 0.2)',
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  orbitingPlanet: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planet: {
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 5,
  },
  titleContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 10,
  },
  taglineWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    width: 30,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginHorizontal: 15,
    letterSpacing: 2,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
  },
  footerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    letterSpacing: 1,
  },
});

export default SplashScreen;
