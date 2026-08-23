# Báo cáo audit — SV5T Hồ sơ Sinh viên 5 tốt — 23/08/2026 — commit `fac9099`

## 1. Tóm tắt điều hành

**Quyết định: NO-GO** — vẫn vì đúng một việc, và vẫn là việc cũ.

- **Chặn duy nhất: backup chưa từng phục hồi thử.** Đây là điều kiện cổng ở bậc B, không phải phán đoán mức độ. Làm một lần phục hồi thử (~1 giờ) là lên `CONDITIONAL GO`.
- **Lần này bằng chứng mạnh hơn hẳn.** Ba vật cản của lần audit 22/08 — không chạy được server, không render được giao diện, không có git — đều đã gỡ. Ma trận phân quyền, rate limit, responsive và hiệu năng nay là `Verified` chứ không còn `Static evidence`.
- **Phân quyền: đạt, và đạt thật.** 12/12 route quản trị trả 401 khi không có cookie, cookie giả cũng 401, phiên hợp lệ 200, và sau logout chính cookie đó bị thu hồi phía server. Đây là phần làm tốt nhất của hệ thống.
- **Hai High vẫn mở.** F-01 (rate limit tra cứu không chặn được dò MSSV) nay đã **chứng minh bằng thực nghiệm**, không còn là suy luận từ code. F-02 (tầng phân quyền không có một test nào bảo vệ) tái xác nhận bằng phép thử đột biến.
- **Năm finding mới**, chủ yếu ở hai pha trước đây không kiểm được: tràn ngang trên mobile ở bước cuối, 21/45 ô nhập không có tên truy cập, và `/api/config` tốn ~1,2 giây trên đường tới màn hình đầu tiên.
- **Một lỗi phát sinh trong phiên này đã được sửa ngay** (F-14): thay đổi cách in báo cáo làm luật client chặt hơn luật dùng chung với server. Đã đồng bộ lại và khoá bằng test hồi quy.
- **Độ tin cậy: Trung bình–Cao.** Chỉ còn load test và phục hồi backup là `Not assessed`, cả hai vì không được phép chạm vào production.

## 2. Phạm vi và độ tin cậy

Chạy đủ pha 0–7 trên commit `fac9099`. Môi trường: Windows 11, Node v20.17.0, server chạy local trỏ tới **đúng Supabase và R2 của production**.

Vì trỏ vào dữ liệu thật nên đã tự giới hạn:

- Chỉ dùng route đọc; **không** gọi `POST /api/submissions` (sẽ tạo hồ sơ thật).
- Route ghi chỉ thăm dò bằng **id không tồn tại** và **body rỗng**, kèm chụp `GET /api/config` trước/sau và đối chiếu byte — kết quả **không đổi một byte**.
- Đăng nhập quản trị đúng **một lần** bằng mật khẩu thật, rồi logout ngay; không in mật khẩu ra bất cứ đâu.
- Thăm dò rate limit tối đa 5 request; **không** chạy load test lên production.
- Chỉ tra cứu MSSV **không tồn tại** (`20210000`), không dò MSSV sinh viên thật.
- Hai phép thử đột biến đều hoàn tác và đối chiếu `diff` + `git status` xác nhận sạch.

**Không đánh giá:** load test và độ trễ dưới tải, phục hồi backup, hành vi trên iOS Safari thật (suy ra từ quy tắc 16px), CVE ở tầng hạ tầng Render/Supabase.

## 3. Bản đồ hệ thống

**Stack:** Express 4 + Prisma 5 + PostgreSQL (Supabase) + Cloudflare R2. Frontend HTML/CSS/JS thuần, không build step.

**Route map (19 route):** 7 công khai — `GET /api/health`, `GET /api/config`, `POST /api/auth`, `GET /api/auth/session`, `POST /api/submissions/review`, `POST /api/submissions`, `GET /api/submission-status`. **12 route có `requireAdmin`**, đã kiểm từng cái.

**Ma trận vai trò × hành động:**

