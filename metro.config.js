const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("wasm");

// PowerSync's web SDK ships a dedicated build behind the "react-native-web"
// export condition, which Expo's default Metro config does not enable.
config.resolver.unstable_conditionsByPlatform.web.push("react-native-web");

module.exports = config;
