# SV5T Hồ Sơ - Hồ sơ Sinh viên 5 tốt

Express + Prisma + PostgreSQL (Supabase). Mật khẩu quản trị và toàn bộ dữ liệu
nhạy cảm (danh sách hồ sơ đã gửi) nằm ở server - trình duyệt không bao giờ
thấy được `ADMIN_PASSWORD`.

## Kiến trúc

```
HTML + Vanilla JS  →  REST API  →  Express  →  Prisma  →  PostgreSQL (Supabase)
```

- `Submission`: 1 dòng = 1 hồ sơ sinh viên đã bấm "Gửi cho Ban PTSV5T SEEE" (kèm toàn
  bộ dữ liệu form dạng JSON + metadata ảnh minh chứng trong DB; file ảnh thật nằm trong Cloudflare R2 bucket -
  không lưu base64 trong PostgreSQL).
- `AppConfig`: link mẫu đơn, thời gian nhận hồ sơ, năm báo cáo và danh mục hoạt động Excel; quản trị được trực tiếp trên web.
- `AdminReviewer`: danh sách chuẩn tên thành viên Ban; mỗi lần kiểm tra chỉ được chọn từ dropdown này.

## API

| Route | Cần password? | Ghi chú |
|---|:---:|---|
| `GET /api/config` | Không | Ai cũng xem được 4 link mẫu đơn. Không bao giờ trả về mật khẩu. |
| `PATCH /api/config` | Session admin | Sửa link, thời gian nhận hồ sơ và năm báo cáo |
| `PUT /api/admin/activity-catalog` | Session admin | Thay thế toàn bộ danh mục hoạt động bằng dữ liệu Excel đã kiểm tra |
| `POST /api/auth` | - | Đăng nhập, tạo session HttpOnly |
| `POST /api/submissions` | Không | Sinh viên nào cũng gửi được hồ sơ của mình |
| `GET /api/submissions` | Session admin | Ban PTSV5T SEEE xem danh sách hồ sơ đã gửi |
| `GET /api/health` | Không | Health check DB + trạng thái Storage cho Render |

Sau khi đăng nhập đúng mật khẩu, server tạo session ngẫu nhiên, chỉ lưu hash token trong PostgreSQL và gửi token bằng cookie HttpOnly + SameSite=Strict. Mật khẩu không còn được gửi lại ở từng request quản trị. Session mặc định hết hạn sau 8 giờ; xóa hồ sơ vẫn yêu cầu nhập lại mật khẩu.

## Nhập danh mục hoạt động 2025-2026

