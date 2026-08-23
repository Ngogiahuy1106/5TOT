# Báo cáo audit — SV5T Hồ sơ Sinh viên 5 tốt — 22/08/2026

## 1. Tóm tắt điều hành

**Quyết định: NO-GO** — gỡ được lên `CONDITIONAL GO` chỉ bằng một việc, xem ngay dưới đây.

> **Đính chính:** bản đầu của báo cáo này ghi `CONDITIONAL GO`. Sai. Cổng phát hành §5 nêu rõ `NO-GO` khi *"migration không có đường quay lui **và** không có backup đã kiểm chứng phục hồi"* — SV5T đúng cả hai vế. Tôi đã hạ F-04 xuống `Medium` với lý do "không xác minh được tình trạng backup Supabase", nhưng §1 quy định không có bằng chứng thì ghi `Not assessed`, không được suy ra là đạt. Điều kiện cổng thắng phán đoán mức độ.
>
> **Cách gỡ:** thực hiện một lần phục hồi thử từ backup Supabase (khoảng 1 giờ), ghi lại thời gian phục hồi. Làm xong là thành `CONDITIONAL GO` với hai finding High còn lại.

- **Chất lượng mã nguồn tốt.** Đây là codebase được làm cẩn thận hơn hẳn mặt bằng chung: CSP đầy đủ, HSTS, cookie `HttpOnly`/`SameSite=Strict`/`Secure`, phiên lưu dạng hash trong DB, transaction mức `Serializable` có retry, rate limit nhiều tầng, timeout cho gọi Storage, hàng đợi dọn file mồ côi.
- **2 finding High phải xử lý trước phát hành:** khoá rate limit của endpoint tra cứu công khai bị đặt sai chiều nên không chặn được việc dò MSSV (F-01); và toàn bộ tầng phân quyền không có một test nào bảo vệ (F-02).
- **Không phải vì code tệ.** Cổng chặn ở khả năng *phục hồi khi hỏng*, không phải ở chất lượng mã nguồn.
- **Độ tin cậy: Thấp–Trung bình.** Không chạy được server (cần DB Supabase thật) và không render được giao diện, nên phần lớn kết luận dừng ở `Static evidence`. Pha 6 (hiệu năng) `Not assessed` hoàn toàn.

## 2. Findings

### [F-01] Endpoint tra cứu công khai không chặn được việc dò MSSV — **High**

- **Pha:** 5 · **Bằng chứng:** `Static evidence` (đọc code, không gửi được request thật)
- **Vị trí:** `server.js:153` (khai báo `lookupLimit`), `server.js:1071` (route), `studentKeyOf`

```js
const lookupLimit = rateLimit({ windowMs:5*60_000, max:120, prefix:'lookup',
  keyOf: req => `${clientIpHash(req)}:${studentKeyOf(req)}`, label:'tra cứu' });

function studentKeyOf(req){
  const mssv = String(req.body?.mssv || req.query?.mssv || '').trim();
  return mssv ? shortHash(mssv) : 'no-id';
}
```

