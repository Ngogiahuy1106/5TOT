# Trạng thái audit — SV5T Hồ sơ Sinh viên 5 tốt

Mốc audit: commit `fac9099` (+ thay đổi đang làm việc trên `public/js/app.js`, `public/js/shared-rules.js`, `test/shared-rules.test.js`)
Chế độ: **audit lại toàn phần** (pha 0–7) trên nền lần audit 22/08/2026, có sửa lỗi được cho phép
Lần cập nhật cuối: 23/08/2026
Bậc mức độ quan trọng: **B — Nghiệp vụ** (chốt ở pha 0, xem lại tại cổng pha 1: **giữ nguyên**)

> Lý do bậc B: hệ thống giữ dữ liệu cá nhân của hàng trăm sinh viên định danh được (họ tên, MSSV, ngày sinh, điện thoại, email) và là nguồn quyết định xét danh hiệu thật. Mất dữ liệu gây thiệt hại đáng kể nhưng bù được bằng cách yêu cầu nộp lại — chưa tới bậc A.

## Ba vật cản của lần audit trước **đã được gỡ**

| Vật cản 22/08 | Tình trạng 23/08 |
|---|---|
| Không chạy được server (thiếu `DATABASE_URL`) | **Gỡ** — `.env` đã có, server chạy được, đã gửi request thật |
| Không render được giao diện | **Gỡ** — đã render và đo ở 360px trên cả 9 bước |
| Repo không có git | **Gỡ** — đã có git, mốc `fac9099` |

Nhờ đó phần lớn kết luận pha 2/4/5 lên được `Verified`, và pha 6 chạy được lần đầu.

## Tiến độ pha

| Pha | Tên | Trạng thái | Cổng |
|---|---|---|---|
| 0 | Recon | Xong | ✅ route map, ma trận vai trò, bản đồ luồng dữ liệu, bậc B |
| 1 | Nền dữ liệu | Xong | ⚠️ Medium F-03 (không có CHECK), Medium F-04a (migration không có đường lui) |
| 2 | Chức năng & phân quyền | Xong | ✅ ma trận quyền `Verified` 12/12 · ⚠️ High F-02 (không có test bảo vệ) |
| 3 | Giao diện: hành vi & đồng bộ | **Xong** (trước là Một phần) | ✅ điều hướng nhất quán · ⚠️ Low F-06 (drift token) |
| 4 | Giao diện: responsive & a11y | **Xong** (trước là Một phần) | ❌ **Fail** — tràn ngang bước 9 (F-09); Medium F-05, F-10 |
| 5 | Bảo mật ứng dụng | Xong | ⚠️ High F-01 (**nay `Verified`**), Low F-07, Low F-13 |
| 6 | Hiệu năng | **Xong** (trước là Not assessed) | ⚠️ Medium F-11, F-12 · load test `Not assessed` |
| 7 | Vận hành & bảo trì | Xong | ❌ **Blocker F-04b** — backup chưa phục hồi thử · Medium F-08 (không CI) |

## Baseline đã chạy (23/08/2026)

| Lệnh | Kết quả |
|---|---|
| `git rev-parse --short HEAD` | `fac9099` |
| `node --version` | v20.17.0 |
| `npm test` | **57 pass / 0 fail**, ~580ms, ổn định (56 trước khi thêm 1 test hồi quy) |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `node server.js` | Khởi động OK, kết nối bucket R2 OK |
| Phép thử đột biến `requireAdmin` | **57 pass** ❌ (không test nào đỏ) — đã hoàn tác, `git status` sạch |
| Phép thử đối chứng ngưỡng DRL | **54 pass / 2 fail** ✅ (bộ test có phản ứng) — đã hoàn tác |

## Số đo giữ lại cho lần sau

| Hạng mục | Số đo 23/08 |
|---|---|
| Ma trận quyền không cookie | 12/12 route admin → 401 |
| Cookie giả / rỗng / random 64 byte | 3/3 → 401 |
| Phiên hợp lệ | 3/3 route → 200; sau logout cùng cookie → 401 |
| `X-RateLimit-Remaining` tra cứu | cùng MSSV 119→118→117; **đổi MSSV reset về 119** |
| Không gian MSSV dò được | ~230.000 → quét hết trong **6,4 giờ** từ một IP |
| Tràn ngang 360px | bước 1–8 sạch; **bước 9 `scrollWidth` 440 > 360** |
| Cỡ chữ ô nhập | 14px (9/9 ô bước 1) |
| Ô nhập thiếu tên truy cập | **21/45** trên cả 9 bước |
| `/api/config` | p50 **1189ms** (production), 1185ms (local); `SELECT 1` thuần = 588ms |
| Tải về | app.js 159KB, admin.js 46KB, **docx 725KB**, xlsx ~196KB (gzip, CDN) |
| CSS | 785 dòng · 113 lần viết màu trực tiếp · 61 màu riêng biệt · 13 biến · 8 breakpoint |
| CHECK constraint trong 7 migration | **0** (3 FK, 3 unique index, **0 bước phá huỷ**) |

