import React from 'react';
import { View, StyleSheet } from 'react-native';
import GlassLayout from './GlassLayout';
import GlassBottomNav from './GlassBottomNav';

/**
 * Higher-Order Component to wrap screens with GlassLayout and bottom navigation
 * Usage: export default withGlassLayout(YourScreen);
 */
export function withGlassLayout<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: { hideBottomNav?: boolean } = {}
) {
  return function WithGlassLayoutWrapper(props: P) {
    return (
      <GlassLayout>
        <View style={styles.container}>
          <WrappedComponent {...props} />
        </View>
        {!options.hideBottomNav && <GlassBottomNav />}
      </GlassLayout>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default withGlassLayout;
