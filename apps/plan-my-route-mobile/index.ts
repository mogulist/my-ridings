import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App).
// Development Build(expo-dev-client)에서 네이티브 모듈을 사용합니다.
registerRootComponent(App);
