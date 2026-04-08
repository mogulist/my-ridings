import { KakaoMapView } from '@react-native-kakao/map';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const INITIAL_CAMERA = {
  lat: 37.5665,
  lng: 126.978,
  zoomLevel: 15,
};

export default function MapScreen() {
  return (
    <View style={styles.root}>
      <KakaoMapView style={styles.map} camera={INITIAL_CAMERA} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
