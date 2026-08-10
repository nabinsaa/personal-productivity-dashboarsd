export interface MediaPermissionStatus {
  camera: PermissionState | 'unknown' | 'not-supported';
  microphone: PermissionState | 'unknown' | 'not-supported';
  hasCameraDevice: boolean;
  hasMicDevice: boolean;
  isIframeRestricted: boolean;
  canPrompt: boolean;
  error?: string;
}

export interface SafeMediaStreamResult {
  stream: MediaStream | null;
  granted: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  error: string | null;
  isFallbackAudio: boolean;
}

/**
  Checks browser camera and microphone permissions and device availability
  before rendering or invoking media-heavy components.
 */
export async function checkMediaPermissions(): Promise<MediaPermissionStatus> {
  const result: MediaPermissionStatus = {
    camera: 'unknown',
    microphone: 'unknown',
    hasCameraDevice: false,
    hasMicDevice: false,
    isIframeRestricted: window.self !== window.top,
    canPrompt: true,
  };

  if (!navigator.mediaDevices) {
    result.camera = 'not-supported';
    result.microphone = 'not-supported';
    result.error = 'MediaDevices API is not supported in this browser environment.';
    return result;
  }

  // Check available hardware devices
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    result.hasCameraDevice = devices.some((d) => d.kind === 'videoinput');
    result.hasMicDevice = devices.some((d) => d.kind === 'audioinput');
  } catch (e) {
    console.warn('Unable to enumerate media devices:', e);
  }

  // Query API Permissions if supported
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const cameraPerm = await navigator.permissions.query({ name: 'camera' as any });
      result.camera = cameraPerm.state;
    } catch {
      // Permission query for camera not supported in this browser
    }

    try {
      const micPerm = await navigator.permissions.query({ name: 'microphone' as any });
      result.microphone = micPerm.state;
    } catch {
      // Permission query for microphone not supported
    }
  }

  return result;
}

/**
  Safely requests camera and/or microphone access, gracefully falling back
  to audio-only or returning descriptive error states without throwing exceptions.
 */
export async function requestMediaStreamSafely(options: {
  video?: boolean;
  audio?: boolean;
}): Promise<SafeMediaStreamResult> {
  const wantVideo = options.video ?? true;
  const wantAudio = options.audio ?? true;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      stream: null,
      granted: false,
      hasVideo: false,
      hasAudio: false,
      error: 'Media recording is not supported in this browser.',
      isFallbackAudio: false,
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: wantVideo,
      audio: wantAudio,
    });

    return {
      stream,
      granted: true,
      hasVideo: stream.getVideoTracks().length > 0,
      hasAudio: stream.getAudioTracks().length > 0,
      error: null,
      isFallbackAudio: false,
    };
  } catch (err: any) {
    console.warn('Primary media stream access failed:', err?.name || err);

    // If video + audio failed, try falling back to audio-only if video was requested
    if (wantVideo && wantAudio) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });

        return {
          stream: audioStream,
          granted: true,
          hasVideo: false,
          hasAudio: audioStream.getAudioTracks().length > 0,
          error: 'Camera permission denied or unavailable. Audio stream connected.',
          isFallbackAudio: true,
        };
      } catch (audioErr: any) {
        console.warn('Audio fallback stream access failed:', audioErr?.name || audioErr);
      }
    }

    let userFriendlyError = 'Camera and microphone access unavailable.';
    if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
      userFriendlyError = 'Permission denied by user or restricted by iframe policy.';
    } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
      userFriendlyError = 'No camera or microphone hardware found on this device.';
    } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
      userFriendlyError = 'Hardware device is currently in use by another application.';
    }

    return {
      stream: null,
      granted: false,
      hasVideo: false,
      hasAudio: false,
      error: userFriendlyError,
      isFallbackAudio: false,
    };
  }
}

/**
  Checks if display capture (Screen Sharing) is supported in current frame.
 */
export function checkScreenShareSupport(): { supported: boolean; reason?: string } {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    return {
      supported: false,
      reason: 'Screen sharing is not supported by this browser.',
    };
  }

  if (window.self !== window.top) {
    return {
      supported: true, // Supported but may require popup/new tab if permissions policy restricts display-capture
      reason: 'Embedded frame detected. Native display capture may require opening in a new tab.',
    };
  }

  return { supported: true };
}
