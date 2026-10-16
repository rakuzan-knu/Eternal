import { Client, types } from 'cassandra-driver';

export function createTelemetryClient(config: {
  bundlePath: string;
  token: string;
  keyspace: string;
}): Client {
  if (!/^[a-z][a-z0-9_]{0,47}$/.test(config.keyspace)) {
    throw new Error('CASSANDRA_KEYSPACE must be a lowercase CQL identifier');
  }
  return new Client({
    cloud: { secureConnectBundle: config.bundlePath },
    credentials: { username: 'token', password: config.token },
    keyspace: config.keyspace,
    queryOptions: {
      prepare: true,
      consistency: types.consistencies.localQuorum,
      isIdempotent: true,
      readTimeout: 5000,
    },
    pooling: { coreConnectionsPerHost: { [types.distance.local]: 1 } },
    socketOptions: { connectTimeout: 5000 },
  });
}

export const TELEMETRY_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS call_telemetry_by_user (
    user_id text, created_at timestamp, id text, call_id text, payload text,
    PRIMARY KEY ((user_id), created_at, id)
  ) WITH CLUSTERING ORDER BY (created_at DESC, id DESC)`,
  `CREATE TABLE IF NOT EXISTS call_telemetry_by_call (
    call_id text, user_id text, created_at timestamp, id text,
    PRIMARY KEY ((call_id), user_id, created_at, id)
  )`,
];
