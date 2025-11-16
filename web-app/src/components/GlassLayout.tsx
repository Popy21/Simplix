import React, { ReactNode } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import GlassNavigation from './GlassNavigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NAV_WIDTH = SCREEN_WIDTH > 768 ? 280 : 72;
const IS_LARGE_SCREEN = SCREEN_WIDTH > 768;

interface GlassLayoutProps {
  children: ReactNode;
  hideNavigation?: boolean;
}

export default function GlassLayout({ children, hideNavigation = false }: GlassLayoutProps) {
  if (hideNavigation) {
    return <View style={styles.fullScreen}>{children}</View>;
  }

  return (
    <View style={styles.container}>
      {/* Glass Navigation Sidebar */}
      <View style={[styles.sidebar, { width: IS_LARGE_SCREEN ? NAV_WIDTH : 72 }]}>
        <GlassNavigation />
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
  },
  sidebar: {
    zIndex: 100,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  fullScreen: {
    flex: 1,
  },
});
