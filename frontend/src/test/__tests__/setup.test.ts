import { describe, it, expect } from 'vitest';
import { io } from 'socket.io-client';

describe('test/setup environment shims and mocks', () => {
  it('shims Element.prototype.scrollIntoView', () => {
    const el = document.createElement('div');
    expect(typeof el.scrollIntoView).toBe('function');
    expect(() => el.scrollIntoView()).not.toThrow();
  });

  it('shims URL.createObjectURL and URL.revokeObjectURL', () => {
    const blob = new Blob(['sample text'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    expect(url).toBe('blob:mock-url');
    expect(() => URL.revokeObjectURL(url)).not.toThrow();
  });

  it('shims ResizeObserver class methods', () => {
    const observer = new ResizeObserver(() => {});
    const target = document.createElement('div');
    expect(() => observer.observe(target)).not.toThrow();
    expect(() => observer.unobserve(target)).not.toThrow();
    expect(() => observer.disconnect()).not.toThrow();
  });

  it('shims IntersectionObserver class methods', () => {
    const observer = new IntersectionObserver(() => {});
    const target = document.createElement('div');
    expect(() => observer.observe(target)).not.toThrow();
    expect(() => observer.unobserve(target)).not.toThrow();
    expect(observer.takeRecords()).toEqual([]);
    expect(() => observer.disconnect()).not.toThrow();
  });

  it('mocks socket.io-client factory and socket instances', () => {
    const socket = io('http://localhost:3000');
    expect(socket).toBeDefined();
    expect(socket.connected).toBe(true);
    expect(typeof socket.on).toBe('function');
    expect(typeof socket.emit).toBe('function');
    expect(typeof socket.connect).toBe('function');
    expect(typeof socket.disconnect).toBe('function');
  });
});
