import React, { ReactNode } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import GlassNavigation from './GlassNavigation';
import GlassBottomNav from './GlassBottomNav';
import { isMobile, isTablet, layout } from '../theme/responsive';

interface GlassLayoutProps {
  children: ReactNode;
  hideNavigation?: boolean;
}

export default function GlassLayout({ children, hideNavigation = false }: GlassLayoutProps) {
  if (hideNavigation) {
    return <View style={styles.fullScreen}>{children}</View>;
  }

  // Mobile: Bottom navigation
  if (isMobile) {
    return (
      <View style={styles.mobileContainer}>
        <View style={styles.mobileContent}>{children}</View>
        <GlassBottomNav />
      </View>
    );
  }

  // Tablet/Desktop: Sidebar navigation
  return (
    <View style={styles.container}>
      <View style={[styles.sidebar, { width: layout.sidebarWidth }]}>
        <GlassNavigation />
      </View>
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
  // Mobile styles
  mobileContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  mobileContent: {
    flex: 1,
    paddingBottom: layout.bottomNavHeight,
  },
});
