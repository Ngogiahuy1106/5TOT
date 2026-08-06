# SV5T Hồ Sơ - Hồ sơ Sinh viên 5 tốt

Express + Prisma + PostgreSQL (Supabase). Mật khẩu quản trị và toàn bộ dữ liệu
nhạy cảm (danh sách hồ sơ đã gửi) nằm ở server - trình duyệt không bao giờ
thấy được `ADMIN_PASSWORD`.

## Kiến trúc

```
HTML + Vanilla JS  →  REST API  →  Express  →  Prisma  →  PostgreSQL (Supabase)
```

- `Submission`: 1 dòng = 1 hồ sơ sinh viên đã bấm "Gửi cho Ban PTSV5T SEEE" (kèm toàn
  bộ dữ liệu form dạng JSON + metadata ảnh minh chứng trong DB; file ảnh thật nằm trong Supabase Storage Bucket -
  không lưu base64 trong PostgreSQL).
- `AppConfig`: 4 link mẫu đơn hiện ở bước "Minh chứng hoạt động", sửa được qua
  mục Quản trị trên web mà không cần đổi code / deploy lại.

## API

| Route | Cần password? | Ghi chú |
|---|:---:|---|
| `GET /api/config` | Không | Ai cũng xem được 4 link mẫu đơn. Không bao giờ trả về mật khẩu. |
| `PATCH /api/config` | Có | Sửa 4 link mẫu đơn |
| `POST /api/auth` | - | Kiểm tra mật khẩu, dùng cho nút "Quản trị" |
| `POST /api/submissions` | Không | Sinh viên nào cũng gửi được hồ sơ của mình |
| `GET /api/submissions` | Có | Ban PTSV5T SEEE xem danh sách hồ sơ đã gửi (gửi mật khẩu qua header `X-Admin-Password`) |

Mật khẩu cho các route "Có" ở cột trên được gửi kèm mỗi request (trong body
hoặc query string) - server tự kiểm tra lại độc lập mỗi lần, không có khái
niệm phiên đăng nhập lưu ở server (đơn giản, phù hợp quy mô 1 ban dùng nội bộ).

## Chạy thử ở máy local

```bash
npm install
npx prisma migrate deploy
npm start
```

Mở `http://localhost:3000`.

Nếu chưa từng chạy migration trên database này, có thể dùng
`npx prisma db push` thay cho `migrate deploy` (áp thẳng schema, không cần
quan tâm lịch sử migration - phù hợp lúc mới thiết lập).

## Deploy lên Render

1. Đẩy toàn bộ thư mục này lên 1 repo GitHub.
2. Render Dashboard -> **New** -> **Web Service** (không phải Static Site, vì
   giờ có server Node thật).
3. **Build Command**: `npm install && npx prisma migrate deploy`
   **Start Command**: `npm start`
4. Environment cần thêm 3 biến: `ADMIN_PASSWORD`, `DATABASE_URL`, `DIRECT_URL`
   (copy từ `.env.example`, điền giá trị thật từ Supabase Project Settings ->
   Database -> Connection string).

Có thể dùng chung 1 project Supabase với các app khác - migration đã đặt tên
riêng biệt (`20260803000000_init_sv5tot`), không đụng bảng của app khác.

## Lấy DATABASE_URL / DIRECT_URL từ Supabase

Supabase Dashboard -> **Project Settings -> Database -> Connection string**:
- Chọn chế độ **Transaction** (cổng 6543, có `?pgbouncer=true`) -> dán vào `DATABASE_URL`.
- Chọn chế độ **Session** (cổng 5432) -> dán vào `DIRECT_URL`.

Nếu mật khẩu database có ký tự đặc biệt (`@ # $ % / ? :`...), phải URL-encode
trước khi dán vào 2 dòng trên (VD: `@` -> `%40`).

## Luồng "Lưu" vs "Gửi cho Ban PTSV5T SEEE" (không đổi so với bản trước)

