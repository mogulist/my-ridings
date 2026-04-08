import { NaverMapView } from '@mj-studio/react-native-naver-map';
import { StyleSheet, View } from 'react-native';

const INITIAL_CAMERA = {
  latitude: 37.5665,
  longitude: 126.978,
  zoom: 14,
};

export default function MapScreen() {
  return (
    <View style={styles.root}>
      <NaverMapView style={styles.map} initialCamera={INITIAL_CAMERA} />
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
