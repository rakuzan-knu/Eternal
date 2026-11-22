CREATE TYPE "FamilyLinkStatus" AS ENUM ('PENDING_CONFIRMATION', 'ACTIVE', 'REVOKED');
CREATE TABLE "FamilyLink" (
 "id" TEXT NOT NULL PRIMARY KEY, "parentId" TEXT NOT NULL, "childId" TEXT NOT NULL,
 "status" "FamilyLinkStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 "confirmedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3) NOT NULL,
 FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CHECK ("parentId" <> "childId")
);
CREATE INDEX "FamilyLink_parentId_status_idx" ON "FamilyLink"("parentId", "status");
CREATE INDEX "FamilyLink_childId_status_createdAt_idx" ON "FamilyLink"("childId", "status", "createdAt");
CREATE UNIQUE INDEX "FamilyLink_active_pair_key" ON "FamilyLink"("parentId", "childId") WHERE "status" = 'ACTIVE';
CREATE TABLE "FamilyInvite" (
 "id" TEXT NOT NULL PRIMARY KEY, "childId" TEXT NOT NULL,
 "codeHash" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3),
 FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FamilyInvite_codeHash_key" ON "FamilyInvite"("codeHash");
CREATE UNIQUE INDEX "FamilyInvite_tokenHash_key" ON "FamilyInvite"("tokenHash");
CREATE INDEX "FamilyInvite_childId_idx" ON "FamilyInvite"("childId");
CREATE TABLE "FamilySafeguard" (
 "childId" TEXT NOT NULL PRIMARY KEY, "dailyLimitMinutes" INTEGER NOT NULL DEFAULT 120,
 "curfewStart" TEXT, "curfewEnd" TEXT, "timezone" TEXT NOT NULL DEFAULT 'UTC',
 "restrictedDirectMessages" BOOLEAN NOT NULL DEFAULT true, "monthlyBudget" DOUBLE PRECISION NOT NULL DEFAULT 100,
 "spentThisMonth" DOUBLE PRECISION NOT NULL DEFAULT 0, "requirePurchaseApproval" BOOLEAN NOT NULL DEFAULT true,
 "profileSettingsLocked" BOOLEAN NOT NULL DEFAULT true, "updatedByParentId" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL,
 FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY ("updatedByParentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 CHECK ("dailyLimitMinutes" BETWEEN 0 AND 1440), CHECK ("monthlyBudget" >= 0), CHECK ("spentThisMonth" >= 0)
);
CREATE TABLE "FamilySettings" (
 "userId" TEXT NOT NULL PRIMARY KEY, "weeklyDigest" BOOLEAN NOT NULL DEFAULT true,
 "newFriendAlerts" BOOLEAN NOT NULL DEFAULT true, "reportAlerts" BOOLEAN NOT NULL DEFAULT true,
 "notifyLinkRequests" BOOLEAN NOT NULL DEFAULT true, "pinEnabled" BOOLEAN NOT NULL DEFAULT false, "pinHash" TEXT,
 FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "FamilyScreenUsage" (
 "userId" TEXT NOT NULL, "utcDate" TEXT NOT NULL, "minutes" INTEGER NOT NULL DEFAULT 0, "lastMinute" TEXT NOT NULL,
 PRIMARY KEY ("userId", "utcDate"),
 FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "FamilyPairAttempts" (
 "userId" TEXT NOT NULL PRIMARY KEY, "attempts" INTEGER NOT NULL DEFAULT 0, "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