| Hành động | Ẩn danh | Admin |
|---|---|---|
| Gửi hồ sơ, chấm thử, tra cứu theo MSSV, đọc config | Có | Có |
| Xem/sửa/xoá hồ sơ, xuất dữ liệu, quản lý reviewer, sửa config, sửa danh mục | **401 — `Verified` 12/12** | Có |

Reviewer **không phải tài khoản** — chỉ là tên chọn từ bảng `AdminReviewer`; mọi thao tác đi qua phiên admin.

**Bản đồ luồng dữ liệu:** trình duyệt → Express `/api` → Prisma → Postgres (Supabase). Ảnh: trình duyệt (base64) → Express → R2 qua SigV4 (khoá chỉ ở server) → lưu path vào cột `evidenceImages`, đọc lại bằng signed URL có hạn.

## 4. Findings theo mức độ

### [F-04b] Backup chưa từng phục hồi thử thành công — **Blocker**

- **Pha:** 7 · **Bằng chứng:** `Not assessed` (không có hồ sơ phục hồi nào)
- **Vấn đề:** không có bằng chứng nào cho thấy đã từng phục hồi thành công từ backup Supabase. Theo §1, không có bằng chứng thì ghi `Not assessed`, và `Not assessed` **không** được suy ra là đạt — nên vế cổng tính là đúng.
- **Tác động:** hỏng dữ liệu là mất hồ sơ của toàn bộ sinh viên đã nộp, không có đường lấy lại đã kiểm chứng.
- **Hướng sửa:** phục hồi thử một lần ra project tạm, ghi lại thời gian phục hồi và ngày thực hiện vào `audit-state.md`.
- **Trạng thái:** Open

> **Đính chính so với báo cáo 22/08.** Bản trước gộp F-04 thành một Blocker cho cả hai vế "migration không có đường lui" và "backup chưa thử". Quét lại 7 migration: **0 bước phá huỷ** (không `DROP COLUMN`, không `DROP TABLE`) — toàn bộ chỉ thêm mới. Theo thang mức độ ở §5, migration chỉ-thêm-mới không có đường lui là **Medium**, không phải Blocker. Nên F-04 tách làm hai: **F-04a Medium** (migration) và **F-04b Blocker** (backup). Kết luận `NO-GO` **không đổi** — nó luôn đến từ vế backup.

### [F-01] Rate limit tra cứu không chặn được việc dò MSSV — **High**

- **Pha:** 5 · **Bằng chứng:** **`Verified`** (nâng từ `Static evidence` 22/08)
- **Vị trí:** `server.js:153` (`lookupLimit`), `server.js:1199` (route), `studentKeyOf`
- **Tái hiện:** gọi `GET /api/submission-status?mssv=…` và đọc header `X-RateLimit-Remaining`:

| MSSV gọi | `X-RateLimit-Remaining` |
|---|---|
| 209900001 | 119 |
| 209900001 | 118 |
| 209900001 | 117 |
| **209900002** | **119** — reset |
| **209900003** | **119** — reset |

- **Kết quả quan sát được:** khoá hạn mức là `lookup:<hash IP>:<hash MSSV>`, nên **mỗi MSSV mới nhận một hạn mức 120 lượt hoàn toàn mới**. Bộ giới hạn này không cản trở việc dò một chút nào.
- **Kết quả mong đợi:** bộ đếm theo IP phải giảm dần bất kể đổi MSSV.
- **Quy mô khai thác:** `validStudentId` giới hạn năm 2021–2025 → không gian ~**230.000** MSSV. Trần duy nhất còn lại là `globalApiLimit` 600 req/phút/IP → **quét sạch trong 6,4 giờ từ một IP**. `mssv=20210000` (hợp lệ, không có hồ sơ) trả **404**, có hồ sơ trả **200 kèm `status`** — phân biệt được rõ ràng.
- **Rò rỉ gì:** toàn bộ danh sách sinh viên đã nộp hồ sơ SV5T và kết quả duyệt từng người.
- **Nguyên nhân gốc:** đưa MSSV vào khoá hạn mức là đúng cho endpoint **gửi hồ sơ** (chặn một sinh viên spam) nhưng sai cho endpoint **tra cứu** — ở đây MSSV chính là biến mà kẻ tấn công thay đổi.
- **Hướng sửa:** thêm một bộ đếm khoá **thuần theo IP** (ví dụ 30 lượt/5 phút) chạy song song; vượt bất kỳ cái nào cũng trả 429.
- **Ghi chú:** `POST /api/submissions/review` (`server.js:1027`) cùng họ vấn đề, sửa kèm.
- **Test hồi quy đề xuất:** 31 lượt tra cứu với 31 MSSV khác nhau từ cùng một IP → lượt thứ 31 phải là 429.
- **Trạng thái:** Open

