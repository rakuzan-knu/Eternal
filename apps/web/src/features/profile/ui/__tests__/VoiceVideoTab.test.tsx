import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import VoiceVideoTab from '../voice/VoiceVideoTab';
import { useVoiceVideoSettingsStore } from '@/features/chat/model/useVoiceVideoSettingsStore';

// Mock MockMediaStreamTrack
class MockTrack {
  kind: string;
  enabled = true;
  constructor(kind = 'audio') {
    this.kind = kind;
  }
  stop = vi.fn();
  getSettings = vi.fn().mockReturnValue({ frameRate: 30 });
}

// Mock MediaStream
class MockMediaStream {
  tracks: MockTrack[] = [];
  constructor(tracks?: MockTrack[]) {
    this.tracks = tracks || [new MockTrack('audio')];
  }
  getTracks() {
    return this.tracks;
  }
  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === 'audio');
  }
  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video');
  }
}

// Mock Web Audio
class MockAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockGainNode extends MockAudioNode {
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
}

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  createMediaStreamSource = vi.fn().mockReturnValue(new MockAudioNode());
  createGain = vi.fn().mockReturnValue(new MockGainNode());
  createAnalyser = vi.fn().mockReturnValue({
    ...new MockAudioNode(),
    fftSize: 128,
    smoothingTimeConstant: 0.35,
    frequencyBinCount: 64,
    getByteFrequencyData: vi.fn(),
  });
  createMediaStreamDestination = vi.fn().mockReturnValue({
    stream: new MockMediaStream(),
  });
  createBiquadFilter = vi.fn().mockReturnValue({
    ...new MockAudioNode(),
    type: 'highpass',
    frequency: { setValueAtTime: vi.fn() },
  });
  createDynamicsCompressor = vi.fn().mockReturnValue({
    ...new MockAudioNode(),
    threshold: { setValueAtTime: vi.fn() },
    knee: { setValueAtTime: vi.fn() },
    ratio: { setValueAtTime: vi.fn() },
    attack: { setValueAtTime: vi.fn() },
    release: { setValueAtTime: vi.fn() },
  });
  close = vi.fn().mockResolvedValue(undefined);
  resume = vi.fn().mockResolvedValue(undefined);
}

