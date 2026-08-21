CREATE TABLE "SubmissionReview" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Chưa kiểm tra',
  "note" TEXT NOT NULL DEFAULT '',
  "flags" JSONB NOT NULL DEFAULT '{}',
  "checkedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubmissionReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SubmissionReview_submissionId_key" ON "SubmissionReview"("submissionId");
ALTER TABLE "SubmissionReview" ADD CONSTRAINT "SubmissionReview_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Chuyển trạng thái/ghi chú quản trị cũ sang bảng review mà không sửa payload hồ sơ.
INSERT INTO "SubmissionReview" ("id","submissionId","status","note","flags","checkedAt","createdAt","updatedAt")
SELECT 'review_' || "id", "id", "status", "note", '{}'::jsonb,
       CASE WHEN "status" <> 'Chưa kiểm tra' OR "note" <> '' THEN "updatedAt" ELSE NULL END,
       "createdAt", "updatedAt"
FROM "Submission"
ON CONFLICT ("submissionId") DO NOTHING;
