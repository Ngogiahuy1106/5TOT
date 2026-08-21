# Font tự lưu trên máy chủ

Hai bộ chữ dùng cho giao diện, để nguyên trong repo giống `public/vendor/`
nên trang vẫn chạy đúng khi mạng trường chặn CDN hoặc khi chạy offline.

- **Be Vietnam Pro** (400/500/600/700) — chữ thân, do người Việt thiết kế,
  dấu tiếng Việt đặt cân và không đè lên chữ hoa.
- **Petrona** (variable 400–700) — chữ tiêu đề, dáng có chân, hợp với
  văn bản hồ sơ.

Cả hai theo giấy phép SIL Open Font License 1.1, lấy từ Google Fonts.
Mỗi bộ chỉ giữ 2 tập con: `vietnamese` và `latin`.

Khai báo `@font-face` nằm trong `fonts.css`, được nạp từ `css/style.css`.
