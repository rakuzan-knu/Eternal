import type { NetInfoState } from '@react-native-community/netinfo';

export function isNetworkOnline(
  state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>,
  platform: string,
) {
  // Browser connectivity must not depend on a third-party HTTP probe passing CORS.
  return state.isConnected === true && (platform === 'web' || state.isInternetReachable !== false);
}
