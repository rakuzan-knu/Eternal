# Runbook: Secret & Credential Rotation

## 1. Overview

Procedures for rotating secrets without causing service interruption or mass customer session invalidations.

---

## 2. JWT Access & Refresh Secret Rotation

To rotate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` gracefully:

### Phase 1: Dual Verification (Key Rollover)

1. Generate new secrets:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update backend configuration with new primary key while supporting legacy key verification for existing active tokens during the 15-minute access TTL window.

### Phase 2: Complete Rotation

1. Update `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in `.env` / production secrets store.
2. Trigger rolling restart of backend instances:
   ```bash
   docker-compose -f docker-compose.prod.yml restart backend
   ```
3. Existing valid refresh tokens in Redis / Database allow clients to seamlessly refresh without re-entering credentials.

---

## 3. PostgreSQL Database Password Rotation

1. Create temporary database user with identical permissions:
   ```sql
   CREATE USER social_next WITH PASSWORD 'new_strong_password';
   GRANT ALL PRIVILEGES ON DATABASE social TO social_next;
   ```
2. Update backend `DATABASE_URL` and `DIRECT_URL` to `social_next`.
3. Restart backend service.
4. Once verified, update original user password and drop temporary user.

---

## 4. Redis Credential Rotation

1. Update `requirepass` in `redis.conf` with new password using Redis ACLs or dual-auth.
2. Update `REDIS_URL` in backend environment:
   ```env
   REDIS_URL="redis://:new_redis_password@redis:6379"
   ```
3. Restart backend service.

---

## 5. S3 / MinIO Storage Key Rotation

1. Create new Access Key / Secret Key pair in MinIO / AWS IAM.
2. Update `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` in environment.
3. Restart backend service.
4. Revoke and delete old S3 access key after 24 hours of zero access logs.