### [F-02] Tầng phân quyền không có test nào bảo vệ — **High**

- **Pha:** 2 và 7 · **Bằng chứng:** **`Verified`** (tái xác nhận trên bộ test hiện tại)
- **Phép thử đột biến, chạy lại 23/08:**

| Thay đổi cố ý | `npm test` |
|---|---|
| Vô hiệu hoá kiểm phiên trong `requireAdmin` (`server.js:83`) | **57 pass / 0 fail** — không phát hiện |
| *(đối chứng)* Hạ ngưỡng DRL 80 → 0 (`shared-rules.js:54`) | **54 pass / 2 fail** — phát hiện được |

- **Diễn giải:** bộ test bảo vệ quy tắc nghiệp vụ rất tốt — phá ngưỡng DRL là đỏ ngay. Nhưng gỡ sạch tầng xác thực quản trị thì **không một test nào đỏ**. 12 route `requireAdmin` không có gì bảo vệ trước hồi quy.
- **Vì sao:** cả 7 file test đều chạy trên `shared-rules.js` hoặc trên khối mã **trích ra từ `server.js` dưới dạng chuỗi văn bản** rồi nạp bằng `vm` (`test/server-validation.test.js:7-12`). Không file nào dựng app Express và gửi request — chuỗi `fetch` duy nhất trong `test/admin-state.test.js:19` là một stub cố tình ném lỗi.
- **Hướng sửa:** test HTTP cho ma trận quyền, tối thiểu 3 ca mỗi route: không cookie → 401; cookie sai → 401; cookie hợp lệ → 200. **Ba ca này hôm nay đã chạy tay và đều đạt** — chỉ cần đóng gói lại thành test tự động.
- **Cả hai thay đổi thử nghiệm đã hoàn tác; `diff` và `git status` xác nhận sạch.**
- **Trạng thái:** Open

### [F-09] Bước "Xem trước & Xuất" đẩy tràn ngang cả trang ở 360px — **Medium** *(mới)*

- **Pha:** 4 · **Bằng chứng:** **`Verified`** (đo trong trình duyệt ở viewport 360×780)
- **Vị trí:** `public/css/style.css` — `.preview-doc`
- **Kết quả quan sát được:** bước 1–8 sạch (`scrollWidth` = 360). Bước 9: `.preview-doc` có `clientWidth` 276 / `scrollWidth` **398**, và `overflow-x: visible` suốt chuỗi `.preview-doc → .card → .wrap → body → html`, nên bảng báo cáo **đẩy toàn bộ trang rộng ra 440px**.
- **Tác động:** trên điện thoại, cả tiêu đề lẫn cụm nút "Tải file Word / Gửi cho Ban" bị trượt ngang theo — đúng bước quan trọng nhất của luồng.
- **Hướng sửa:** bọc `.preview-doc` trong một khung `overflow-x:auto` để bảng tự cuộn bên trong thay vì đẩy trang.
- **Trạng thái:** Open

### [F-10] 21/45 ô nhập không có tên truy cập — **Medium** *(mới)*

