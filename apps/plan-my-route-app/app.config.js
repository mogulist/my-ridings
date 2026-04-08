const appJson = require('./app.json');

const naverMapClientId = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID || '';

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
    ],
  },
});