- **Vấn đề:** khoá hạn mức là `lookup:<hash IP>:<hash MSSV>`. Nghĩa là mỗi **cặp** (IP, MSSV) có riêng 120 lượt/5 phút. Kẻ dò lần lượt qua các MSSV khác nhau nhận một hạn mức mới tinh cho **từng** MSSV — bộ giới hạn này không hề cản trở việc dò. Trần duy nhất còn lại là `globalApiLimit` 600 request/phút mỗi IP, tức khoảng 36.000 lượt dò mỗi giờ từ một IP.
- **Rò rỉ gì:** `GET /api/submission-status?mssv=X` trả 404 nếu không có hồ sơ, 200 kèm `status` và `updatedAt` nếu có. Dò được toàn bộ danh sách sinh viên đã nộp hồ sơ SV5T và kết quả duyệt của từng người. MSSV là dãy có quy luật nên không gian dò rất nhỏ.
- **Tác động:** lộ dữ liệu cá nhân của sinh viên định danh được (ai ứng tuyển, ai bị "Cần bổ sung").
- **Nguyên nhân gốc:** đưa MSSV vào khoá hạn mức là đúng cho endpoint **gửi hồ sơ** (chặn một sinh viên spam), nhưng sai cho endpoint **tra cứu** — ở đây MSSV chính là thứ kẻ tấn công thay đổi.
- **Hướng sửa:** tách thành hai bộ đếm độc lập cho lookup: một khoá thuần theo IP (hạn mức chặt, ví dụ 30 lượt/5 phút) và giữ thêm khoá theo (IP, MSSV) nếu muốn. Vượt **bất kỳ** cái nào cũng trả 429. Cân nhắc trả cùng một phản hồi cho "không tìm thấy" và "chưa được phép xem" để bớt tín hiệu.
- **Ghi chú:** `POST /api/submissions/review` (`server.js:899`) cũng tra `findUnique({where:{mssv}})` từ đầu vào chưa xác thực và trả kết quả khác nhau tuỳ hồ sơ có tồn tại hay không — cùng một họ vấn đề, sửa kèm.
- **Trạng thái:** Open

### [F-02] Tầng phân quyền không có test nào bảo vệ — **High**

- **Pha:** 2 và 7 · **Bằng chứng:** **`Verified`** — đây là finding duy nhất chứng minh được bằng thực nghiệm
- **Phép thử đột biến đã chạy:**

| Thay đổi cố ý | Kết quả `npm test` |
|---|---|
| Vô hiệu hoá kiểm phiên trong `requireAdmin` (`server.js:83`) | **41 pass / 0 fail** ❌ |
| *(đối chứng)* Hạ ngưỡng DRL từ 80 xuống 0 trong `shared-rules.js:44` | **39 pass / 2 fail** ✅ |

- **Diễn giải:** bộ test bảo vệ **quy tắc nghiệp vụ** rất tốt — phá ngưỡng DRL là đỏ ngay. Nhưng gỡ sạch tầng xác thực quản trị thì **không một test nào đỏ**. Toàn bộ 11 route `requireAdmin` đang không được bảo vệ trước hồi quy.
- **Vì sao xảy ra:** 41 test đều là unit test trên `shared-rules.js` và trên khối validate được **trích ra từ mã nguồn dưới dạng chuỗi văn bản** (`test/server-validation.test.js:8` dùng `source.slice(...)`, `test/activity-catalog.test.js:159` dùng `serverSource.indexOf(...)`). Không có test nào dựng app Express và gửi request.
- **Tác động:** một lần refactor `requireAdmin` hay đổi thứ tự middleware có thể mở toang khu quản trị mà CI (nếu có) vẫn xanh.
- **Hướng sửa:** thêm test HTTP cho ma trận quyền, tối thiểu 3 ca cho mỗi route quản trị: không cookie → 401; cookie sai/hết hạn → 401; cookie hợp lệ → 200. Dùng `node:test` với server khởi động trên cổng ngẫu nhiên và Prisma trỏ tới DB test, hoặc thay tầng Prisma bằng bản giả.
- **Cả hai thay đổi thử nghiệm đã được hoàn tác và đối chiếu `diff` xác nhận file trở về nguyên trạng.**
- **Trạng thái:** Open

### [F-03] Không có ràng buộc CHECK; `status` chỉ được ràng buộc ở tầng ứng dụng — **Medium**

