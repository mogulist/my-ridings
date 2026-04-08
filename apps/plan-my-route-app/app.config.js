const appJson = require('./app.json');

/**
 * 카카오 네이티브 앱 키: `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY` (`.env` / EAS Secret / `eas.json` env).
 * 미설정 시 플레이스홀더로 플러그인만 통과하며, 실제 지도는 유효 키로 빌드해야 동작합니다.
 */
const kakaoNativeAppKey =
  process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY || 'REPLACE_WITH_KAKAO_NATIVE_APP_KEY';

module.exports = () => ({
  expo: {
    ...appJson.expo,
    plugins: [
      ...(appJson.expo.plugins ?? []),
      [
        'expo-build-properties',
        {
          android: {
            extraMavenRepos: ['https://devrepo.kakao.com/nexus/content/groups/public/'],
          },
        },
      ],
      [
        '@react-native-kakao/core',
        {
          nativeAppKey: kakaoNativeAppKey,
        },
      ],
    ],
  },
});
