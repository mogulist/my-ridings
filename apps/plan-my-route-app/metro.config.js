const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const planGeometryRoot = path.resolve(workspaceRoot, 'packages/plan-geometry');

/** @see https://docs.expo.dev/guides/monorepos/ — SDK 52+는 모노레포용 Metro를 자동 구성한다. 수동 watchFolders/nodeModulesPaths 덮어쓰기는 해석 실패를 유발할 수 있어 두지 않는다. */
const config = getDefaultConfig(projectRoot);

config.resolver.extraNodeModules = {
	...(config.resolver.extraNodeModules ?? {}),
	'@my-ridings/plan-geometry': planGeometryRoot,
};

module.exports = config;