- **Pha:** 1 · **Bằng chứng:** `Static evidence`
- **Vị trí:** `prisma/schema.prisma:31`, `server.js:14`
- **Vấn đề:** `status String @default("Chưa kiểm tra")` không có ràng buộc. Tập giá trị hợp lệ chỉ tồn tại trong `ALLOWED_STATUSES` ở `server.js`. Quét toàn bộ 7 migration: chỉ có PRIMARY KEY và FOREIGN KEY, **không có CHECK constraint nào**.
- **Tác động:** một lệnh sửa tay trên Supabase, một script nhập liệu, hay một phiên bản ứng dụng cũ đều có thể ghi trạng thái rác. Giao diện sẽ hiển thị giá trị không nằm trong bộ lọc và bản ghi đó thành vô hình trong danh sách theo trạng thái.
- **Hướng sửa:** thêm `CHECK (status IN ('Chưa kiểm tra','Đã duyệt','Cần bổ sung'))` cho `Submission` và `SubmissionReview` qua migration thủ công (Prisma không sinh CHECK).
- **Trạng thái:** Open

### [F-04] Migration không có đường quay lui, backup chưa phục hồi thử — **Blocker**

- **Pha:** 1 và 7 · **Bằng chứng:** `Static evidence`
- **Vị trí:** `prisma/migrations/` — 7 thư mục, mỗi thư mục chỉ có `migration.sql` đi tiến
- **Vấn đề:** Prisma không sinh down migration và dự án cũng không tự viết. Đường quay lui hiện tại là phục hồi backup — mà không có bằng chứng nào cho thấy đã từng phục hồi thử.
- **Tác động:** deploy hỏng giữa chừng thì không có bước lùi xác định. Đây là điều kiện `NO-GO` số 4 trong cổng phát hành `methodology-and-report.md` §5, và là lý do duy nhất khiến bản phát hành này bị chặn.
- **Hướng sửa:** viết `down.sql` cho các migration đổi cấu trúc, và thực hiện một lần phục hồi thử từ backup Supabase, ghi lại thời gian phục hồi.
- **Trạng thái:** Open

### [F-05] Ô nhập liệu dùng `font-size:14px` — iOS tự phóng to trang — **Medium**

- **Pha:** 4 · **Bằng chứng:** `Static evidence` (không render được trên thiết bị thật)
- **Vị trí:** `public/css/style.css:127`

```css
input[type=text], input[type=number], select{ ...; font-size:14px; ... }
```

- **Vấn đề:** Safari trên iOS tự phóng to trang khi focus vào ô nhập có cỡ chữ dưới 16px. Đây là ứng dụng toàn form, sinh viên chủ yếu điền trên điện thoại, nên gặp phải ở gần như mọi trường.
- **Hướng sửa:** nâng lên `16px` cho ô nhập ở khổ màn hình nhỏ. Nếu muốn giữ 14px trên desktop thì đặt 16px trong media query cho màn hình hẹp.
- **Trạng thái:** Open

### [F-06] Drift design token — **Low**

- **Pha:** 3 · **Bằng chứng:** `Static evidence`
- **Số đo trên `public/css/style.css` (679 dòng):** 104 lần viết màu trực tiếp, **61 giá trị màu riêng biệt**, trong khi chỉ có **13 biến CSS** được khai báo. 9 khối `@media` dùng **6 giá trị breakpoint khác nhau**: 600, 640, 700, 760, 800, 900px.
- **Tác động:** đổi màu thương hiệu phải sửa tay nhiều chỗ và sẽ sót; 6 mốc breakpoint tuỳ hứng làm bố cục khó dự đoán ở kích thước trung gian.
- **Hướng sửa:** gom về bộ token đã có; rút breakpoint xuống 3 mốc.
- **Trạng thái:** Open

### [F-07] So sánh mật khẩu rò rỉ độ dài qua thời gian — **Low**

- **Pha:** 5 · **Bằng chứng:** `Static evidence`
- **Vị trí:** `server.js:431`

```js
const a=Buffer.from(password), b=Buffer.from(ADMIN_PASSWORD);
return a.length===b.length && crypto.timingSafeEqual(a,b);
```

