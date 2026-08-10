export interface MediaPermissionCheckResult {
  camera: boolean;
  microphone: boolean;
  cameraError?: string;
  microphoneError?: string;
}

/**
 * Verifies browser permissions for camera and microphone using navigator.mediaDevices.getUserMedia.
 * Safe to call before mounting media-dependent UI components.
 */
export async function verifyMediaPermissions(options?: {
  checkCamera?: boolean;
  checkMicrophone?: boolean;
}): Promise<MediaPermissionCheckResult> {
  const checkCamera = options?.checkCamera ?? true;
  const checkMicrophone = options?.checkMicrophone ?? true;

  const result: MediaPermissionCheckResult = {
    camera: false,
    microphone: false,
  };

  if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    result.cameraError = 'MediaDevices API is not supported in this environment.';
    result.microphoneError = 'MediaDevices API is not supported in this environment.';
    return result;
  }

  // Check Camera
  if (checkCamera) {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      result.camera = true;
      // Immediately release camera track after verification
      videoStream.getTracks().forEach((track) => track.stop());
    } catch (err: any) {
      result.camera = false;
      result.cameraError = err?.message || err?.name || 'Camera permission denied or unavailable';
    }
  }

  // Check Microphone
  if (checkMicrophone) {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      result.microphone = true;
      // Immediately release microphone track after verification
      audioStream.getTracks().forEach((track) => track.stop());
    } catch (err: any) {
      result.microphone = false;
      result.microphoneError = err?.message || err?.name || 'Microphone permission denied or unavailable';
    }
  }

  return result;
}

/**
 * Helper to check if both camera and microphone are granted.
 */
export async function isMediaAccessAvailable(): Promise<boolean> {
  const check = await verifyMediaPermissions({ checkCamera: true, checkMicrophone: true });
  return check.camera && check.microphone;
}
