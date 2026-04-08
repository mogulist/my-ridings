const appJson = require('./app.json');

const naverMapClientId = (process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID || '').trim();

if (!naverMapClientId) {
  console.warn(
    '[plan-my-route-app] EXPO_PUBLIC_NAVER_MAP_CLIENT_ID가 비어 있습니다. 네이버 지도 타일이 로드되지 않을 수 있습니다. EAS/로컬 빌드 전에 .env 또는 Expo 대시보드 환경 변수로 Client ID를 설정하세요.',
  );
}

if (process.env.EAS_BUILD && !naverMapClientId) {
  throw new Error(
    'EAS 빌드에는 EXPO_PUBLIC_NAVER_MAP_CLIENT_ID가 필요합니다. Expo 프로젝트 환경 변수에 AI·NAVER Maps Client ID를 등록한 뒤 다시 빌드하세요.',
  );
}

module.exports = () => ({
  expo: {
    ...appJson.expo,
    plugins: [
      ...(appJson.expo.plugins ?? []),
      [
        '@mj-studio/react-native-naver-map',
        {
          client_id: naverMapClientId,
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            extraMavenRepos: ['https://repository.map.naver.com/archive/maven'],
          },
        },
      ],
    ],
  },
});