describe('VoiceVideoTab', () => {
  const originalAudioContext = window.AudioContext;
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    // Reset store state to default
    useVoiceVideoSettingsStore.setState({
      selectedAudioInput: '',
      selectedAudioOutput: '',
      selectedVideoInput: '',
      inputVolume: 100,
      outputVolume: 100,
      inputProfile: 'isolation',
      autoSensitivity: true,
      sensitivityThreshold: -45,
      noiseSuppression: 'krisp',
      echoCancellation: true,
      autoGainControl: true,
      isPTTEnabled: false,
      pttKey: 'KeyV',
      pttKeyLabel: 'V',
      pttReleaseTailMs: 200,
      isPTTSoundEnabled: true,
      isPTTActive: false,
      isHearSelfEnabled: false,
      isMirrorVideo: true,
      virtualBackground: 'none',
      customBackgroundUrl: null,
      customBackgrounds: [],
      alwaysPreviewVideo: false,
      showAdvancedVoice: false,
      disableAudioProcessing: false,
      reverbSuppression: true,
      duckingEnabled: false,
      duckingStrength: 75,
      spatialAudio: false,
    });

    // Setup mocks
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('webkitAudioContext', MockAudioContext);

    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        enumerateDevices: vi.fn().mockResolvedValue([
          { deviceId: 'mic-1', kind: 'audioinput', label: 'Built-in Microphone' },
          { deviceId: 'speaker-1', kind: 'audiooutput', label: 'MacBook Pro Speakers' },
          { deviceId: 'cam-1', kind: 'videoinput', label: 'FaceTime HD Camera' },
        ]),
        getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream([new MockTrack('audio')])),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.AudioContext = originalAudioContext;
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: originalMediaDevices,
    });
  });

  it('renders all main sections properly in English', async () => {
    render(<VoiceVideoTab />);

    // Block 1: Voice (Microphone, Speaker, Volume, Test)
    expect(screen.getByText('Voice')).toBeInTheDocument();
    expect(screen.getByText('Microphone')).toBeInTheDocument();
    expect(screen.getByText('Speaker')).toBeInTheDocument();
    expect(screen.getByText('Microphone Volume')).toBeInTheDocument();
    expect(screen.getByText('Speaker Volume')).toBeInTheDocument();
    expect(screen.getAllByText('Test Mic').length).toBeGreaterThan(0);

    // Block 2: Input Profile
    expect(screen.getByText('Input Profile')).toBeInTheDocument();
    expect(screen.getByText('Voice Isolation')).toBeInTheDocument();
    expect(screen.getByText('Studio')).toBeInTheDocument();
    expect(screen.getAllByText('Custom').length).toBeGreaterThan(0);

    // Default profile is 'isolation' -> shows Push to Talk but NOT sensitivity/noise suppression
    expect(screen.getByText('Push to Talk')).toBeInTheDocument();
    expect(screen.queryByText('Automatically determine input sensitivity')).not.toBeInTheDocument();

    // Block 3: Video
    expect(screen.getByText('Video')).toBeInTheDocument();
    expect(screen.getByText('Camera')).toBeInTheDocument();
    expect(screen.getByText('Mirror Video Preview')).toBeInTheDocument();
    expect(screen.getByText('Virtual Background')).toBeInTheDocument();

    // Accordion: Advanced voice settings
    expect(screen.getByText('Show Advanced Voice Settings')).toBeInTheDocument();
  });

  it('handles profile conditional visibility and mutual locking correctly', async () => {
    render(<VoiceVideoTab />);

    // Switch to 'custom' profile
    const customOption = screen.getAllByText('Custom')[0];
    fireEvent.click(customOption);

    expect(useVoiceVideoSettingsStore.getState().inputProfile).toBe('custom');
    // In 'custom' mode, sensitivity, noise suppression, and echo cancellation become visible
    expect(screen.getByText('Automatically determine input sensitivity')).toBeInTheDocument();
    expect(screen.getByText('Noise Suppression')).toBeInTheDocument();
    expect(screen.getByText('Echo Cancellation')).toBeInTheDocument();
    expect(screen.getByText('Push to Talk')).toBeInTheDocument();

    // Switch to 'studio' profile
    const studioOption = screen.getByText('Studio');
    fireEvent.click(studioOption);

    expect(useVoiceVideoSettingsStore.getState().inputProfile).toBe('studio');
    // In 'studio' mode, nothing is shown below except the advanced accordion
    expect(screen.queryByText('Automatically determine input sensitivity')).not.toBeInTheDocument();
    expect(screen.queryByText('Noise Suppression')).not.toBeInTheDocument();
    expect(screen.queryByText('Echo Cancellation')).not.toBeInTheDocument();
    expect(screen.queryByText('Push to Talk')).not.toBeInTheDocument();
    expect(screen.getByText('Show Advanced Voice Settings')).toBeInTheDocument();
  });

  it('toggles microphone test on and off cleanly without throwing', async () => {
    render(<VoiceVideoTab />);

    const testBtn = screen.getByRole('button', { name: /Test Mic/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(screen.getByText('Stop Test')).toBeInTheDocument();
    });

    // Clicking again stops the test
    fireEvent.click(screen.getByRole('button', { name: /Stop Test/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Test Mic/i })).toBeInTheDocument();
    });
  });

  it('toggles Push-to-Talk and records keybinding', async () => {
    render(<VoiceVideoTab />);

    // Enable PTT in store
    useVoiceVideoSettingsStore.getState().setIsPTTEnabled(true);

    // Re-render or update
    const recordBtn = await screen.findByText('Set Key');
    fireEvent.click(recordBtn);

    expect(screen.getByText('Press a key...')).toBeInTheDocument();

    // Simulate keydown
    fireEvent.keyDown(window, { code: 'KeyT', key: 't' });

    expect(useVoiceVideoSettingsStore.getState().pttKey).toBe('KeyT');
    expect(screen.getByText('[ T ]')).toBeInTheDocument();
  });

  it('expands and collapses advanced voice options with new warning toggles', async () => {
    render(<VoiceVideoTab />);

    const advancedToggle = screen.getByText('Show Advanced Voice Settings');
    fireEvent.click(advancedToggle);

    expect(screen.getByText('Automatic Gain Control')).toBeInTheDocument();
    expect(screen.getByText('Room Reverb Suppression')).toBeInTheDocument();
    expect(screen.getByText('Disable System Audio Processing')).toBeInTheDocument();
    expect(screen.getByText('Attenuation / Ducking')).toBeInTheDocument();
    expect(screen.getByText('3D Spatial Audio')).toBeInTheDocument();
    expect(screen.getByText('No Audio Input Warning')).toBeInTheDocument();
    expect(screen.getByText('Muted Speaking Warning')).toBeInTheDocument();
  });

  it('renders mirror video switch alongside camera cleanly', async () => {
    render(<VoiceVideoTab />);

    expect(screen.getByText('Mirror Video Preview')).toBeInTheDocument();
  });
});