- File nguồn đã kèm tại `data/danh-sach-hoat-dong-2025-2026.xlsx`.
- Đăng nhập **Quản trị** rồi bấm **Nhập Excel hoạt động** và chọn file. Web nhận đúng 6 cột của file nguồn; file xuất lại từ web có thêm cột `Mã hoạt động` nên có 7 cột và vẫn nhập lại được.
- Bộ import phải xử lý đủ 61 dòng trước khi lưu. Với file kèm theo: nhập 60 hoạt động vào đúng danh sách và chỉ bỏ qua 1 dòng HT-G1 vì đây là mục duy nhất được yêu cầu giữ dạng tự điền. Catalog nhận Đạo đức 11, Học tập 6, Thể lực 12, Tình nguyện 6 và Hội nhập 25.
- Sau khi DB xác nhận lưu thành công, danh mục mới thay thế toàn bộ danh mục cũ; không merge và không giữ lại hoạt động cũ. Nếu đọc file hoặc lưu DB lỗi, danh mục cũ được giữ nguyên.
- Chỉ HT-G1 (thành viên tích cực mảng/ban chuyên môn của CLB học thuật) là mục tự điền. Đảng–Đoàn–Hội, NCKH, nhóm nghiên cứu, bài tham luận, sản phẩm sáng tạo, Tình nguyện và giao lưu quốc tế lấy hoạt động từ Excel.
- Không cần migration vì danh mục nằm trong trường JSON `AppConfig.activityCatalog`; backend và frontend dùng cùng 13 nhóm catalog.

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
4. Environment cần đủ 7 biến: `ADMIN_PASSWORD`, `DATABASE_URL`, `DIRECT_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
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

- **Lưu (trên máy này)**: dữ liệu form nhẹ lưu trong `localStorage`, ảnh bản nháp lưu bằng IndexedDB; không gửi lên server/Bucket.
- **Gửi cho Ban PTSV5T SEEE**: gửi dữ liệu hồ sơ lên `POST /api/submissions`; server upload ảnh vào Cloudflare R2, còn Prisma chỉ ghi metadata ảnh vào Postgres (Supabase). Ban PTSV5T SEEE xem lại ngay trong màn quản trị sau khi đăng nhập session.

## Kiểm tra nhanh sau khi deploy

- [ ] Mở web, F12 -> Console không có lỗi đỏ.
- [ ] Bấm "Quản trị", nhập đúng `ADMIN_PASSWORD` -> các nút quản trị ẩn hiện ra.
- [ ] Vào **Cấu hình → Thành viên kiểm tra hồ sơ**, thêm 2 tên mẫu; mở hai hồ sơ khác nhau và xác nhận cả hai dropdown dùng đúng cùng danh sách tên.
- [ ] Điền thử hồ sơ mẫu -> Xem trước -> "Gửi cho Ban PTSV5T SEEE" -> vào Supabase
      Table Editor -> bảng `Submission` phải có 1 dòng mới, cột `evidenceImages`
      có dữ liệu nếu đã tải ảnh minh chứng ở mục 8.
- [ ] Sửa thử 1 link ở "Cấu hình liên kết" -> F5 lại trang -> link vẫn đúng
      giá trị mới (xác nhận đã lưu vào DB, không phải chỉ lưu tạm trên máy).
- [ ] Nhập `data/danh-sach-hoat-dong-2025-2026.xlsx`; thông báo phải ghi đọc 61 và nhập đủ 61 hoạt động; F5 lại vẫn còn catalog mới.
- [ ] Thử nhập một file Excel cố tình sai vài dòng: phải hiện bảng Dòng / Cột / Lý do liệt kê ĐỦ mọi dòng lỗi và có nút tải file `.txt`.
- [ ] Ở bước Tình nguyện, thêm một hoạt động nhưng bỏ trống danh sách ngày: nút "Tiếp theo" và nút "Xác nhận gửi hồ sơ" đều phải chặn.
- [ ] Khi bảng `AdminReviewer` còn trống, nút "Lưu" ở màn Hồ sơ đã gửi phải bị disable kèm cảnh báo, không phải bấm rồi mới báo lỗi.
- [ ] Admin mở một hồ sơ, sau đó sinh viên gửi lại cùng MSSV; bản kiểm tra cũ phải bị từ chối 409 và danh sách được tải lại.
- [ ] Mở `/api/health`: nhận HTTP 200 khi cả PostgreSQL và Storage sẵn sàng.
- [ ] Thử hai request cập nhật cùng MSSV trên staging; bản cuối không được trỏ tới ảnh đã bị xóa và Storage không còn file mồ côi ngoài các cleanup job đang retry.

## Lưu ý về ảnh minh chứng

Ảnh được nén thích ứng ngay trên trình duyệt: cạnh dài tối đa 1600px, JPEG
khởi đầu ở chất lượng 0.82 và tự giảm khi ảnh vượt khoảng 900KB. Nền trong
suốt được chuyển sang trắng, EXIF/GPS bị loại khi mã hóa lại. Ảnh gốc tối đa
20MB; mỗi ảnh sau nén tối đa 8MB và tổng ảnh trong một lần gửi tối đa 16MB.

Bản nháp lưu Blob trong IndexedDB theo từng key. Cơ chế tự lưu chỉ ghi ảnh mới
hoặc đã đổi và xóa key không còn dùng, không xóa rồi ghi lại toàn bộ ảnh mỗi 10 giây.
Backend kiểm tra base64 ảnh riêng, không tính nhầm dữ liệu ảnh vào giới hạn độ dài
văn bản của hồ sơ.

## Cập nhật quy trình hồ sơ

- Mỗi MSSV chỉ có một hồ sơ. Gửi lại cùng MSSV sẽ cập nhật bản cũ.
- Bốn điều kiện cứng được chặn đồng nhất ở frontend và backend: điểm rèn luyện trung bình từ 80; GPA có trọng số đạt ngưỡng diện xét; xác nhận không vi phạm; và đã hoàn thành đủ 05 học phần GDTC hoặc không có điểm F trong các học phần GDTC đã học.
- Tất cả nhóm tiêu chí phải được khai báo rõ `Đạt`, `Không đạt` hoặc `Bổ sung sau`; payload bỏ nhóm/câu hỏi sẽ bị backend từ chối.
- Tiêu chí phụ được phép khai báo `Không đạt` mà không phải chọn trước phương án bù; hồ sơ vẫn gửi được nếu bốn điều kiện cứng phía trên đều đạt.
- Màn quản trị có ba trạng thái: Chưa kiểm tra, Đã duyệt, Cần bổ sung.
- Danh sách quản trị phân trang 10 hồ sơ mỗi trang; chi tiết chỉ được tải khi bấm Xem.
- Xóa hồ sơ yêu cầu nhập lại mật khẩu quản trị.
- Bản nháp tự động lưu mỗi 10 giây khi có thay đổi, theo cơ chế ghi đè snapshot hiện tại.
- Mỗi hoạt động tình nguyện phải khai cả số ngày quy đổi và danh sách ngày tham gia cụ thể. Báo cáo in ra dạng `Tên hoạt động (2 ngày: 19/10, 24/10, 26/10, 31/10/2025)`, chỉ ghi năm ở mốc cuối cùng của mỗi năm. Hồ sơ cũ chưa có danh sách ngày vẫn xem được, nhưng phải bổ sung trước khi gửi lại.
- Dữ liệu Ban kiểm tra được lưu ở bảng `SubmissionReview`, tách khỏi JSON hồ sơ gốc trong `Submission`.
- Màn xem của quản trị là chỉ đọc; không có nút lưu local, xuất Word hay gửi đè hồ sơ sinh viên.
- Bảng kiểm cho phép đánh dấu nội dung/minh chứng cần bổ sung; mục sinh viên khai báo `Không đạt` bị khóa.
- Khi sinh viên gửi lại phiên bản mới, bản kiểm tra cũ được reset để Ban kiểm tra lại đúng phiên bản.
- File Excel quản trị có trạng thái, ghi chú, thời điểm kiểm tra và danh sách nội dung bị đánh dấu.
- Backend không cho lưu trạng thái `Đã duyệt` khi bản review còn flags lỗi.
- Bản kiểm tra luôn gắn với `updatedAt` của hồ sơ đã mở; nếu sinh viên vừa gửi lại, backend trả 409 và buộc Ban tải lại thay vì lưu nhận xét cũ lên bản mới.
- Tên người kiểm tra được tạo một lần trong Cấu hình và chỉ chọn lại từ dropdown; Excel xuất đúng tên chuẩn đã lưu.
- Mỗi lần lưu review tạo thêm một revision để có lịch sử kiểm tra; dữ liệu hồ sơ sinh viên vẫn không bị sửa.
- Gửi, duyệt và xóa cùng một MSSV dùng advisory lock trong PostgreSQL để không làm lệch dữ liệu/ảnh khi có thao tác đồng thời.
- Migration tạo chỉ mục trigram cho tìm theo họ tên, MSSV và lớp để danh sách quản trị không chậm dần khi số hồ sơ tăng.
- Session và rate-limit được lưu trong PostgreSQL nên không mất khi Render restart hoặc chạy nhiều instance.
- Ảnh bị kiểm tra MIME, chữ ký tệp và kích thước ngay trước bước review; dữ liệu ảnh sai trả 400 thay vì lỗi máy chủ. Lỗi dọn Storage được đưa vào hàng đợi retry có claim/lease an toàn cho nhiều instance.
- Thư viện xuất Word `docx` 8.5.0 được lưu tại `public/vendor` nên không phụ thuộc jsDelivr; giấy phép MIT đi kèm trong cùng thư mục.

Sau khi cập nhật code, chạy migration mới:

```bash
npx prisma migrate deploy
npm start
```

Chạy regression test trước khi deploy:

```bash
npm test
```


## Cloudflare R2 bucket

Postgres vẫn dùng Supabase; riêng kho ảnh minh chứng chạy trên Cloudflare R2
(10 GB miễn phí, egress không tính phí). Tạo bucket thủ công trong
**Cloudflare Dashboard → Storage & databases → R2 → Create bucket** trước khi chạy server:

- Tên bucket phải đúng bằng `R2_BUCKET` (mặc định: `sv5tot-evidence`).
- Location chọn **Asia-Pacific (APAC)** cho gần người dùng trong nước.
- **Không** bật Public access: ảnh chỉ mở qua presigned URL 15 phút do server ký.
- Không cần đặt giới hạn MIME hay dung lượng trên R2; backend đã chỉ chấp nhận
  `image/jpeg`, `image/png`, `image/webp` và tối đa 8 MB mỗi ảnh.

Tạo API token tại **R2 → API → Manage API tokens → Create Account API token**,
quyền **Object Read & Write**, giới hạn đúng bucket trên. Rồi thêm bốn biến môi trường:

```env
R2_ACCOUNT_ID="YOUR_ACCOUNT_ID"
R2_ACCESS_KEY_ID="YOUR_ACCESS_KEY_ID"
R2_SECRET_ACCESS_KEY="YOUR_SECRET_ACCESS_KEY"
R2_BUCKET="sv5tot-evidence"
```

`R2_SECRET_ACCESS_KEY` chỉ được đặt ở server/Render, tuyệt đối không đưa vào JavaScript phía trình duyệt hoặc commit lên GitHub.

Server ký mọi request lên R2 bằng AWS Signature V4 tự cài trong `server.js`
(không thêm dependency). Link xem ảnh được ký cục bộ nên không tốn request mạng
hay operation nào của R2. Phần ký được khóa lại bằng `test/r2-sigv4.test.js`,
đối chiếu với bộ test vector chính thức của AWS.

Server **không tự tạo bucket**. Server vẫn khởi động để Render không crash-loop khi Storage gián đoạn, tự kiểm tra lại mỗi 5 phút và trả trạng thái qua `/api/health`; trong lúc Storage chưa sẵn sàng, gửi hồ sơ được trả 503 rõ ràng còn dữ liệu cũ không bị sửa. Ảnh được sắp xếp theo cấu trúc:

```text
<MSSV>/<nhóm-minh-chứng>/<mã-minh-chứng>.jpg
```

PostgreSQL chỉ lưu metadata gồm bucket, path, tên file, kích thước, MIME và thời điểm upload. Khi admin xem ảnh, server tạo signed URL tối đa 15 phút; bucket không cần public.


## Bảo mật và giới hạn request

- Toàn bộ `/api` có rate limit chung lưu trong PostgreSQL. Hạn mức gửi hồ sơ khóa theo **MSSV** (8 lần/10 phút) chứ không theo IP, vì cả ký túc xá/wifi trường thường ra Internet bằng chung một IP NAT; hạn mức theo IP chỉ giữ ở mức chống flood.
- Đăng nhập quản trị chỉ đếm **lần nhập sai** (10 lần/15 phút); đăng nhập đúng không tốn hạn mức nên nhiều thành viên Ban ngồi cùng phòng vẫn vào được.
- Mọi phản hồi lỗi của `/api` đều kèm `scope` (`network`/`permission`/`input`/`storage`/`database`/`ratelimit`/`server`...) để giao diện nói rõ lỗi nằm ở mạng của người dùng, máy chủ, kho ảnh hay dữ liệu vừa nhập.
- Admin dùng session cookie HttpOnly/SameSite=Strict, không giữ mật khẩu trong JavaScript sau đăng nhập.
- CSP, HSTS (production), X-Frame-Options, nosniff, Referrer-Policy và Permissions-Policy được bật ở server.
- Ảnh upload chỉ nhận JPEG/PNG/WEBP; HEIC/HEIF bị chặn ngay ở frontend.
- Backend kiểm tra chữ ký thật và kích thước ảnh, không chỉ tin MIME do trình duyệt gửi.
- Ảnh cập nhật dùng path có version ngẫu nhiên; DB chỉ chuyển sang ảnh mới sau khi upload thành công, rồi mới dọn ảnh cũ.

## Chuẩn ngoại ngữ Hội nhập

- K70: TOEIC từ 350 hoặc IELTS từ 5.0.
- K69: TOEIC từ 400 hoặc IELTS từ 5.0.
- K68: TOEIC từ 450 hoặc IELTS từ 5.0.
- K67: TOEIC từ 500 hoặc IELTS từ 5.5.
- Bổ sung riêng phương án **không có học phần Tiếng Anh nào dưới loại B trong 2 kỳ chính**. Phương án này xuất hiện trong báo cáo và bắt buộc nộp ảnh bảng điểm hai kỳ làm minh chứng.
- Ngoài IELTS và TOEIC tổng theo tiêu chí SV5T, form hỗ trợ quy đổi theo phụ lục: VSTEP, Aptis ESOL, PEIC, PTE Academic, Linguaskill, Cambridge Assessment English, Cambridge English Tests, TOEIC 4 kỹ năng, TOEFL iBT, TOEFL ITP, JLPT, DELF/DALF, TCF và HSK+HSKK.
- K68–K70 dùng hàng tương đương IELTS 5.0; K67 trở về trước dùng hàng tương đương IELTS 5.5.
- TOEIC tổng và TOEIC 4 kỹ năng là hai lựa chọn riêng, tránh nhầm một điểm tổng với bốn điểm Nghe/Nói/Đọc/Viết trong phụ lục.

## Điểm bảo mật chưa triển khai

Quyền cập nhật hồ sơ theo MSSV chưa được khóa vì cần chốt cách khôi phục khi sinh viên đổi máy hoặc mất mã. Xem `SECURITY_TODO.md` trước khi mở nhận hồ sơ thật.
