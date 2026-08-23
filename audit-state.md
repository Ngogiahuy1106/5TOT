# Trạng thái audit — SV5T Hồ sơ Sinh viên 5 tốt

Mốc audit: cây làm việc ngày 22/08/2026 (repo không có git — dùng ngày làm mốc)
Chế độ: full (pha 0–7), chỉ đọc, không sửa file nguồn
Lần cập nhật cuối: 22/08/2026 — đã chạy hết 7 pha ở mức khả thi

## Tiến độ pha

| Pha | Tên | Trạng thái | Cổng |
|---|---|---|---|
| 0 | Recon | Xong | ✅ |
| 1 | Nền dữ liệu | Xong | ❌ Blocker F-04 (backup chưa phục hồi thử), Medium F-03 |
| 2 | Chức năng & phân quyền | Xong | ⚠️ 1 High (F-02) |
| 3 | Giao diện: hành vi & đồng bộ | Một phần | ⚠️ 1 Low (F-06) — không render được UI |
| 4 | Giao diện: responsive & a11y | Một phần | ⚠️ 1 Medium (F-05) — không render được UI |
| 5 | Bảo mật ứng dụng | Xong | ⚠️ 1 High (F-01), 1 Low (F-07) |
| 6 | Hiệu năng | **Not assessed** | Không có dữ liệu cỡ thật, không chạy được server |
| 7 | Vận hành & bảo trì | Xong | ⚠️ 1 Medium (F-08) |

## Artifact pha 0

**Stack:** Express 4 + Prisma 5 + PostgreSQL (Supabase) + Supabase Storage. Lockfile `package-lock.json` → npm. Node ≥18 (chạy trên v20.17.0). Không có build step; frontend là HTML/CSS/JS thuần trong `public/`.

**Actor và vai trò:**

| Actor | Xác thực | Làm được gì |
|---|---|---|
| Sinh viên (ẩn danh) | không | Gửi hồ sơ, chấm thử, tra cứu trạng thái theo MSSV, đọc config |
| Ban SV5T (admin) | `ADMIN_PASSWORD` → cookie phiên | Toàn quyền: xem, sửa, xoá hồ sơ, xuất dữ liệu, quản lý reviewer, sửa config |
| Reviewer | **không phải tài khoản** — chỉ là tên chọn từ bảng `AdminReviewer` | Không có quyền riêng; mọi thao tác đi qua phiên admin |

**Route map:** 14 route API. Công khai 5: `GET /api/health`, `GET /api/config`, `POST /api/auth`, `GET /api/auth/session`, `POST /api/submissions/review`, `POST /api/submissions`, `GET /api/submission-status`. Còn lại đều có `requireAdmin`.

**Luồng quan trọng:**
1. Sinh viên gửi hồ sơ (ghi DB + upload ảnh lên Storage) — không hoàn tác được
2. Admin duyệt / đổi trạng thái hồ sơ
3. Admin xoá hồ sơ (kèm dọn ảnh)
4. Đăng nhập quản trị
5. Tra cứu trạng thái công khai theo MSSV
6. Xuất dữ liệu
7. Sửa cấu hình và danh mục hoạt động

**Bất biến:**
- Một MSSV chỉ có đúng một hồ sơ (`@@unique([mssv])` ✅)
- `status` chỉ nhận 3 giá trị: Chưa kiểm tra / Đã duyệt / Cần bổ sung
- Bản kiểm tra của Ban tách khỏi payload sinh viên gửi
- Ảnh minh chứng chỉ truy cập qua signed URL có hạn

**Bản đồ luồng dữ liệu:** trình duyệt → Express (`/api`) → Prisma → Postgres; ảnh: trình duyệt (base64) → Express → Supabase Storage REST (service role key, chỉ ở server) → trả về path lưu vào cột `evidenceImages`.

## Baseline đã chạy

| Lệnh | Kết quả |
|---|---|
| `node --version` | v20.17.0 |
| `npm test` | **41 pass / 0 fail**, 481ms, ổn định |
| `npm ci` | **Không chạy** — `node_modules` đã có sẵn, không muốn phá môi trường của người dùng |
| khởi động server | **Không chạy** — cần `DATABASE_URL` thật tới Supabase |

## Vật cản — ảnh hưởng tới độ tin cậy

- **Không chạy được server** (cần DB Supabase thật) → không gửi được request thật. Phần lớn kết luận pha 2 và 5 dừng ở `Static evidence`, không lên được `Verified`.
- **Không render được giao diện** → pha 3 và 4 chỉ đọc CSS/HTML, không đo được tràn ngang hay tương phản thật.
- **Không có dữ liệu cỡ production** → pha 6 để `Not assessed` hoàn toàn.
- **Repo không có git** → không có mốc commit, không so được lịch sử, không quét được secret trong lịch sử.

## Hạng mục giữ kết quả cũ (cho lần audit lại)

| Hạng mục | Kết quả | Còn hiệu lực khi |
|---|---|---|
| Ràng buộc unique `mssv` | Pass | Không đổi `prisma/schema.prisma` |
| Header bảo mật (CSP/HSTS/XFO) | Pass | Không sửa middleware đầu `server.js` |
| Cookie phiên (HttpOnly/SameSite/Secure) | Pass | Không sửa `setAdminSessionCookie` |
| Transaction Serializable + retry P2034 | Pass | Không sửa `serializableTransaction` |
| Bộ test quy tắc nghiệp vụ | Pass (đã kiểm bằng phép thử đột biến) | Không sửa `public/js/shared-rules.js` |

## Việc tiếp theo

1. **F-04: phục hồi thử backup Supabase một lần — đang chặn phát hành.**
2. Sửa F-01 (khoá rate limit tra cứu) — sửa một dòng.
3. Sửa F-02 (bổ sung test phân quyền) — cần dựng được test có HTTP.
4. Sau khi có môi trường chạy được: nâng pha 2 và 5 từ `Static evidence` lên `Verified`, và chạy pha 6.
