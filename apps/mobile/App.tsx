import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { brand, colors, radii, spacing } from '@gdf/shared';
import { supabase, supabaseConfigured, webUrl } from './lib/supabase';

interface WalletCredential {
  id: string;
  type: string;
  event_name: string;
  issued_at: string;
  status: string;
  verification_code: string;
  asset_url: string | null;
  org_name: string;
  template_name: string;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {!ready ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : session ? (
        <WalletScreen session={session} />
      ) : (
        <AuthScreen />
      )}
    </View>
  );
}

function Seal() {
  return (
    <View style={styles.seal}>
      <Text style={styles.sealText}>GDF</Text>
    </View>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit() {
    if (!supabaseConfigured) {
      setError('App not configured: set EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role: 'member' } },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice('Check your email to confirm your account, then sign in.');
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      // Claim-by-email: link anything issued to this address before signup.
      await supabase.rpc('claim_my_credentials');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.authScroll}>
      <Seal />
      <Text style={styles.kicker}>{brand.poweredBy.toUpperCase()}</Text>
      <Text style={styles.title}>{brand.name}</Text>
      <Text style={styles.tagline}>{brand.tagline}</Text>

      <View style={styles.form}>
        {mode === 'signup' ? (
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={colors.muted}
            value={fullName}
            onChangeText={setFullName}
          />
        ) : null}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        <Pressable style={[styles.cta, busy && styles.disabled]} onPress={submit} disabled={busy}>
          <Text style={styles.ctaText}>{busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}</Text>
        </Pressable>
        <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          <Text style={styles.switchText}>
            {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function WalletScreen({ session }: { session: Session }) {
  const [credentials, setCredentials] = useState<WalletCredential[]>([]);
  const [publicSlug, setPublicSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<WalletCredential | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      await supabase.rpc('claim_my_credentials');
      const [{ data: creds, error: credError }, { data: profile }] = await Promise.all([
        supabase
          .from('credentials')
          .select('id, type, event_name, issued_at, status, verification_code, asset_url, template_id, organizations(name)')
          .order('issued_at', { ascending: false }),
        supabase.from('profiles').select('public_slug').eq('id', session.user.id).single(),
      ]);
      if (credError) throw new Error(credError.message);
      setPublicSlug(profile?.public_slug ?? '');

      const badgeIds = (creds ?? []).filter((c) => c.type === 'badge').map((c) => c.template_id);
      const { data: templates } = badgeIds.length
        ? await supabase.from('badge_templates').select('id, name').in('id', badgeIds)
        : { data: [] as Array<{ id: string; name: string }> };
      const nameById = new Map((templates ?? []).map((t) => [t.id, t.name]));

      setCredentials(
        (creds ?? []).map((c) => ({
          id: c.id,
          type: c.type,
          event_name: c.event_name,
          issued_at: c.issued_at,
          status: c.status,
          verification_code: c.verification_code,
          asset_url: c.asset_url,
          org_name: (c.organizations as unknown as { name: string } | null)?.name ?? '',
          template_name: nameById.get(c.template_id) ?? (c.type === 'badge' ? 'Badge' : 'Certificate'),
        })),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [session.user.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (selected) {
    return <DetailScreen credential={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <View style={styles.walletRoot}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My credentials</Text>
        <Pressable onPress={() => supabase.auth.signOut()}>
          <Text style={styles.headerAction}>Sign out</Text>
        </Pressable>
      </View>
      <Text style={styles.headerSub}>{session.user.email}</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.cta} onPress={load}>
            <Text style={styles.ctaText}>Retry</Text>
          </Pressable>
        </View>
      ) : credentials.length === 0 ? (
        <View style={styles.center}>
          <Seal />
          <Text style={styles.emptyTitle}>No credentials yet</Text>
          <Text style={styles.emptyBody}>
            When a conference issues a badge or certificate to your email, it appears here automatically.
          </Text>
        </View>
      ) : (
        <FlatList
          data={credentials}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
          ListFooterComponent={
            publicSlug ? (
              <Pressable
                style={styles.profileLink}
                onPress={() => Share.share({ message: `${webUrl}/u/${publicSlug}` })}
              >
                <Text style={styles.switchText}>Share my public profile</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => setSelected(item)}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{item.template_name}</Text>
                <Text style={[styles.pill, item.status === 'revoked' ? styles.pillRevoked : styles.pillOk]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.cardSub}>
                {item.event_name} · {item.org_name}
              </Text>
              <Text style={styles.cardDate}>Issued {new Date(item.issued_at).toLocaleDateString()}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function DetailScreen({ credential, onBack }: { credential: WalletCredential; onBack: () => void }) {
  const verifyUrl = `${webUrl}/verify/${credential.verification_code}`;
  return (
    <ScrollView contentContainerStyle={styles.detailScroll}>
      <Pressable onPress={onBack}>
        <Text style={styles.headerAction}>‹ Back</Text>
      </Pressable>
      <Seal />
      <Text style={styles.kicker}>{credential.type.toUpperCase()}</Text>
      <Text style={styles.title}>{credential.template_name}</Text>
      <Text style={styles.tagline}>
        {credential.event_name} · {credential.org_name}
      </Text>
      <Text style={[styles.pill, credential.status === 'revoked' ? styles.pillRevoked : styles.pillOk, { marginTop: spacing.md }]}>
        {credential.status.toUpperCase()}
      </Text>

      <View style={{ gap: spacing.sm, marginTop: spacing.xl, width: '100%', maxWidth: 420 }}>
        <Pressable style={styles.cta} onPress={() => Linking.openURL(verifyUrl)}>
          <Text style={styles.ctaText}>Open verify page</Text>
        </Pressable>
        <Pressable
          style={styles.outlineButton}
          onPress={() => Share.share({ message: `Verify my ${credential.template_name} credential: ${verifyUrl}` })}
        >
          <Text style={styles.outlineButtonText}>Share verify link</Text>
        </Pressable>
        {credential.asset_url ? (
          <Pressable style={styles.outlineButton} onPress={() => Linking.openURL(credential.asset_url!)}>
            <Text style={styles.outlineButtonText}>Download certificate PDF</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.codeText}>Code: {credential.verification_code}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  authScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  detailScroll: { flexGrow: 1, alignItems: 'center', padding: spacing.lg, paddingTop: spacing.xxl },
  walletRoot: { flex: 1, paddingTop: spacing.xxl - spacing.md },
  seal: {
    width: 76, height: 76, borderRadius: radii.pill, borderWidth: 3, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  sealText: { color: colors.text, fontSize: 22, fontWeight: '700', letterSpacing: 2 },
  kicker: { color: colors.accent, fontSize: 12, letterSpacing: 4, marginBottom: spacing.xs },
  title: { color: colors.text, fontSize: 30, fontWeight: '700', textAlign: 'center' },
  tagline: { color: colors.muted, fontSize: 15, textAlign: 'center', marginTop: spacing.xs, maxWidth: 320 },
  form: { width: '100%', maxWidth: 420, marginTop: spacing.xl, gap: spacing.sm },
  input: {
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.sm,
    color: colors.text, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 16,
  },
  cta: { backgroundColor: colors.primary, borderRadius: radii.sm, paddingVertical: 14, alignItems: 'center' },
  ctaText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  outlineButton: {
    borderColor: colors.primary, borderWidth: 1, borderRadius: radii.sm, paddingVertical: 14, alignItems: 'center',
  },
  outlineButtonText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  switchText: { color: colors.accent, textAlign: 'center', marginTop: spacing.sm, fontWeight: '600' },
  error: { color: colors.danger, textAlign: 'center' },
  notice: { color: colors.accent, textAlign: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: '700' },
  headerAction: { color: colors.accent, fontWeight: '600', padding: spacing.xs },
  headerSub: { color: colors.muted, fontSize: 12, paddingHorizontal: spacing.md, marginTop: 2 },
  card: {
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
    borderRadius: radii.md, padding: spacing.md,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700', flex: 1, marginRight: spacing.sm },
  cardSub: { color: colors.muted, fontSize: 13, marginTop: 4 },
  cardDate: { color: colors.muted, fontSize: 11, marginTop: 2 },
  pill: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1, overflow: 'hidden',
    borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 3,
  },
  pillOk: { color: colors.success, backgroundColor: 'rgba(60, 172, 103, 0.15)' },
  pillRevoked: { color: colors.danger, backgroundColor: 'rgba(239, 45, 67, 0.15)' },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: spacing.sm },
  emptyBody: { color: colors.muted, textAlign: 'center', marginTop: spacing.xs, maxWidth: 300 },
  profileLink: { marginTop: spacing.md, alignItems: 'center' },
  codeText: { color: colors.muted, fontSize: 11, marginTop: spacing.lg, fontFamily: 'monospace' },
});
