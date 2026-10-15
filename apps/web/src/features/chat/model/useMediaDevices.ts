import { useState, useEffect, useCallback } from 'react';
import { useVoiceVideoSettingsStore } from './useVoiceVideoSettingsStore';

export interface DeviceLists {
  audioInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
}

export function useMediaDevices() {
  const [devices, setDevices] = useState<DeviceLists>({
    audioInputs: [],
    audioOutputs: [],
    videoInputs: [],
  });
  const [hasPermissions, setHasPermissions] = useState<boolean>(false);

  const selectedAudioInput = useVoiceVideoSettingsStore((s) => s.selectedAudioInput);
  const selectedAudioOutput = useVoiceVideoSettingsStore((s) => s.selectedAudioOutput);
  const selectedVideoInput = useVoiceVideoSettingsStore((s) => s.selectedVideoInput);
  const setSelectedAudioInput = useVoiceVideoSettingsStore((s) => s.setSelectedAudioInput);
  const setSelectedAudioOutput = useVoiceVideoSettingsStore((s) => s.setSelectedAudioOutput);
  const setSelectedVideoInput = useVoiceVideoSettingsStore((s) => s.setSelectedVideoInput);

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const rawDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = rawDevices.filter((d) => d.kind === 'audioinput');
      const audioOutputs = rawDevices.filter((d) => d.kind === 'audiooutput');
      const videoInputs = rawDevices.filter((d) => d.kind === 'videoinput');

      setDevices({ audioInputs, audioOutputs, videoInputs });

      const anyLabel = rawDevices.some((d) => Boolean(d.label));
      setHasPermissions(anyLabel);

      // Hardware Hotplug Disconnect Fallback:
      // If stored device disappeared, automatically fallback to default without errors
      if (selectedAudioInput && !audioInputs.some((d) => d.deviceId === selectedAudioInput)) {
        setSelectedAudioInput('');
      }
      if (selectedAudioOutput && !audioOutputs.some((d) => d.deviceId === selectedAudioOutput)) {
        setSelectedAudioOutput('');
      }
      if (selectedVideoInput && !videoInputs.some((d) => d.deviceId === selectedVideoInput)) {
        setSelectedVideoInput('');
      }
    } catch {
      // Non-blocking fallback
    }
  }, [
    selectedAudioInput,
    selectedAudioOutput,
    selectedVideoInput,
    setSelectedAudioInput,
    setSelectedAudioOutput,
    setSelectedVideoInput,
  ]);

  const requestPermissions = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((t) => t.stop());
      await refreshDevices();
      setHasPermissions(true);
      return true;
    } catch {
      // User may have denied or only allowed audio
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach((t) => t.stop());
        await refreshDevices();
        return true;
      } catch {
        return false;
      }
    }
  }, [refreshDevices]);

  useEffect(() => {
    void refreshDevices();

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      const handler = () => void refreshDevices();
      navigator.mediaDevices.addEventListener('devicechange', handler);
      return () => {
        navigator.mediaDevices?.removeEventListener?.('devicechange', handler);
      };
    }
  }, [refreshDevices]);

  return {
    ...devices,
    hasPermissions,
    refreshDevices,
    requestPermissions,
  };
}
