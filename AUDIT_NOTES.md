# Kiểm tra cuối

Bản này đã được rà soát lại các luồng khai báo, kiểm tra trước khi gửi, cập nhật hồ sơ, ảnh Bucket, bản nháp IndexedDB và giao diện admin.

Các lỗi logic được sửa trong lượt cuối:
- Frontend và backend cùng áp dụng số lượng tối thiểu của từng tiêu chí, bao gồm Thể lực cần 2 hoạt động.
- Điểm/GDTC không đạt vẫn được coi là đã khai báo và không bị ghi sai thành đạt trong BCTT.
- Số tín chỉ bắt buộc 1–30 ở cả giao diện và backend.
- Xóa ảnh trong hồ sơ cập nhật được truyền rõ lên server; ảnh cũ hoặc ảnh thuộc tiêu chí đã bỏ được dọn khỏi Bucket.
- Upload nhiều ảnh có cơ chế dọn file tạm nếu một ảnh trong lô upload lỗi.
- Dữ liệu người dùng được escape thêm ở phần xem trước, minh chứng và danh sách hoạt động.
- Mã tiêu chí trong thông báo lỗi được đổi sang tên dễ hiểu.

Kiểm tra đã chạy: `node --check` cho server.js và toàn bộ 4 file JS.
