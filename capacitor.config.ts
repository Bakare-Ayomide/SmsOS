const config = {
  appId: "com.smsgateway.saas.client",
  appName: "Android Cellular SMS Gateway",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: true,
    allowNavigation: [
      "*"
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0f172a",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#6366f1"
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#4f46e5",
      sound: "beep.wav"
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true
  }
};

export default config;
