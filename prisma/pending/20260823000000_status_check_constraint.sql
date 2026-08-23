-- Khoá tập giá trị hợp lệ của cột status ngay ở tầng database.
--
-- Trước đây tập này chỉ tồn tại trong ALLOWED_STATUSES ở server.js, nên một lệnh
-- sửa tay trên Supabase, một script nhập liệu, hay một phiên bản ứng dụng cũ đều
-- ghi được trạng thái rác. Bản ghi đó sau đó biến mất khỏi mọi bộ lọc theo trạng
-- thái của giao diện quản trị.
--
-- Dọn dữ liệu lệch trước khi thêm ràng buộc, nếu không lệnh ADD CONSTRAINT sẽ
-- thất bại và chặn cả lần deploy. Đưa về "Chưa kiểm tra" là an toàn: Ban sẽ thấy
-- và duyệt lại, thay vì hồ sơ nằm im ở trạng thái không đọc được.
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

-- SubmissionReviewRevision cố ý KHÔNG ràng buộc: đây là bảng lịch sử, phải giữ
-- được đúng giá trị đã từng ghi kể cả khi sau này tập trạng thái hợp lệ đổi.
