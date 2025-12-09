/**
 * Device Fingerprinting Utility
 * Generates a unique fingerprint for the current device/browser
 * This helps identify if a user is logging in from a new device
 */

export interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
}

/**
 * Generate a device fingerprint based on browser characteristics
 * This creates a unique identifier for the device/browser combination
 */
export const generateDeviceFingerprint = (): DeviceFingerprint => {
  return {
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack || null,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    deviceMemory: (navigator as any).deviceMemory || null,
  };
};

/**
 * Generate a hash from the device fingerprint
 * This creates a consistent identifier that can be stored and compared
 */
export const hashDeviceFingerprint = (fingerprint: DeviceFingerprint): string => {
  // Create a string representation of the fingerprint
  const fingerprintString = JSON.stringify({
    userAgent: fingerprint.userAgent,
    screenResolution: fingerprint.screenResolution,
    timezone: fingerprint.timezone,
    language: fingerprint.language,
    platform: fingerprint.platform,
    cookieEnabled: fingerprint.cookieEnabled,
    doNotTrack: fingerprint.doNotTrack,
    hardwareConcurrency: fingerprint.hardwareConcurrency,
    deviceMemory: fingerprint.deviceMemory,
  });

  // Simple hash function (consistent across sessions)
  let hash = 0;
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Get or create a device ID stored in localStorage
 * This provides a persistent identifier for the device
 */
export const getDeviceId = (): string => {
  const storageKey = 'device_id';
  let deviceId = localStorage.getItem(storageKey);
  
  if (!deviceId) {
    // Generate a new device ID
    deviceId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(storageKey, deviceId);
  }
  
  return deviceId;
};

/**
 * Get the complete device identifier
 * Combines device fingerprint hash with a persistent device ID
 */
export const getDeviceIdentifier = (): { 
  fingerprint: DeviceFingerprint; 
  fingerprintHash: string; 
  deviceId: string 
} => {
  const fingerprint = generateDeviceFingerprint();
  const fingerprintHash = hashDeviceFingerprint(fingerprint);
  const deviceId = getDeviceId();
  
  return {
    fingerprint,
    fingerprintHash,
    deviceId,
  };
};