- **Pha:** 4 · **Bằng chứng:** **`Verified`** (đếm `el.labels` trên cả 9 bước)
- **Vị trí:** khuôn `<div class="field"><label>…</label><input id="…"></div>` dùng khắp `public/js/app.js`
- **Kết quả quan sát được:** 45 control trên 9 bước; **23** có label đúng chuẩn (checkbox bọc trong `<label>`), **21** không có `labels`, không `aria-label`, không nằm trong `<label>`. Thẻ `<label>` thiếu `for` nên không liên kết với ô nhập.
- **Tác động:** trình đọc màn hình đọc các ô này là "edit text" trống. Bấm vào nhãn cũng không focus được ô — mất một tiện ích cho cả người dùng thường.
- **Hướng sửa:** thêm `for` trỏ tới `id` sẵn có; ô nào chưa có `id` thì đặt.
- **Trạng thái:** Open

### [F-11] `/api/config` tốn ~1,2 giây trên đường tới màn hình đầu tiên — **Medium** *(mới)*

- **Pha:** 6 · **Bằng chứng:** **`Verified`**
- **Vị trí:** `server.js:940`

| Phép đo | p50 |
|---|---|
| `/api/config` trên production (12 lần) | **1189ms** |
| `/api/health` trên production (12 lần, có cache DB 5s) | 418ms — xấp xỉ RTT tới Render |
| suy ra phần server→Supabase của `/api/config` | **~770ms** |
| `SELECT 1` thuần từ máy đo tới Supabase | 588ms |
| `findUnique` cả hàng vs bỏ `activityCatalog` | 599ms vs 586ms — **kích thước payload không phải nguyên nhân** |
| Lần tải trang đo trong trình duyệt | `/api/config` **2774ms** |

- **Diễn giải:** chi phí nằm ở **round-trip mạng tới Supabase**, không phải ở truy vấn (một `findUnique` trên bảng một hàng) cũng không phải payload (11KB). Endpoint lại đặt `Cache-Control: no-store` và được gọi trên **mọi lần tải trang**, trước khi app dựng được giao diện.
- **Hướng sửa:** cache config trong bộ nhớ tiến trình (nó chỉ đổi khi admin bấm lưu), xoá cache trong `PATCH /api/config` và `PUT /api/admin/activity-catalog`. Cắt được ~770ms khỏi mọi lần vào trang. Cân nhắc đưa Render và Supabase về cùng region.
- **Trạng thái:** Open

### [F-04a] Migration không có đường quay lui — **Medium** *(hạ từ Blocker)*

- **Pha:** 1 và 7 · **Bằng chứng:** `Verified` (quét 7 thư mục migration)
- **Số đo:** 7 migration, **0** `DROP COLUMN`/`DROP TABLE`, 3 FK, 3 unique index. Toàn bộ chỉ thêm mới.
- **Vì sao Medium chứ không Blocker:** theo §5, migration chỉ-thêm-mới không có đường lui thì lùi được bằng cách bỏ qua phần thêm, rủi ro thấp. Prisma mặc định không sinh down migration nên đây là trạng thái bình thường, không phải khuyết điểm riêng của dự án này.
- **Trạng thái:** Open

### [F-03] Không có ràng buộc CHECK; `status` chỉ ràng buộc ở tầng ứng dụng — **Medium**

- **Pha:** 1 · **Bằng chứng:** `Verified` (đếm trên 7 file migration: **0 CHECK**)
- **Vị trí:** `prisma/schema.prisma:31`, `server.js:14`
- **Vấn đề:** tập giá trị hợp lệ của `status` chỉ tồn tại trong `ALLOWED_STATUSES` ở `server.js`. Sửa tay trên Supabase, script nhập liệu, hay một phiên bản ứng dụng cũ đều ghi được trạng thái rác, và bản ghi đó thành vô hình trong bộ lọc theo trạng thái.
- **Hướng sửa:** migration thủ công thêm `CHECK (status IN ('Chưa kiểm tra','Đã duyệt','Cần bổ sung'))` cho `Submission` và `SubmissionReview`.
- **Trạng thái:** Open

### [F-05] Ô nhập dùng `font-size:14px` — iOS tự phóng to trang — **Medium**