- **Vấn đề:** phép so sánh độ dài chạy trước và đoản mạch, nên `timingSafeEqual` chỉ chống rò rỉ **nội dung**, không chống rò rỉ **độ dài**. Ý định dùng so sánh an toàn là đúng; chỉ chi tiết này chưa kín.
- **Tác động:** thấp — kẻ tấn công biết được độ dài mật khẩu quản trị. Đã có khoá 429 sau số lần sai nhất định, nên khai thác khó.
- **Hướng sửa:** băm cả hai bên về độ dài cố định rồi mới so: `timingSafeEqual(sha256(password), sha256(ADMIN_PASSWORD))`.
- **Trạng thái:** Open

### [F-08] Không có CI — **Medium**

- **Pha:** 7 · **Bằng chứng:** `Verified` (không tồn tại `.github/`, `.gitlab-ci.yml`, `Jenkinsfile`)
- **Vấn đề:** có 41 test chạy tốt nhưng không có gì bắt buộc chúng phải chạy trước khi triển khai. Kết hợp với F-02, nghĩa là một thay đổi phá phân quyền vừa không bị test bắt, vừa không có cổng nào chặn.
- **Hướng sửa:** một workflow tối thiểu chạy `npm ci && npm test` trên mỗi lần đẩy code.
- **Trạng thái:** Open

## 3. Những gì đã kiểm và **đạt**

Ghi lại để lần audit sau không phải làm lại (xem `audit-state.md`):

| Hạng mục | Kết quả | Chi tiết |
|---|---|---|
| Header bảo mật | Pass | CSP đầy đủ có `frame-ancestors 'none'`, `object-src 'none'`, `base-uri`; HSTS ở production; `nosniff`; `X-Frame-Options: DENY`; `Referrer-Policy`; `Permissions-Policy` |
| Script bên ngoài | Pass | Chỉ 1 script CDN (xlsx), có `integrity` SRI + `crossorigin` + `referrerpolicy`; docx đã vendor về local |
| Cookie phiên | Pass | `HttpOnly`, `SameSite=Strict`, `Secure` ở production, `Max-Age` 8 giờ |
| Lưu phiên | Pass | Chỉ lưu **hash** token trong DB, token 32 byte ngẫu nhiên từ `crypto`, có dọn phiên hết hạn |
| Đăng xuất | Pass | Xoá bản ghi phiên phía server, không chỉ xoá cookie |
| Đăng nhập lại | Pass | Thu hồi phiên cũ trước khi cấp phiên mới |
| Chống dò mật khẩu | Pass | Chỉ đếm lần **sai**, khoá 429 có `Retry-After`, xoá bộ đếm khi đăng nhập đúng |
| Secret | Pass | `.env` nằm trong `.gitignore`; không có secret nào trong `public/`; `SUPABASE_SERVICE_ROLE_KEY` chỉ dùng ở server; `.env.example` khớp đủ 6 key với `.env` |
| Transaction | Pass | Mức `Serializable` kèm retry `P2034` — chặt hơn mặt bằng chung rõ rệt |
| Ràng buộc unique | Pass | `@@unique([mssv])` bảo đảm bất biến "một MSSV một hồ sơ" ở tầng DB |
| Khoá ngoại | Pass | `onDelete: Cascade` cho review, `SetNull` cho revision — lựa chọn hợp nghiệp vụ |
| SQL injection | Pass | Toàn bộ đi qua Prisma; ba chỗ raw đều dùng `Prisma.sql` tagged template (đã soi tay) |
| Ảnh minh chứng | Pass | Không nhúng base64 vào DB; lưu Storage; truy cập qua signed URL 15 phút; có hàng đợi dọn file mồ côi khi transaction hỏng |
| Gọi Storage | Pass | Có `AbortController` timeout 15s |
| Rò rỉ tài nguyên | Pass | `unref()` trên mọi `setInterval`/`setTimeout` |
| Health check | Pass | Phân biệt DB và Storage, có cache 5s, không lộ chi tiết nhạy cảm |
| Viewport & ngôn ngữ | Pass | `width=device-width`, **không** có `user-scalable=no`; `<html lang="vi">` |
| Test quy tắc nghiệp vụ | Pass | Đã chứng minh bằng phép thử đột biến (xem F-02) |

