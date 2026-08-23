# Migration chờ áp dụng thủ công

File trong thư mục này **không** nằm trong `prisma/migrations/` nên `prisma migrate
deploy` sẽ không tự chạy. Cố ý như vậy.

## `20260823000000_status_check_constraint.sql`

Khoá tập giá trị hợp lệ của cột `status` ở tầng database (finding F-03).

**Vì sao chưa áp dụng tự động:** lịch sử migration đang lệch. Database ghi nhận
migration `20260819000000_init` không có trong repo, còn repo thì có 7 migration
khác. Thêm một migration mới vào `prisma/migrations/` có thể khiến
`prisma migrate deploy` báo lỗi drift và làm **hỏng cả lần deploy** - tức là sập
site giữa mùa nhận hồ sơ.

**Cách áp dụng an toàn:**

1. Chạy thử ở local trước, xem có lỗi không:
   ```
   npx prisma migrate status
   ```
2. Nếu trạng thái sạch, dán nội dung file `.sql` vào SQL Editor của Supabase và
   chạy tay. Lệnh `UPDATE` ở đầu file dọn dữ liệu lệch trước, nên `ADD CONSTRAINT`
   không thể thất bại giữa chừng.
3. Kiểm tra lại:
   ```sql
   SELECT conname FROM pg_constraint WHERE conname LIKE 'Submission%status_check';
   ```
4. Áp dụng xong thì chuyển file này vào `prisma/migrations/<tên>/migration.sql`
   và chạy `npx prisma migrate resolve --applied <tên>` để lịch sử khớp lại.

**Hoàn tác nếu cần:**
```sql
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_status_check";
ALTER TABLE "SubmissionReview" DROP CONSTRAINT "SubmissionReview_status_check";
```
