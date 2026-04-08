import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

type RouteItem = {
  id: string;
  name: string;
};

type VerifyResult = {
  routeCount: number;
  firstRouteName: string | null;
};

type MobileAuthResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string | null;
    name: string | null;
  };
};

const ACCESS_TOKEN_KEY = 'plan-my-route-access-token';

export default function HomeScreen() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const apiOrigin = useMemo(getApiOrigin, []);
  const githubClientId = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID ?? '';
  const redirectUri = useMemo(
    () => AuthSession.makeRedirectUri({ scheme: 'planmyrouteapp', path: 'oauth/github' }),
    [],
  );

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: githubClientId,
      redirectUri,
      scopes: ['read:user', 'user:email'],
      usePKCE: true,
    },
    { authorizationEndpoint: 'https://github.com/login/oauth/authorize' },
  );

  useEffect(() => {
    void restoreAndVerifyToken({
      apiOrigin,
      onBusyChange: setIsBusy,
      onErrorChange: setErrorMessage,
      onTokenChange: setAccessToken,
      onVerifyChange: setVerifyResult,
    });
  }, [apiOrigin]);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const code = response.params.code;
    const codeVerifier = request?.codeVerifier;
    if (!code || !codeVerifier) {
      setErrorMessage('GitHub authorization code or PKCE verifier is missing.');
      return;
    }

    void exchangeAndVerify({
      apiOrigin,
      code,
      codeVerifier,
      redirectUri,
      onBusyChange: setIsBusy,
      onErrorChange: setErrorMessage,
      onTokenChange: setAccessToken,
      onVerifyChange: setVerifyResult,
    });
  }, [apiOrigin, redirectUri, request?.codeVerifier, response]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>
            Plan My Route
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            GitHub 로그인 후 web과 동일 계정으로 API를 확인합니다.
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.stepContainer}>
          <Pressable
            onPress={() => {
              setErrorMessage(null);
              void promptAsync();
            }}
            disabled={!request || isBusy || !githubClientId || !apiOrigin}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              (!request || isBusy || !githubClientId || !apiOrigin) && styles.buttonDisabled,
            ]}>
            <ThemedText style={styles.buttonText}>
              {isBusy ? '로그인 처리 중...' : 'GitHub로 로그인'}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() =>
              signOut({
                onBusyChange: setIsBusy,
                onErrorChange: setErrorMessage,
                onTokenChange: setAccessToken,
                onVerifyChange: setVerifyResult,
              })
            }
            disabled={!accessToken || isBusy}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
              (!accessToken || isBusy) && styles.buttonDisabled,
            ]}>
            <ThemedText style={styles.secondaryButtonText}>로그아웃</ThemedText>
          </Pressable>

          <ThemedText type="small">API: {apiOrigin || 'EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 미설정'}</ThemedText>
          <ThemedText type="small">Redirect URI: {redirectUri}</ThemedText>
          <ThemedText type="small">
            상태: {accessToken ? '토큰 저장됨' : '로그인 필요'}
          </ThemedText>
          <ThemedText type="small">
            검증: {verifyResult ? `성공 (루트 ${verifyResult.routeCount}개)` : '미확인'}
          </ThemedText>
          {verifyResult?.firstRouteName ? (
            <ThemedText type="small">첫 루트: {verifyResult.firstRouteName}</ThemedText>
          ) : null}
          {errorMessage ? (
            <ThemedText type="small" style={styles.errorText}>
              오류: {errorMessage}
            </ThemedText>
          ) : null}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

async function restoreAndVerifyToken({
  apiOrigin,
  onBusyChange,
  onErrorChange,
  onTokenChange,
  onVerifyChange,
}: {
  apiOrigin: string;
  onBusyChange: (next: boolean) => void;
  onErrorChange: (next: string | null) => void;
  onTokenChange: (next: string | null) => void;
  onVerifyChange: (next: VerifyResult | null) => void;
}) {
  if (!apiOrigin) return;
  const storedToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (!storedToken) return;

  onBusyChange(true);
  onErrorChange(null);
  try {
    const verify = await fetchRoutes(apiOrigin, storedToken);
    onTokenChange(storedToken);
    onVerifyChange(verify);
  } catch {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    onTokenChange(null);
    onVerifyChange(null);
  } finally {
    onBusyChange(false);
  }
}

async function exchangeAndVerify({
  apiOrigin,
  code,
  codeVerifier,
  redirectUri,
  onBusyChange,
  onErrorChange,
  onTokenChange,
  onVerifyChange,
}: {
  apiOrigin: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  onBusyChange: (next: boolean) => void;
  onErrorChange: (next: string | null) => void;
  onTokenChange: (next: string | null) => void;
  onVerifyChange: (next: VerifyResult | null) => void;
}) {
  if (!apiOrigin) {
    onErrorChange('EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN is required.');
    return;
  }

  onBusyChange(true);
  onErrorChange(null);
  try {
    const authResponse = await fetch(`${apiOrigin}/api/mobile/auth/github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        codeVerifier,
        redirectUri,
      }),
    });
    if (!authResponse.ok) {
      throw new Error(`mobile auth failed (${authResponse.status})`);
    }

    const authJson = (await authResponse.json()) as MobileAuthResponse;
    if (!authJson.accessToken) {
      throw new Error('accessToken is missing from auth response');
    }

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, authJson.accessToken);
    onTokenChange(authJson.accessToken);
    const verify = await fetchRoutes(apiOrigin, authJson.accessToken);
    onVerifyChange(verify);
  } catch (error: unknown) {
    onErrorChange(error instanceof Error ? error.message : 'Failed to login');
  } finally {
    onBusyChange(false);
  }
}

async function signOut({
  onBusyChange,
  onErrorChange,
  onTokenChange,
  onVerifyChange,
}: {
  onBusyChange: (next: boolean) => void;
  onErrorChange: (next: string | null) => void;
  onTokenChange: (next: string | null) => void;
  onVerifyChange: (next: VerifyResult | null) => void;
}) {
  onBusyChange(true);
  onErrorChange(null);
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    onTokenChange(null);
    onVerifyChange(null);
  } finally {
    onBusyChange(false);
  }
}

async function fetchRoutes(apiOrigin: string, token: string): Promise<VerifyResult> {
  const response = await fetch(`${apiOrigin}/api/routes`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GET /api/routes failed (${response.status}): ${text}`);
  }

  const routes = (await response.json()) as RouteItem[];
  return {
    routeCount: Array.isArray(routes) ? routes.length : 0,
    firstRouteName: Array.isArray(routes) && routes[0]?.name ? routes[0].name : null,
  };
}

function getApiOrigin() {
  const raw = process.env.EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN ?? '';
  return raw.trim().replace(/\/+$/, '');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  stepContainer: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
  primaryButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    backgroundColor: '#24292F',
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  secondaryButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A0A4AE',
  },
  secondaryButtonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 700,
  },
  secondaryButtonText: {
    fontWeight: 600,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: '#D64545',
  },
});