- **Lưu (trên máy này)**: lưu vào `localStorage` trình duyệt, không gửi đi đâu.
- **Gửi cho Ban PTSV5T SEEE**: gửi dữ liệu hồ sơ lên `POST /api/submissions`; server upload ảnh vào Supabase Storage Bucket, còn Prisma chỉ ghi metadata ảnh vào Postgres. Ban PTSV5T SEEE xem lại bằng cách
  gọi `GET /api/submissions` kèm header `X-Admin-Password: <mật khẩu>` (curl,
  Postman...), hoặc mở thẳng Supabase Table Editor, bảng `Submission`.
  Hiện chưa có màn hình xem danh sách ngay trên web - chưa cần tới vì chỉ
  Ban PTSV5T SEEE dùng, không phải sinh viên.

## Kiểm tra nhanh sau khi deploy

- [ ] Mở web, F12 -> Console không có lỗi đỏ.
- [ ] Bấm "Quản trị", nhập đúng `ADMIN_PASSWORD` -> 4 nút ẩn hiện ra.
- [ ] Điền thử hồ sơ mẫu -> Xem trước -> "Gửi cho Ban PTSV5T SEEE" -> vào Supabase
      Table Editor -> bảng `Submission` phải có 1 dòng mới, cột `evidenceImages`
      có dữ liệu nếu đã tải ảnh minh chứng ở mục 8.
- [ ] Sửa thử 1 link ở "Cấu hình liên kết" -> F5 lại trang -> link vẫn đúng
      giá trị mới (xác nhận đã lưu vào DB, không phải chỉ lưu tạm trên máy).

## Lưu ý về ảnh minh chứng

Ảnh được nén (resize tối đa 1280px cạnh dài, JPEG chất lượng 0.75) ngay khi
tải lên trước khi lưu vào state - tránh trường hợp ảnh chụp điện thoại
gốc (thường vài MB, gấp 4-5 lần sau khi mã hoá base64) cộng dồn nhiều ảnh
vượt giới hạn 25MB của request, khiến "Gửi cho Ban PTSV5T SEEE" báo lỗi.

## Cập nhật quy trình hồ sơ

- Mỗi MSSV chỉ có một hồ sơ. Gửi lại cùng MSSV sẽ cập nhật bản cũ.
- Màn quản trị có ba trạng thái: Chưa kiểm tra, Đã duyệt, Cần bổ sung.
- Danh sách quản trị phân trang 10 hồ sơ mỗi trang; chi tiết chỉ được tải khi bấm Xem.
- Xóa hồ sơ yêu cầu nhập lại mật khẩu quản trị.
- Bản nháp tự động lưu mỗi 30 giây khi có thay đổi.

Sau khi cập nhật code, chạy migration mới:

```bash
npx prisma migrate deploy
npm start
```


## Supabase Storage Bucket

Tạo bucket thủ công trong **Supabase Dashboard → Storage → New bucket** trước khi chạy server:

- Tên bucket phải đúng bằng `SUPABASE_STORAGE_BUCKET` (mặc định: `sv5tot-evidence`).
- Chọn **Private bucket**.
- Có thể để trống `Allowed MIME types`; backend đã chỉ chấp nhận `image/jpeg`, `image/png`, `image/webp`.
- Nếu muốn giới hạn MIME trên Supabase, thêm từng MIME thành từng mục riêng, không dán nhiều loại vào cùng một ô.
- File size limit nên đặt 8 MB hoặc 10 MB.

Thêm ba biến môi trường:

```env
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
SUPABASE_STORAGE_BUCKET="sv5tot-evidence"
```

`SUPABASE_SERVICE_ROLE_KEY` chỉ được đặt ở server/Render, tuyệt đối không đưa vào JavaScript phía trình duyệt hoặc commit lên GitHub.

Server **không tự tạo bucket**. Khi khởi động, server chỉ kiểm tra bucket có tồn tại hay không; nếu thiếu hoặc sai tên, server dừng và ghi lỗi rõ ràng. Ảnh được sắp xếp theo cấu trúc:

```text
<MSSV>/<nhóm-minh-chứng>/<mã-minh-chứng>.jpg
```

PostgreSQL chỉ lưu metadata gồm bucket, path, tên file, kích thước, MIME và thời điểm upload. Khi admin xem ảnh, server tạo signed URL tạm thời; bucket không cần public.
