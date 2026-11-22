// Expo SDK 52 autolinking can infer the namespace from the Android build file
// instead of using the package that contains ExpoModulesPackage.
module.exports = {
  dependencies: {
    expo: {
      platforms: {
        android: { packageImportPath: 'import expo.modules.ExpoModulesPackage;' },
      },
    },
  },
};
