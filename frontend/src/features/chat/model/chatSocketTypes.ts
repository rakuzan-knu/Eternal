export interface AckResponse<T = unknown> {
  status: 'ok' | 'error';
  error?: string;
  message?: T;
  messages?: T[];
  deletedForAll?: boolean;
}
