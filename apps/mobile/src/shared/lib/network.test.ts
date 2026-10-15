import { expect, it } from 'vitest';
import { isNetworkOnline } from './network';

it('keeps a connected browser usable when an external reachability probe fails', () => {
  expect(isNetworkOnline({ isConnected: true, isInternetReachable: false }, 'web')).toBe(true);
});
it.each(['web', 'ios', 'android'])('respects an actual offline connection on %s', (platform) => {
  expect(isNetworkOnline({ isConnected: false, isInternetReachable: false }, platform)).toBe(false);
});
it.each(['ios', 'android'])('retains native internet reachability checks on %s', (platform) => {
  expect(isNetworkOnline({ isConnected: true, isInternetReachable: false }, platform)).toBe(false);
  expect(isNetworkOnline({ isConnected: true, isInternetReachable: true }, platform)).toBe(true);
  expect(isNetworkOnline({ isConnected: true, isInternetReachable: null }, platform)).toBe(true);
});
