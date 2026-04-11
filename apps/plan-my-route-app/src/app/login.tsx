import * as AuthSession from 'expo-auth-session';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchRoutes } from '@/features/api/plan-my-route';
import {
  getApiOrigin,
  getGithubRedirectUri,
  getGoogleRedirectUri,
  getStoredAccessToken,
  setStoredAccessToken,
  GITHUB_AUTH_PATH,
  GITHUB_REDIRECT_URI_FALLBACK,
  GOOGLE_AUTH_PATH,
  GOOGLE_REDIRECT_URI_FALLBACK,
} from '@/features/auth/session';
import { MaxContentWidth, Spacing } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

type MobileAuthResponse = {
  accessToken: string;
};

const GOOGLE_ICON_URI = 'https://www.google.com/favicon.ico';
const GITHUB_ICON_URI_LIGHT = 'https://github.githubassets.com/favicons/favicon.png';
const GITHUB_ICON_URI_DARK = 'https://cdn.simpleicons.org/github/ffffff';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const apiOrigin = useMemo(getApiOrigin, []);
  const githubClientId = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID ?? '';
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
  const githubRedirectFromEnv = useMemo(getGithubRedirectUri, []);
  const hasValidGithubRedirectUri =
    githubRedirectFromEnv.startsWith('https://') ||
    githubRedirectFromEnv.startsWith('http://');
  const githubRedirectUri = hasValidGithubRedirectUri
    ? githubRedirectFromEnv
    : GITHUB_REDIRECT_URI_FALLBACK;
  const googleRedirectUri = useMemo(getGoogleRedirectUri, []);
  const hasValidGoogleRedirectUri =
    googleRedirectUri.startsWith('https://') || googleRedirectUri.startsWith('http://');
  const isGoogleOauthConfigValid = Boolean(googleClientId && hasValidGoogleRedirectUri);
  const isGithubOauthConfigValid = Boolean(githubClientId && githubRedirectUri);

  const [githubRequest, githubResponse, promptGithubAsync] = AuthSession.useAuthRequest(
    {
      clientId: githubClientId,
      redirectUri: githubRedirectUri,
      scopes: ['read:user', 'user:email'],
      usePKCE: true,
    },
    { authorizationEndpoint: 'https://github.com/login/oauth/authorize' },
  );
  const [googleRequest, googleResponse, promptGoogleAsync] = AuthSession.useAuthRequest(
    {
      clientId: googleClientId || 'missing-google-client-id',
      redirectUri: hasValidGoogleRedirectUri ? googleRedirectUri : GOOGLE_REDIRECT_URI_FALLBACK,
      scopes: ['openid', 'profile', 'email'],
      usePKCE: true,
    },
    { authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth' },
  );

  useEffect(() => {
    void (async () => {
      const accessToken = await getStoredAccessToken();
      if (!accessToken) return;
      router.replace('/');
    })();
  }, [router]);

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const code = googleResponse.params.code;
    const codeVerifier = googleRequest?.codeVerifier;
    if (!code || !codeVerifier) {
      setErrorMessage('Google 인증 코드가 유효하지 않습니다.');
      return;
    }
    void exchangeAndVerify({
      authPath: GOOGLE_AUTH_PATH,
      apiOrigin,
      code,
      codeVerifier,
      redirectUri: googleRedirectUri,
      onBusyChange: setIsBusy,
      onErrorChange: setErrorMessage,
      onSuccess: () => router.replace('/'),
    });
  }, [apiOrigin, googleRedirectUri, googleRequest?.codeVerifier, googleResponse, router]);

  useEffect(() => {
    if (githubResponse?.type !== 'success') return;
    const code = githubResponse.params.code;
    const codeVerifier = githubRequest?.codeVerifier;
    if (!code || !codeVerifier) {
      setErrorMessage('GitHub 인증 코드가 유효하지 않습니다.');
      return;
    }
    void exchangeAndVerify({
      authPath: GITHUB_AUTH_PATH,
      apiOrigin,
      code,
      codeVerifier,
      redirectUri: githubRedirectUri,
      onBusyChange: setIsBusy,
      onErrorChange: setErrorMessage,
      onSuccess: () => router.replace('/'),
    });
  }, [apiOrigin, githubRedirectUri, githubRequest?.codeVerifier, githubResponse, router]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Plan My Route
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            로그인 후 Home에서 내 라우트와 플랜을 확인하세요.
          </ThemedText>

          <Pressable
            onPress={() => {
              setErrorMessage(null);
              void promptGoogleAsync();
            }}
            disabled={!googleRequest || isBusy || !isGoogleOauthConfigValid || !apiOrigin}
            style={({ pressed }) => [
              styles.oauthButton,
              isDark ? styles.oauthButtonDark : styles.oauthButtonLight,
              pressed && styles.pressed,
              (!googleRequest || isBusy || !isGoogleOauthConfigValid || !apiOrigin) &&
                styles.buttonDisabled,
            ]}>
            <Image
              source={{ uri: GOOGLE_ICON_URI }}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={isDark ? styles.oauthLabelDark : styles.oauthLabelLight}>
              {isBusy ? '처리 중...' : 'Google로 로그인'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setErrorMessage(null);
              void promptGithubAsync();
            }}
            disabled={!githubRequest || isBusy || !isGithubOauthConfigValid || !apiOrigin}
            style={({ pressed }) => [
              styles.oauthButton,
              isDark ? styles.oauthButtonDark : styles.oauthButtonLight,
              pressed && styles.pressed,
              (!githubRequest || isBusy || !isGithubOauthConfigValid || !apiOrigin) &&
                styles.buttonDisabled,
            ]}>
            <Image
              source={{ uri: isDark ? GITHUB_ICON_URI_DARK : GITHUB_ICON_URI_LIGHT }}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={isDark ? styles.oauthLabelDark : styles.oauthLabelLight}>
              {isBusy ? '처리 중...' : 'GitHub로 로그인'}
            </Text>
          </Pressable>

          {errorMessage ? (
            <ThemedText type="small" style={styles.errorText}>
              {errorMessage}
            </ThemedText>
          ) : null}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const exchangeAndVerify = async ({
  authPath,
  apiOrigin,
  code,
  codeVerifier,
  redirectUri,
  onBusyChange,
  onErrorChange,
  onSuccess,
}: {
  authPath: '/api/mobile/auth/github' | '/api/mobile/auth/google';
  apiOrigin: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  onBusyChange: (next: boolean) => void;
  onErrorChange: (next: string | null) => void;
  onSuccess: () => void;
}) => {
  if (!apiOrigin) {
    onErrorChange('EXPO_PUBLIC_PLAN_MY_ROUTE_ORIGIN 이 필요합니다.');
    return;
  }

  onBusyChange(true);
  onErrorChange(null);

  try {
    const authResponse = await fetch(`${apiOrigin}${authPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, codeVerifier, redirectUri }),
    });
    if (!authResponse.ok) {
      throw new Error(`인증에 실패했습니다. (${authResponse.status})`);
    }

    const authJson = (await authResponse.json()) as MobileAuthResponse;
    if (!authJson.accessToken) throw new Error('토큰이 응답에 없습니다.');

    await setStoredAccessToken(authJson.accessToken);
    await fetchRoutes(apiOrigin, authJson.accessToken);
    onSuccess();
  } catch (error: unknown) {
    onErrorChange(error instanceof Error ? error.message : '로그인에 실패했습니다.');
  } finally {
    onBusyChange(false);
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  oauthButton: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  oauthButtonLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DADCE0',
  },
  oauthButtonDark: {
    backgroundColor: '#000000',
    borderColor: '#3E3E3E',
  },
  oauthLabelLight: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '600',
  },
  oauthLabelDark: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  logo: {
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  pressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: '#D64545',
    textAlign: 'center',
  },
});
