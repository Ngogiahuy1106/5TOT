-- Gắn mỗi bản kiểm tra với đúng phiên bản hồ sơ sinh viên đã được xem.
ALTER TABLE "SubmissionReview"
  ADD COLUMN "reviewer" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "submissionUpdatedAt" TIMESTAMP(3);

UPDATE "SubmissionReview" review
SET "submissionUpdatedAt" = submission."updatedAt"
FROM "Submission" submission
WHERE submission."id" = review."submissionId";

ALTER TABLE "SubmissionReview"
  ALTER COLUMN "submissionUpdatedAt" SET NOT NULL;

ALTER TABLE "SubmissionReview"
  ALTER COLUMN "reviewer" DROP DEFAULT;

ALTER TABLE "SubmissionReviewRevision"
  ADD COLUMN "submissionUpdatedAt" TIMESTAMP(3);

UPDATE "SubmissionReviewRevision" revision
SET "submissionUpdatedAt" = submission."updatedAt"
FROM "Submission" submission
WHERE submission."id" = revision."submissionId";

ALTER TABLE "SubmissionReviewRevision"
  ALTER COLUMN "submissionUpdatedAt" SET NOT NULL;

ALTER TABLE "SubmissionReviewRevision"
  ALTER COLUMN "reviewer" DROP DEFAULT;

-- Claim/lease giúp nhiều instance không cùng xử lý một cleanup job.
ALTER TABLE "StorageCleanupJob"
  ADD COLUMN "lockedAt" TIMESTAMP(3),
  ADD COLUMN "lockedBy" TEXT NOT NULL DEFAULT '';

-- Danh sách tên chuẩn để người kiểm tra chỉ chọn lại từ dropdown.
CREATE TABLE "AdminReviewer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminReviewer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminReviewer_normalizedName_key" ON "AdminReviewer"("normalizedName");
CREATE INDEX "AdminReviewer_active_name_idx" ON "AdminReviewer"("active", "name");

-- Tìm kiếm chứa chuỗi theo họ tên/MSSV/lớp vẫn nhanh khi số hồ sơ tăng.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Submission_fullName_trgm_idx" ON "Submission" USING GIN ("fullName" gin_trgm_ops);
CREATE INDEX "Submission_mssv_trgm_idx" ON "Submission" USING GIN ("mssv" gin_trgm_ops);
CREATE INDEX "Submission_className_trgm_idx" ON "Submission" USING GIN ("className" gin_trgm_ops);
