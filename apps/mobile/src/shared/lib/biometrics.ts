import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { tr } from '@/shared/lib/i18n';

export interface BiometricCapability {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  biometryType: 'face' | 'fingerprint' | 'iris' | 'none';
  biometryName: string;
}

/**
 * Checks biometric capabilities (Face ID, Touch ID, Fingerprint) on the device.
 */
export async function checkBiometricCapability(): Promise<BiometricCapability> {
  if (Platform.OS === 'web') {
    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      biometryType: 'none',
      biometryName: tr('Biometrics|name'),
    };
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometryType: BiometricCapability['biometryType'] = 'none';
    let biometryName = tr('Biometrics|name');

    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometryType = 'face';
      biometryName = 'Face ID';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometryType = 'fingerprint';
      biometryName = tr('Fingerprint');
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometryType = 'iris';
      biometryName = tr('Iris scan');
    }

    return {
      isAvailable: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      biometryType,
      biometryName,
    };
  } catch {
    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      biometryType: 'none',
      biometryName: tr('Biometrics|name'),
    };
  }
}

/**
 * Triggers native Face ID / Touch ID / Fingerprint prompt.
 */
export async function authenticateWithBiometrics(
  promptMessage = tr('Log in to Eternal'),
): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: tr('Use password'),
      cancelLabel: tr('Cancel'),
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
