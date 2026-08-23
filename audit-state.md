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

## Việc tiếp theo, theo thứ tự

1. **F-04b: phục hồi thử backup Supabase một lần — đang chặn phát hành.** (~1 giờ)
2. F-01: tách bộ đếm rate limit tra cứu theo IP thuần — sửa vài dòng.
3. F-02 + F-08: thêm test HTTP cho ma trận quyền, rồi bật CI chạy `npm ci && npm test`.
4. F-09: bọc `.preview-doc` trong khung `overflow-x:auto`.
5. F-05, F-10: cỡ chữ ô nhập 16px ở màn hình hẹp; gắn `for`/`id` cho 21 ô nhập.
6. F-11: cache `/api/config` trong bộ nhớ tiến trình, xoá cache khi `PATCH /api/config`.
