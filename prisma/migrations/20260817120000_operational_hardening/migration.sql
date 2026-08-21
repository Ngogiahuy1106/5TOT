CREATE TABLE "SubmissionReviewRevision" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "reviewId" TEXT,
  "status" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "flags" JSONB NOT NULL,
  "reviewer" TEXT NOT NULL DEFAULT 'shared-admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubmissionReviewRevision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SubmissionReviewRevision_submissionId_createdAt_idx" ON "SubmissionReviewRevision"("submissionId","createdAt");
CREATE INDEX "SubmissionReviewRevision_reviewId_idx" ON "SubmissionReviewRevision"("reviewId");
ALTER TABLE "SubmissionReviewRevision" ADD CONSTRAINT "SubmissionReviewRevision_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "SubmissionReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubmissionReviewRevision" ADD CONSTRAINT "SubmissionReviewRevision_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Chuẩn hóa dữ liệu cũ để invariant mới đúng ngay sau deploy.
UPDATE "SubmissionReview"
SET "status"='Cần bổ sung', "updatedAt"=CURRENT_TIMESTAMP
WHERE "status"='Đã duyệt' AND "flags" <> '{}'::jsonb;

INSERT INTO "SubmissionReviewRevision" ("id","submissionId","reviewId","status","note","flags","reviewer","createdAt")
SELECT 'revision_migration_' || "id", "submissionId", "id", "status", "note", "flags", 'migration', COALESCE("checkedAt","updatedAt")
FROM "SubmissionReview";

CREATE TABLE "AdminSession" (
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("tokenHash")
);
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

CREATE TABLE "ApiRateLimit" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiRateLimit_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "ApiRateLimit_resetAt_idx" ON "ApiRateLimit"("resetAt");

CREATE TABLE "StorageCleanupJob" (
  "path" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StorageCleanupJob_pkey" PRIMARY KEY ("path")
);
CREATE INDEX "StorageCleanupJob_nextAttemptAt_idx" ON "StorageCleanupJob"("nextAttemptAt");