## 4. Ma trận phủ (thu gọn theo phạm vi)

| Pha | Miền | Kết quả |
|---|---|---|
| 1 | Schema, kiểu, quan hệ, unique | Pass |
| 1 | Ràng buộc CHECK | **Fail** (F-03) |
| 1 | Transaction & concurrency | Pass |
| 1 | Migration tiến / lui | **Partial** (F-04) |
| 1 | RLS / cô lập tenant | Not applicable — một tenant, chỉ server truy cập DB |
| 2 | Tính đủ chức năng | Pass |
| 2 | Phân quyền phía server | Pass *(Static evidence)* |
| 2 | Phân quyền có test bảo vệ | **Fail** (F-02) |
| 3 | Đồng bộ design token | **Partial** (F-06) |
| 3 | Hành vi UI (4 trạng thái) | Not assessed — không render được |
| 4 | Ô nhập trên mobile | **Fail** (F-05) |
| 4 | Viewport, `lang`, không chặn zoom | Pass |
| 4 | Tràn ngang, tương phản, bàn phím | Not assessed — không render được |
| 5 | Xác thực & phiên | Pass |
| 5 | Rate limit | **Fail** (F-01) |
| 5 | Injection | Pass |
| 5 | Secret & cấu hình | Pass |
| 5 | Header, CSP | Pass |
| 5 | So sánh mật khẩu | **Partial** (F-07) |
| 6 | Toàn bộ hiệu năng | **Not assessed** |
| 7 | CI gate | **Fail** (F-08) |
| 7 | Chiến lược test | **Partial** (F-02) |
| 7 | Backup & phục hồi | Not assessed — do Supabase quản lý, không kiểm được |

## 5. Lệnh đã chạy

```
node --version                      → v20.17.0
npm test                            → 41 pass / 0 fail, 481ms
npm test  (sau khi vô hiệu requireAdmin)   → 41 pass / 0 fail
npm test  (sau khi hạ ngưỡng DRL về 0)     → 39 pass / 2 fail
python collect_web_evidence.py <repo>      → 22 file, 14 route server, P1=0 P2=0 P3=3
```

## 6. Thứ tự khắc phục

1. **F-04** phục hồi thử một lần từ backup Supabase — **đây là thứ duy nhất đang chặn phát hành**, khoảng 1 giờ.
2. **F-01** khoá rate limit tra cứu — sửa vài dòng, chặn rò rỉ dữ liệu cá nhân.
3. **F-02** test phân quyền — tốn công nhất nhưng đáng nhất; chặn cả một lớp hồi quy.
4. **F-08** CI chạy `npm test` — nửa giờ, và làm cho F-02 có tác dụng thật.
5. **F-05** cỡ chữ ô nhập — sửa một dòng CSS.
6. **F-03** ràng buộc CHECK — một migration thủ công.
7. Viết `down.sql` cho các migration đổi cấu trúc.
8. **F-06**, **F-07** — nợ kỹ thuật, lên lịch sau.

## 7. Rủi ro tồn dư và giám sát sau phát hành

- Theo dõi số lượt gọi `/api/submission-status` theo IP. Tăng đột biến = đang bị dò.
- Sau khi sửa F-01, theo dõi tỷ lệ 429 trên endpoint đó — tăng bất thường nghĩa là hạn mức mới siết quá tay với người dùng thật.
- Theo dõi độ sâu hàng đợi `StorageCleanupJob`. Tăng đều nghĩa là worker dọn ảnh đang hỏng.
- Pha 6 chưa chạy: chưa biết hệ thống chịu được bao nhiêu hồ sơ gửi đồng thời vào giờ chót hạn nộp — đó là kịch bản tải thật của ứng dụng này và là rủi ro tồn dư lớn nhất chưa được đo.