## Hạng mục giữ kết quả cũ (cho lần audit lại)

| Hạng mục | Kết quả | Còn hiệu lực khi |
|---|---|---|
| Ràng buộc unique `mssv` | Pass | Không đổi `prisma/schema.prisma` |
| Header bảo mật (CSP/XFO/nosniff/Referrer/Permissions) | Pass `Verified` | Không sửa middleware đầu `server.js` |
| HSTS (chỉ bật ở production) | Pass `Verified` trên production | Không sửa `server.js:46` |
| Cookie phiên HttpOnly + thu hồi phía server | Pass `Verified` | Không sửa `setAdminSessionCookie`, `getAdminSession` |
| Transaction Serializable + retry P2034 | Pass `Static evidence` | Không sửa `serializableTransaction` |
| Không có secret trong bundle client | Pass `Verified` | Không thêm biến vào `public/` |
| Luật dùng chung client/server | Pass `Verified` (16/16 ca khớp) | Không sửa `GROUP_VALIDATION_RULES` mà quên `evaluateGroupState` |

## Đã khắc phục ngày 23/08/2026 (sau khi báo cáo trên được viết)

| Finding | Trạng thái mới | Kiểm chứng |
|---|---|---|
| F-01 rate limit tra cứu | **Fixed and verified** | Đếm riêng số MSSV *khác nhau* tra ra "không tìm thấy" theo IP, 25 lượt/15 phút. Thử thật: 20 MSSV đầu trả 404, từ MSSV thứ 21 trả 429 |
| F-02 không có test phân quyền | **Fixed and verified** | `test/authorization.test.js` phủ 12/12 route bằng request thật. Phép thử đột biến gỡ `requireAdmin` giờ làm **2 test đỏ** (trước là 0) |
| F-05 ô nhập 14px | **Fixed and verified** | Đo lại ở 360px: mọi ô nhập là **16px** |
| F-07 so sánh mật khẩu | **Fixed and verified** | Băm SHA-256 cả hai vế trước `timingSafeEqual`, không còn đoản mạch theo độ dài |
| F-08 không có CI | **Fixed and verified** | `.github/workflows/ci.yml` chạy `npm ci`, `npm test`, `npm audit` |
| F-09 tràn ngang bước 9 | **Fixed and verified** | `.preview-doc` có `overflow-x:auto`. Đo lại: `scrollWidth` 360 = viewport 360, trang hết trượt ngang |
| F-10 ô nhập thiếu tên | **Fixed and verified** | `linkFieldLabels()` nối nhãn sau mỗi lần render + `aria-label` cho 5 ô ngoài khuôn `.field`. Còn thiếu: **21 → 0** |
| F-11 `/api/config` chậm | **Mitigated** | Cache tiến trình TTL 30s + xoá khi ghi. Đo thật: **1185ms → 528ms**. Không cache `getSubmissionWindow()` vì đó là cổng chặn nộp hồ sơ |
| F-12 tải sẵn 921KB | **Fixed and verified** | `ensureLibrary()` nạp docx/xlsx khi bấm nút. Đo lại: `window.docx` và `window.XLSX` đều **chưa nạp** lúc vào trang |
| F-13 `X-Powered-By` | **Fixed and verified** | `app.disable('x-powered-by')`; `curl -sI` không còn header |
| F-14 lệch luật client/server | **Fixed and verified** | 16/16 tổ hợp khớp, có test hồi quy |

`npm test`: **61 pass / 0 fail** (từ 57).

## Phát sinh trong lúc sửa

- **Nút thắt hiệu năng mới lộ ra.** Sau khi cache config, `/api/config` còn ~528ms — phần còn lại là `globalApiLimit` ghi bộ đếm xuống Postgres trên **mọi** request `/api`. Đây giờ là chi phí lớn nhất mỗi lượt gọi. Chưa sửa: kho hạn mức cũng là lớp bảo mật, đổi sang bộ nhớ tiến trình cần cân nhắc riêng (nhiều instance sẽ đếm lệch).
- **Lịch sử migration bị lệch.** Database ghi nhận `20260819000000_init` không có trong repo. Vì vậy migration của F-03 **không** đặt vào `prisma/migrations/` (có thể làm `prisma migrate deploy` báo drift và hỏng cả lần deploy), mà để ở `prisma/pending/` kèm hướng dẫn áp dụng tay.

## Việc tiếp theo, theo thứ tự

1. **F-04b: phục hồi thử backup Supabase một lần — đang chặn phát hành.** (~1 giờ, chỉ chủ tài khoản làm được)
2. **F-03:** áp dụng `prisma/pending/20260823000000_status_check_constraint.sql` bằng tay, sau khi kiểm `npx prisma migrate status`.
3. Xem lại lịch sử migration lệch giữa repo và database.
4. F-06: gom màu về bộ token, rút breakpoint xuống 3 mốc.
5. Cân nhắc bộ đếm rate limit trong bộ nhớ để bỏ nốt ~528ms mỗi request.