- **Pha:** 4 · **Bằng chứng:** **`Verified`** (nâng từ `Static evidence`) — đo `getComputedStyle` trên bước 1: **9/9 ô đều 14px**, không ô nào đạt 16px
- **Vị trí:** `public/css/style.css:127`
- **Vấn đề:** Safari trên iOS tự phóng to khi focus vào ô nhập dưới 16px. Đây là ứng dụng toàn form, sinh viên chủ yếu điền trên điện thoại.
- **Hướng sửa:** đặt `font-size:16px` cho ô nhập trong media query màn hình hẹp.
- **Trạng thái:** Open

### [F-08] Không có CI — **Medium**

- **Pha:** 7 · **Bằng chứng:** `Verified` (không tồn tại `.github/`, `.gitlab-ci.yml`, `Jenkinsfile`)
- **Vấn đề:** 57 test chạy tốt nhưng không có gì bắt buộc chúng chạy trước khi triển khai. Ghép với F-02: một thay đổi phá phân quyền vừa không bị test bắt, vừa không có cổng nào chặn.
- **Hướng sửa:** một workflow chạy `npm ci && npm test` trên mỗi lần đẩy code. Repo giờ đã có git và remote GitHub nên làm được ngay.
- **Trạng thái:** Open

### [F-12] Tải sẵn 725KB `docx` và ~196KB `xlsx` cho mọi khách — **Low** *(mới)*

- **Pha:** 4 và 6 · **Bằng chứng:** `Verified`
- **Vị trí:** `public/index.html:201-202`
- **Vấn đề:** cả hai thư viện nằm ở thẻ `<script>` không `defer`/`async`. `docx` chỉ dùng ở bước 9 khi bấm "Tải file Word"; `xlsx` chỉ dùng ở khu quản trị để nhập danh mục. Sinh viên chỉ vào xem cũng tải hết.
- **Hướng sửa:** nạp động khi thật sự cần (`import()` hoặc chèn thẻ script lúc bấm nút). Vì đặt ở cuối `</body>` nên không chặn first paint — do đó là Low, không phải Medium.
- **Trạng thái:** Open

### [F-06] Drift design token — **Low**

- **Pha:** 3 · **Bằng chứng:** `Verified` (đo lại trên bản 23/08)
- **Số đo:** `public/css/style.css` 785 dòng · **113** lần viết màu trực tiếp · **61** giá trị màu riêng biệt · chỉ **13** biến CSS · 8 mốc breakpoint (600, 640, 700, 720, 760×3, 800, 900px).
- **Tác động:** đổi màu thương hiệu phải sửa tay nhiều chỗ và sẽ sót; 8 mốc breakpoint tuỳ hứng làm bố cục khó dự đoán ở kích thước trung gian.
- **Hướng sửa:** gom về bộ token đã có; rút breakpoint xuống 3 mốc.
- **Trạng thái:** Open

### [F-07] So sánh mật khẩu rò rỉ độ dài qua thời gian — **Low**

- **Pha:** 5 · **Bằng chứng:** `Static evidence`
- **Vị trí:** `server.js:431`
- **Vấn đề:** `a.length===b.length && crypto.timingSafeEqual(a,b)` — phép so độ dài chạy trước và đoản mạch, nên chống rò rỉ nội dung nhưng không chống rò rỉ độ dài.
- **Tác động:** thấp; đã có khoá 429 sau nhiều lần sai.
- **Hướng sửa:** băm cả hai bên về độ dài cố định rồi mới so.
- **Trạng thái:** Open

### [F-13] Header `X-Powered-By: Express` — **Low** *(mới)*

- **Pha:** 5 · **Bằng chứng:** `Verified` (`curl -sI` trên production)
- **Vấn đề:** lộ framework, giúp thu hẹp phạm vi dò CVE. Các header khác đều đã đặt đầy đủ, chỉ sót cái mặc định này.
- **Hướng sửa:** `app.disable('x-powered-by')`.
- **Trạng thái:** Open

### [F-14] Luật client chặt hơn luật dùng chung với server — **Medium** — **Fixed and verified** *(mới, phát sinh trong phiên này)*

