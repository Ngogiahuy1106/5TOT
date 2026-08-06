-- Giữ lại bản ghi mới nhất của mỗi MSSV trước khi tạo ràng buộc duy nhất.
DELETE FROM "Submission" older
USING "Submission" newer
WHERE older."mssv" = newer."mssv"
  AND (
    older."createdAt" < newer."createdAt"
    OR (older."createdAt" = newer."createdAt" AND older."id" < newer."id")
  );

ALTER TABLE "Submission"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Chưa kiểm tra',
  ADD COLUMN "note" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Submission_mssv_key" ON "Submission"("mssv");
