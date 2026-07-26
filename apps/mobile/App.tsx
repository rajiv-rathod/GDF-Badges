import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { brand, colors, radii, spacing } from '@gdf/shared';

/**
 * Phase 0 home screen — proves the shared GDF brand tokens drive the native UI.
 * Real member features (auth, credential wallet) arrive in Phases 1, 4, and 6.
 */
export default function App() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.seal}>
          <Text style={styles.sealText}>GDF</Text>
        </View>

        <Text style={styles.kicker}>{brand.poweredBy.toUpperCase()}</Text>
        <Text style={styles.title}>{brand.name}</Text>
        <Text style={styles.tagline}>{brand.tagline}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your credential wallet</Text>
          <Text style={styles.cardBody}>
            Badges and certificates issued to your email appear here the moment
            you sign in — verifiable, shareable, yours.
          </Text>
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaText}>Sign in — coming in Phase 1</Text>
        </View>

        <Text style={styles.footer}>{brand.org} — free for the MUN community</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  seal: {
    width: 88,
    height: 88,
    borderRadius: radii.pill,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  sealText: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 2,
  },
  kicker: {
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 4,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
  },
  tagline: {
    color: colors.muted,
    fontSize: 16,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 420,
  },
  cardTitle: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  cardBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
  },
  ctaText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.xl,
  },
});