- **Pha:** 2 · **Bằng chứng:** `Verified`
- **Vị trí:** `public/js/app.js` (`evaluateGroupState`) và `public/js/shared-rules.js` (`GROUP_VALIDATION_RULES`)
- **Vấn đề:** thay đổi cách in báo cáo khiến `DD-G5`, `TL-G1`, `TL-G3`, `TL-G4` bắt buộc phải có nội dung tự điền ở phía giao diện, trong khi luật dùng chung vẫn để `{kind:'yesno'}` — tức server coi là đã khai xong dù bỏ trống. Giao diện chặn nút "Tiếp theo" còn `missingRequiredDeclarations` phía server lại cho gửi.
- **Nguyên nhân gốc:** sửa `evaluateGroupState` mà không sửa bảng luật dùng chung — đúng loại lệch mà `shared-rules.js` sinh ra để ngăn.
- **Đã sửa:** đổi bốn ID sang `{kind:'detail'}` trong `GROUP_VALIDATION_RULES`.
- **Kiểm chứng:** đối chiếu 16 tổ hợp (4 nhóm × 4 trạng thái) giữa `evaluateGroupState` và `groupStateComplete` → **16/16 khớp**. Thêm test hồi quy trong `test/shared-rules.test.js`; `npm test` 57/57 pass.
- **Trạng thái:** Fixed and verified

## 4b. Những gì đã kiểm và **đạt**

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Phân quyền 12 route admin, không cookie | Pass | `Verified` — 12/12 trả 401 |
| Phân quyền với cookie giả/rỗng/random 64 byte | Pass | `Verified` — 3/3 trả 401 |
| Phiên hợp lệ được chấp nhận | Pass | `Verified` — 3/3 route trả 200 |
| Thu hồi phiên phía server khi logout | Pass | `Verified` — cùng cookie sau logout trả 401 |
| Route ghi không tác động gì khi chưa xác thực | Pass | `Verified` — `GET /api/config` trước/sau giống nhau từng byte |
| Cookie `HttpOnly` | Pass | `Verified` — cookie jar ghi nhận `#HttpOnly` |
| Header CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy | Pass | `Verified` — `curl -sI` |
| HSTS `max-age=31536000; includeSubDomains` | Pass | `Verified` trên production; gate đúng bằng `NODE_ENV`/`RENDER` |
| Không có secret trong bundle client | Pass | `Verified` — quét 6 file, khớp duy nhất là một dòng chú thích |
| Dependency CVE | Pass | `Verified` — `npm audit --omit=dev`: 0 vulnerabilities |
| Ràng buộc unique `mssv` | Pass | `Static evidence` — `@@unique([mssv])` |
| Migration không có bước phá huỷ | Pass | `Verified` — 0 `DROP COLUMN`/`DROP TABLE` trên 7 migration |
| Không tràn ngang ở 360px, bước 1–8 | Pass | `Verified` — `scrollWidth` = 360 cả 8 bước |
| Điều hướng nhất quán 9 bước | Pass | `Verified` — bước 1 "Quay lại" `disabled`, bước 9 "Tiếp theo" `display:none` |
| Trạng thái empty có mặt nơi cần | Pass | `Verified` — bước Tình nguyện và Minh chứng |
| Không lỗi console khi đi hết 9 bước | Pass | `Verified` |
| `lang="vi"` và meta viewport | Pass | `Verified` |
| Bộ test bảo vệ quy tắc nghiệp vụ | Pass | `Verified` — phép thử đối chứng làm 2 test đỏ |
| Luật dùng chung client/server | Pass | `Verified` — 16/16 tổ hợp khớp (sau F-14) |
| Báo cáo thành tích in đúng câu chữ | Pass | `Verified` — đối chiếu 6 dòng Đạo đức/Thể lực trên server thật |

## 5. Kết quả theo pha

