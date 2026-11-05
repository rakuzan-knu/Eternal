# Supabase database trust anchor

`supabase-root-2021.crt` is a public CA certificate, not a private key or a credential.
Source: [Supabase certificate download](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt),
linked by the [Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).

Verified SHA-256 fingerprint:
`80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`.
The certificate expires on 26 April 2031. Check provider rotation notices and the
certificate presented by the configured database before replacing this file.

The production Docker image includes it at `/app/certs/supabase-root-2021.crt`.
Copying the certificate alone does not enable TLS. For the current `pg` runtime,
set `PGSSLMODE=verify-full` and
`NODE_EXTRA_CA_CERTS=/app/certs/supabase-root-2021.crt` before process startup.
Keep `DATABASE_URL` free of conflicting SSL parameters: URL SSL parameters can
override driver settings. Do not use `NODE_TLS_REJECT_UNAUTHORIZED=0` or disable
certificate verification.

The Prisma migration engine uses separate TLS settings. For this project's
locked Prisma 7.10.0, the verified `DIRECT_URL` parameters are
`sslmode=require&sslcert=/app/certs/supabase-root-2021.crt&sslaccept=strict`.
`sslcert` here is Prisma's server trust certificate parameter, not a client
certificate. Do not copy that URL into `DATABASE_URL`, where `pg` interprets
`sslcert` differently. A read-only `prisma migrate status` succeeded with this CA
and rejected an unrelated CA; the `pg` runtime likewise accepted only the
correct CA. Repeat these checks when upgrading either driver.

These settings are specific to the existing Supabase deployment. Local
disposable databases and other providers need their own verified configuration.
Deploy the image containing this file together with the environment change;
rolling back to an image without the certificate requires a compatible rollback
image or another verified, readable CA location.
