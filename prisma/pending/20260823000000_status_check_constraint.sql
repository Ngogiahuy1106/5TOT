-- Khoá tập giá trị hợp lệ của cột status ở tầng database. Cách áp dụng và lý do
-- chưa đưa vào prisma/migrations: xem README.md cùng thư mục.
--
-- Hai lệnh UPDATE phải chạy trước: ADD CONSTRAINT sẽ thất bại nếu còn bản ghi
-- mang trạng thái ngoài tập hợp lệ.
UPDATE "Submission"
  SET "status" = 'Chưa kiểm tra'
  WHERE "status" NOT IN ('Chưa kiểm tra', 'Đã duyệt', 'Cần bổ sung');

UPDATE "SubmissionReview"
  SET "status" = 'Chưa kiểm tra'
  WHERE "status" NOT IN ('Chưa kiểm tra', 'Đã duyệt', 'Cần bổ sung');

ALTER TABLE "Submission"
  ADD CONSTRAINT "Submission_status_check"
  CHECK ("status" IN ('Chưa kiểm tra', 'Đã duyệt', 'Cần bổ sung'));

ALTER TABLE "SubmissionReview"
  ADD CONSTRAINT "SubmissionReview_status_check"
  CHECK ("status" IN ('Chưa kiểm tra', 'Đã duyệt', 'Cần bổ sung'));

-- SubmissionReviewRevision cố ý không ràng buộc: bảng lịch sử phải giữ đúng giá
-- trị đã từng ghi, kể cả khi tập trạng thái hợp lệ đổi về sau.