- **Pha 1 — Nền dữ liệu.** Schema không đổi từ 22/08. Unique `mssv` đạt. Không có CHECK constraint nào (F-03). Migration chỉ thêm mới, không có đường lui (F-04a). RLS không áp dụng: chỉ server dùng service role, client không nói chuyện trực tiếp với Postgres. **Xem lại bậc tại cổng pha 1: giữ B** — dữ liệu hồ sơ là nguồn quyết định xét danh hiệu, không tái tạo được từ một file nguồn bên ngoài.
- **Pha 2 — Chức năng & phân quyền.** Ma trận quyền nay `Verified` đầy đủ, kể cả thu hồi phiên. Còn F-02 (không có test bảo vệ) và F-14 (đã sửa).
- **Pha 3 — Giao diện.** Điều hướng, trạng thái empty và console đều đạt. Còn F-06 (drift token).
- **Pha 4 — Responsive & a11y.** **Cổng Fail** vì F-09 (tràn ngang bước 9). Thêm F-05 và F-10. Vùng chạm nhỏ nhất 38px — đạt WCAG 2.5.8 mức AA (24px), chưa đạt 2.5.5 mức AAA (44px), không nâng thành finding.
- **Pha 5 — Bảo mật.** F-01 nay `Verified`. Header, secret, dependency đều đạt. Còn F-07, F-13.
- **Pha 6 — Hiệu năng.** Chạy được lần đầu. F-11 là nút thắt rõ ràng nhất. Không có N+1: `/api/config` là một truy vấn đơn. Load test `Not assessed` — không load-test production.
- **Pha 7 — Vận hành.** F-04b chặn phát hành. F-08 không có CI. Test 57/57 xanh, ổn định, ~580ms.

## 6. Số liệu đo được

| Nhóm | Số đo |
|---|---|
| Test | 57 pass / 0 fail, ~580ms, ổn định qua nhiều lần chạy |
| Đột biến phân quyền | 57 pass — không phát hiện |
| Đột biến đối chứng nghiệp vụ | 54 pass / 2 fail — phát hiện được |
| `/api/health` production | p50 418ms · p95 772ms |
| `/api/config` production | p50 1189ms · p95 1220ms · max 1584ms |
| `/api/config` local | p50 1185ms · p95 1304ms |
| `SELECT 1` tới Supabase | p50 588ms |
| Tải về | index 13KB · css 27KB · app.js 159KB · admin.js 46KB · storage.js 20KB · docx **725KB** · xlsx ~196KB |
| Trình duyệt | DOMContentLoaded 133ms · load 173ms (localhost, cache ấm) |
| CSS | 785 dòng · 113 màu trực tiếp · 61 màu riêng · 13 biến · 8 breakpoint |
| Form | 45 control · 23 có label chuẩn · **21 thiếu tên truy cập** |

## 7. Lệnh đã chạy

```
git rev-parse --short HEAD                      # fac9099
node --version                                  # v20.17.0
npm test                                        # 57 pass / 0 fail
npm audit --omit=dev                            # 0 vulnerabilities
node server.js                                  # khởi động OK
curl -s -o /dev/null -w '%{http_code}' -X VERB http://localhost:3000/<route>   # 12 route admin
curl -s -D - "http://localhost:3000/api/submission-status?mssv=..."            # đọc X-RateLimit-Remaining
curl -sI https://sv5t-hosobanmem-0ggl.onrender.com/
grep -c "check (" prisma/migrations/*/migration.sql
```

Trong trình duyệt (viewport 360×780): duyệt cả 9 bước, đo `documentElement.scrollWidth`, `getComputedStyle().fontSize`, `el.labels`, `getBoundingClientRect()`, `performance.getEntriesByType('resource')`.

## 8. Ma trận phủ

