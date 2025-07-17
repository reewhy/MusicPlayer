import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.reewhy.goonplayer',
  appName: 'GoonPlayer',
  webDir: 'dist',
  "server": {
    "url": "http://192.168.1.104:8100",
    "cleartext": true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    plugins: {
      CapacitorSQLite: {
        iosDatabaseLocation: 'Library/CapacitorDatabase',
        iosIsEncryption: true,
        iosKeychainPrefix: 'angular-sqlite-app-starter',
        iosBiometric: {
          biometricAuth: false,
          biometricTitle : "Biometric login for capacitor sqlite"
        },
        androidIsEncryption: true,
        androidBiometric: {
          biometricAuth : false,
          biometricTitle : "Biometric login for capacitor sqlite",
          biometricSubTitle : "Log in using your biometric"
        },
        electronIsEncryption: true,
        electronWindowsLocation: "C:\\ProgramData\\CapacitorDatabases",
        electronMacLocation: "/Volumes/Development_Lacie/Development/Databases",
        electronLinuxLocation: "Databases"
      }
    }
  }
};

export default config;
