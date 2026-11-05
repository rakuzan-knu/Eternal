import { youtubeTransactionSchema } from '../shared/youtubeOAuth';

export function parseYouTubeDeepLink(value: string): { transaction: string; code: string } | null {
  try {
    if (value.length > 512 || /[\\\s]/.test(value)) return null;
    const url = new URL(value);
    if (
      url.protocol !== 'eternal:' ||
      url.hostname !== 'oauth' ||
      url.pathname !== '/youtube' ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      [...url.searchParams.keys()].sort().join(',') !== 'code,transaction'
    )
      return null;
    const transaction = youtubeTransactionSchema.safeParse(url.searchParams.get('transaction'));
    const code = youtubeTransactionSchema.safeParse(url.searchParams.get('code'));
    return transaction.success && code.success
      ? { transaction: transaction.data, code: code.data }
      : null;
  } catch {
    return null;
  }
}

export function createYouTubeOAuth(
  origin: string,
  serviceOrigin: string,
  open: (url: string) => Promise<void>,
) {
  let pending: { transaction: string; finish: (code: string | null) => void } | undefined;
  const cancel = (transaction?: string) => {
    if (!transaction || pending?.transaction === transaction) pending?.finish(null);
  };
  return {
    async connect(value: string, transaction: string): Promise<string | null> {
      youtubeTransactionSchema.parse(transaction);
      const url = new URL(value);
      const params = new URLSearchParams(url.hash.slice(1));
      if (
        url.origin !== serviceOrigin ||
        url.pathname !== '/v1/integrations/youtube/desktop/launch' ||
        url.username ||
        url.password ||
        url.search ||
        params.get('origin') !== origin ||
        [...params.keys()].sort().join(',') !== 'origin,proof,ticket' ||
        !youtubeTransactionSchema.safeParse(params.get('ticket')).success ||
        !youtubeTransactionSchema.safeParse(params.get('proof')).success
      )
        throw new Error('Invalid YouTube OAuth launch');
      cancel();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => finish(null), 600000);
        const finish = (code: string | null) => {
          clearTimeout(timer);
          pending = undefined;
          resolve(code);
        };
        pending = { transaction, finish };
        void open(url.href).catch(() => {
          if (pending?.finish === finish) {
            clearTimeout(timer);
            pending = undefined;
            reject(new Error('Could not open the system browser'));
          }
        });
      });
    },
    receive(value: string): boolean {
      const result = parseYouTubeDeepLink(value);
      if (!result || pending?.transaction !== result.transaction) return false;
      pending.finish(result.code);
      return true;
    },
    cancel,
  };
}
