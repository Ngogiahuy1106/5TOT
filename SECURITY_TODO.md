# Việc còn lại trước khi mở nhận hồ sơ thật

## P0 — Xác thực quyền cập nhật hồ sơ

Hiện `POST /api/submissions` vẫn upsert theo MSSV. Đây là điểm còn lại quan trọng nhất.

### Phương án khuyến nghị nếu chưa tích hợp email/SSO

1. Lần gửi đầu, server tạo token ngẫu nhiên 32 byte.
2. Chỉ lưu SHA-256 của token trong `Submission.editTokenHash`; token thô chỉ trả một lần cho sinh viên.
3. Trình duyệt lưu token cục bộ và giao diện cho tải “mã cập nhật hồ sơ”.
4. Mọi lần review trước gửi, cập nhật hồ sơ và tra cứu chi tiết phải kèm token.
5. Ban quản trị có nút cấp lại token sau khi đối chiếu danh tính sinh viên.
6. Rate-limit theo cả IP và MSSV; không cho phản hồi phân biệt “MSSV đúng nhưng token sai” quá chi tiết.

Ưu điểm: không cần dịch vụ email. Nhược điểm: sinh viên có thể mất token khi đổi máy/xóa dữ liệu trình duyệt.

### Phương án tốt hơn

Gửi OTP đến email `@sis.hust.edu.vn` hoặc dùng SSO HUST. Cách này giải quyết đổi máy/khôi phục tốt hơn nhưng cần hạ tầng email hoặc OAuth của trường.

### Quyết định cần chốt

- Có bắt buộc sinh viên dùng email HUST không?
- Có dịch vụ gửi email/OTP không?
- Khi mất token, Ban có được cấp lại thủ công không?
- Tra cứu công khai chỉ hiện trạng thái hay cũng phải yêu cầu token/OTP?

## Kiểm tra staging bắt buộc

- Chạy `npx prisma migrate deploy` trên database staging.
- Gửi mới, gửi cập nhật, reset review và xóa hồ sơ với Storage thật.
- Restart service rồi xác nhận session/rate-limit vẫn còn hiệu lực.
- Thử hai admin lưu review gần đồng thời.
- Mở file Word/Excel xuất ra bằng Microsoft Office thực tế.