| Pha | Miền | Kết quả | Bằng chứng | Ghi chú |
|---|---|---|---|---|
| 0 | Kiến trúc: boundary & hướng phụ thuộc | Pass | Verified | Không build step; phụ thuộc một chiều `main.js → app/admin/storage → shared-rules` |
| 0 | Bản đồ luồng dữ liệu | Pass | Verified | Vẽ ở mục 3 |
| 1 | Schema khớp repo & ràng buộc | Partial | Static evidence | Unique đạt; thiếu CHECK (F-03) |
| 1 | Kiểu dữ liệu | Pass | Static evidence | Không có tiền; tiếng Việt lưu UTF-8, hiển thị đúng |
| 1 | Transaction & concurrency | Pass | Static evidence | Serializable + retry P2034 |
| 1 | Migration & toàn vẹn dữ liệu | Partial | Verified | 0 bước phá huỷ; không có đường lui (F-04a) |
| 1 | RLS / cô lập tenant | Not applicable | — | Đơn tenant; client không truy cập DB trực tiếp |
| 2 | Tính đủ chức năng | Pass | Verified | 9 bước đi hết, không lỗi console |
| 2 | Luồng nghiệp vụ chính | Partial | Verified | Đã kiểm luồng đọc và đăng nhập; **không** chạy luồng gửi hồ sơ thật |
| 2 | Edge case & bất biến | Pass | Verified | 16/16 tổ hợp luật khớp sau F-14 |
| 2 | Authorization phía server | Pass | Verified | 12/12 route |
| 2 | Hợp đồng API | Pass | Verified | Mã lỗi nhất quán 400/401/404/429 |
| 3 | Hành vi UI 4 trạng thái | Partial | Verified | Empty và success đạt; loading/error chưa dựng được vì không tạo lỗi trên production |
| 3 | Nhất quán phản hồi giữa màn hình | Pass | Verified | Điều hướng và `appAlert` dùng chung |
| 3 | Đồng bộ design token & ngôn từ | Fail | Verified | F-06 |
| 4 | Responsive & mobile | **Fail** | Verified | F-09 tràn ngang bước 9 |
| 4 | Accessibility | Fail | Verified | F-10; vùng chạm 38px đạt AA |
| 4 | i18n & định dạng địa phương | Pass | Verified | `lang="vi"`, ngày dùng `toLocaleTimeString('vi-VN')` |
| 4 | Hiệu năng frontend | Partial | Verified | F-12 |
| 5 | Xác thực & phiên | Pass | Verified | Gồm cả thu hồi sau logout |
| 5 | Biên injection | Pass | Static evidence | Prisma tham số hoá; không nối chuỗi SQL |
| 5 | Secret & cấu hình | Pass | Verified | Không rò ra client |
| 5 | Upload/download & rate limit | Fail | Verified | F-01 |
| 5 | Header, CORS, CSRF | Partial | Verified | Đạt trừ F-13; CSRF chặn bằng `SameSite=Strict` |
| 5 | Dependency & CVE | Pass | Verified | 0 vulnerabilities |
| 5 | Quyền riêng tư & log | Partial | Static evidence | Log không in dữ liệu cá nhân; chưa kiểm log phía Render |
| 6 | Baseline & điều kiện đo | Pass | Verified | Mục 6 |
| 6 | Query plan & N+1 | Pass | Verified | `/api/config` một truy vấn; chi phí là RTT |
| 6 | Cache | Fail | Verified | F-11 — `no-store`, không cache tiến trình |
| 6 | Đồng thời & giới hạn tài nguyên | Not assessed | — | Không load-test production |
| 6 | Load test & phân bố độ trễ | Not assessed | — | Như trên |
| 7 | Chiến lược & chất lượng test | Fail | Verified | F-02 |
| 7 | Build & môi trường | Pass | Verified | Không build step; server khởi động sạch |
| 7 | CI gate | Fail | Verified | F-08 |
| 7 | Triển khai & rollback | Partial | Verified | Render tự deploy theo `main`; rollback code được, rollback dữ liệu thì không |
| 7 | Backup & phục hồi | **Not assessed** | — | **F-04b — chặn phát hành** |
| 7 | Monitoring & logging | Partial | Static evidence | Có `/api/health`; chưa có cảnh báo |
| 7 | Khả năng bảo trì & hợp đồng API | Pass | Verified | Luật dùng chung một nguồn, đã có test khoá |

## 9. Rủi ro tồn dư

1. **Mất dữ liệu không lấy lại được** cho tới khi phục hồi thử backup (F-04b).
2. **Danh sách sinh viên nộp hồ sơ có thể bị dò sạch trong ~6,4 giờ** cho tới khi sửa F-01.
3. **Một refactor phân quyền có thể mở toang khu quản trị mà không gì báo động** cho tới khi có F-02 và F-08.
