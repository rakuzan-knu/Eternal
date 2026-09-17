import { describe, it, expect } from 'vitest';
import { parseVoiceCommand } from '../voiceCommandEngine';

describe('VoiceCommandEngine (parseVoiceCommand)', () => {
  it('recognizes microphone mute commands in Russian and English', () => {
    expect(parseVoiceCommand('пожалуйста заглушить микрофон')).toBe('MUTE');
    expect(parseVoiceCommand('выключить микрофон')).toBe('MUTE');
    expect(parseVoiceCommand('отключить микрофон')).toBe('MUTE');
    expect(parseVoiceCommand('mute microphone')).toBe('MUTE');
    expect(parseVoiceCommand('mute')).toBe('MUTE');
  });

  it('recognizes microphone unmute commands in Russian and English', () => {
    expect(parseVoiceCommand('включить микрофон')).toBe('UNMUTE');
    expect(parseVoiceCommand('разглушить микрофон')).toBe('UNMUTE');
    expect(parseVoiceCommand('unmute')).toBe('UNMUTE');
    expect(parseVoiceCommand('unmute microphone please')).toBe('UNMUTE');
  });

  it('recognizes video camera on/off commands', () => {
    expect(parseVoiceCommand('включить камеру')).toBe('VIDEO_ON');
    expect(parseVoiceCommand('запустить камеру')).toBe('VIDEO_ON');
    expect(parseVoiceCommand('turn on camera')).toBe('VIDEO_ON');

    expect(parseVoiceCommand('выключить камеру')).toBe('VIDEO_OFF');
    expect(parseVoiceCommand('остановить камеру')).toBe('VIDEO_OFF');
    expect(parseVoiceCommand('turn off camera')).toBe('VIDEO_OFF');
  });

  it('recognizes hand raising and chat actions', () => {
    expect(parseVoiceCommand('поднять руку')).toBe('RAISE_HAND');
    expect(parseVoiceCommand('опустить руку')).toBe('LOWER_HAND');
    expect(parseVoiceCommand('показать чат')).toBe('OPEN_CHAT');
    expect(parseVoiceCommand('open chat')).toBe('OPEN_CHAT');
  });

  it('recognizes end call phrases', () => {
    expect(parseVoiceCommand('завершить звонок')).toBe('END_CALL');
    expect(parseVoiceCommand('положить трубку')).toBe('END_CALL');
    expect(parseVoiceCommand('end call')).toBe('END_CALL');
  });

  it('returns null for unrelated speech', () => {
    expect(parseVoiceCommand('привет как дела')).toBeNull();
    expect(parseVoiceCommand('сегодня хорошая погода')).toBeNull();
  });
});
