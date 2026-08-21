# Audit cuối - 2026-08-11

Đã xử lý các lỗi/điểm yếu chính:

- Backend review là nguồn kiểm tra duy nhất trước khi gửi.
- Đồng bộ logic tiêu chí phụ, tiêu chí Hội nhập cũ HN-F và minh chứng.
- Admin xem hồ sơ không còn đọc IndexedDB/local draft của máy admin.
- Admin dùng session cookie HttpOnly/SameSite=Strict, 8 giờ; xóa vẫn nhập lại mật khẩu.
- Rate limit toàn bộ API + giới hạn riêng cho auth/review/submit/lookup/delete.
- So sánh mật khẩu dùng timingSafeEqual.
- Thời gian nhận hồ sơ được convert local <-> UTC đúng cách.
- Storage dùng path version ngẫu nhiên để không ghi đè ảnh cũ trước khi DB cập nhật; ảnh cũ được dọn sau khi DB thành công.
- Signed URL có cache ngắn hạn.
- HEIC/HEIF bị chặn sớm; chỉ JPG/PNG/WEBP.
- Tra cứu hồ sơ chỉ bằng MSSV; SĐT không bắt buộc.
- IELTS: K67 >= 5.5; K68/K69/K70 >= 5.0.
- TOEIC: K67 >= 500; K68 >= 450; K69 >= 400; K70 >= 350.
- Thêm cách đạt ngoại ngữ bằng điểm B trở lên ở học phần ngoại ngữ trong 2 kỳ chính.
- Excel import được lưu vào AppConfig.activityCatalog, không mất sau refresh/deploy.
- Phân nhóm Hội nhập khi import Excel dựa trên mô tả chuẩn/alias đã biết, không dùng từ khóa mơ hồ.
- Bước đã hoàn thành/đang bổ sung được tô theo dữ liệu thật, không theo việc đã từng mở bước.
- Popup native đã được thay bằng modal dùng chung trong code app.
- CSP bỏ unsafe-inline cho script; thêm HSTS production, Permissions-Policy, object-src/base-uri/form-action.

Kiểm tra đã chạy:

- `node --check` cho server.js và toàn bộ 4 file JS.
- Test logic ngưỡng IELTS/TOEIC K67-K70.
- Test tiêu chí sheet yêu cầu 2 hoạt động không được tính đạt khi mới có 1.
- Test Không đạt và Bổ sung sau được tính là đã khai báo nhưng không phải đã đạt.
- Đối chiếu ID tĩnh giữa index.html và admin/main JS.
- Đối chiếu cấu trúc Excel 6 cột và các mô tả Hội nhập trong file Danh_sach_hoat_dong.xlsx.
- Checksum `.env` giữ nguyên so với bản base.

Lưu ý còn lại: SheetJS vẫn tải từ CDN nhưng đã ghim phiên bản và có SRI. Thư viện `docx` 8.5.0 đã được lưu nội bộ tại `public/vendor`, kèm giấy phép MIT; CSP không còn cho phép jsDelivr.
# Cập nhật 2026-08-17 — quy trình kiểm tra độc lập

- Thêm `SubmissionReview` quan hệ 1-1 với `Submission`; status, note, flags và checkedAt không còn được ghi vào payload hồ sơ gốc.
- Admin chỉ được xem form sinh viên ở chế độ read-only; các nút có khả năng lưu/gửi đè bị ẩn và backend không có API admin cập nhật `data`/`evidenceImages`.
- Bảng kiểm riêng cho nội dung báo cáo và minh chứng; mục `Không đạt` hiển thị khóa, không thể tick.
- Đánh dấu minh chứng sai làm đỏ đúng dòng liên quan trong preview báo cáo của chế độ quản trị.
- Sinh viên gửi lại hồ sơ sẽ xóa review cũ, tránh giữ lỗi của phiên bản trước.
- Excel quản trị xuất nội dung lỗi dạng nhãn đọc được, ghi chú và thời điểm kiểm tra.
- TOEIC đã dịch ngưỡng đúng hàng: K70 350, K69 400, K68 450, K67 trở về trước 500.
- Bổ sung chứng chỉ/ngôn ngữ khác; tên và cấp độ bắt buộc, quy đổi do Ban đối chiếu thủ công.

## Cập nhật phụ lục ngoại ngữ

- Thay lựa chọn tự do bằng validation theo bảng tham chiếu: IELTS, VSTEP, Aptis, PEIC, PTE, Linguaskill, Cambridge, TOEIC 4 kỹ năng, TOEFL, JLPT, DELF/DALF, TCF, HSK+HSKK.
- Giữ TOEIC tổng của tiêu chí SV5T thành lựa chọn độc lập với TOEIC 4 kỹ năng trong phụ lục.
- Bổ sung đầy đủ phương án “Không có học phần Tiếng Anh nào dưới loại B trong 2 kỳ chính” vào form, báo cáo, danh sách minh chứng và validation backend.

## Hardening 2026-08-17 — đồng bộ luật và vận hành

- Dùng `public/js/shared-rules.js` cho luật DRL/GPA, không vi phạm, GDTC, trạng thái khai báo và invariant review ở cả frontend/backend.
- Chặn gửi nếu DRL/GPA không đạt, có vi phạm, hoặc chưa hoàn thành đủ 05 học phần GDTC và có điểm F.
- Tiêu chí phụ chỉ bắt buộc khai báo; không ép sinh viên chọn trước phương án bổ sung.
- Đưa `docx` 8.5.0 vào `public/vendor`, kèm giấy phép và bỏ jsDelivr khỏi CSP.
- Chốt quy đổi chứng chỉ khác theo hàng IELTS: K68–K70 dùng hàng IELTS 5.0; K67 trở về trước dùng hàng IELTS 5.5.
- Sửa backend không tính base64 ảnh vào giới hạn văn bản; thêm giới hạn riêng 8MB/ảnh và 16MB tổng ảnh.
- Nén ảnh thích ứng ở tối đa 1600px/chất lượng 0.82, tô nền trắng, xử lý lỗi đầy đủ và không giữ file gốc trong state.
- Tự lưu IndexedDB đồng bộ tăng dần theo key, không ghi lại toàn bộ ảnh không đổi mỗi 10 giây.
- Backend bắt buộc đủ toàn bộ nhóm tiêu chí, khóa MSSV K66–K70, khớp danh tính ngoài/trong JSON và chỉ nhận key ảnh hợp lệ.
- Backend từ chối `Đã duyệt` nếu còn flags; mỗi lần lưu review tạo revision.
- Session và rate-limit chuyển sang PostgreSQL; thêm migration `20260817120000_operational_hardening`.
- Ảnh được kiểm tra magic bytes, kích thước/pixel; dọn ảnh lỗi có hàng đợi retry.
- API nhạy cảm đặt `Cache-Control: no-store`; ghi chú nội bộ không còn trả ở API tra cứu công khai.
- Hoạt động mới dùng ID ổn định thay vì index để tránh gắn nhầm minh chứng khi xóa/sắp xếp.
- Sửa báo cáo để hiển thị cả chứng chỉ dạng cấp độ/4 kỹ năng; chặn chứng chỉ cấp cao có điểm trống/0 không hợp lệ.
- Thêm regression tests cho ngưỡng, điều kiện cứng, payload, flags, chứng chỉ và chữ ký ảnh.

## Cập nhật 2026-08-17 — concurrency, reviewer và vận hành

- State form của admin được snapshot trước khi xem hồ sơ và khôi phục khi quay lại/đăng xuất; dữ liệu sinh viên không còn bị lộ ra form sửa sau khi thoát chế độ chỉ đọc.
- Review PATCH bắt buộc gửi phiên bản `Submission.updatedAt`; từ chối 409 nếu sinh viên đã nộp lại.
- Submit/review/delete dùng PostgreSQL advisory lock theo MSSV; merge ảnh dựa trên bản mới nhất sau khi khóa.
- Thêm danh sách `AdminReviewer` trong DB; người kiểm tra được tạo một lần và chọn từ dropdown cho mọi hồ sơ.
- Ảnh được kiểm tra magic bytes/kích thước ngay trong validation chung; ảnh hỏng trả lỗi 400 trước khi upload.
- Signed URL giảm còn 15 phút; tạo URL giới hạn 5 tác vụ đồng thời; Storage request có timeout.
- Export chỉ select trường cần dùng; danh mục Excel có cột ID ổn định và từ chối ID trùng.
- Cleanup job dùng claim/lease; thêm `/api/health`, graceful shutdown và cơ chế tự thử lại Storage mỗi 5 phút.

## Cập nhật 2026-08-18 — danh mục hoạt động 2025-2026

- Đối chiếu trực tiếp workbook 1 sheet, 62 hàng (1 tiêu đề + 61 hoạt động), 6 cột.
- Sửa lỗi mô tả Hội nhập mới không khớp alias cũ làm toàn bộ lần import thất bại.
- Import mọi hoạt động trong workbook vào đúng nhóm; chỉ HT-G1 giữ dạng tự điền và không tạo catalog từ dòng Excel tương ứng.
- Ô `Tiêu chí` trống ở 5 dòng Tình nguyện được kế thừa đúng giá trị của dòng trước.
- Import theo cơ chế atomic ở mức ứng dụng: parse và kiểm đủ mọi dòng, lưu JSON DB thành công rồi mới thay danh sách trên giao diện. Không còn báo thành công trước khi request lưu hoàn tất.
- Dòng HT-G1 được nhận diện và bỏ qua có chủ đích; 60 dòng còn lại đều phải được nhập.
- Không thêm migration vì `AppConfig.activityCatalog` đã là JSON; backend whitelist được đồng bộ với 13 khóa frontend.
- Kiểm thử bằng chính file nguồn: đọc 61 dòng, nhập 60 hoạt động và bỏ qua đúng 1 dòng HT-G1; không có dòng không xác định.

## Cập nhật 2026-08-21 — ngày tình nguyện, danh mục CLB học thuật, báo lỗi chi tiết

### Tình nguyện: thêm danh sách ngày tham gia
- Mỗi hoạt động tình nguyện lưu thêm `dates` (mảng `"YYYY-MM-DD"`) bên cạnh `days`.
  Hai giá trị tách riêng vì một buổi có thể chỉ tính 0,5 ngày nên số mốc ngày không
  bằng số ngày quy đổi.
- Không cần migration: dữ liệu nằm trong trường JSON `Submission.data`, hồ sơ cũ
  không có `dates` vẫn đọc/hiển thị bình thường.
- Giao diện đổi từ ô nhập tự do + `<datalist>` sang `<select>` + nút "+ Thêm" +
  nút "+ Đề xuất hoạt động", đồng bộ với 13 nhóm tiêu chí còn lại.
- Báo cáo thành tích (xem trước và file Word) in theo đúng mẫu của Ban:
  `Tên hoạt động (2 ngày: 19/10, 24/10, 26/10, 31/10/2025)` — chỉ ghi năm ở mốc
  cuối cùng của mỗi năm.
- Chặn ở 3 lớp: nút "Tiếp theo" của bước Tình nguyện, `validateSubmissionBeforeSend`,
  và `computeServerReview` phía backend (nên nút "Xác nhận gửi hồ sơ" bị khóa).
- Excel xét duyệt của quản trị có thêm cột "Chi tiết ngày tình nguyện".
- Cột `minhchung` của nhóm Tình nguyện trong file Excel nguồn thực chất là cột
  "Yêu cầu" (giá trị "Tham gia"), nên không dùng làm gợi ý cách minh chứng nữa.

### HT-G1 (CLB học thuật) vào danh mục, bỏ ngoại lệ import
- Thêm nhóm thứ 14 `hocTapClb`; HT-G1 chuyển từ `manualYesNo` sang `sheet` nên vừa
  chọn được từ Excel vừa tự ghi qua nút "Đề xuất hoạt động".
- Import file nguồn giờ là 61/61 dòng, không còn dòng nào bị bỏ qua.
- `GROUP_VALIDATION_RULES['HT-G1']` đổi sang `listOrDetail` nên hồ sơ cũ chỉ có
  `detail` vẫn hợp lệ; `groupEvidenceItems`/`pickedGroupItemNames`/`collectGroupEvidence`
  giữ nguyên khóa minh chứng cũ `hocTap::HT-G1` để đánh dấu của Ban không bị lệch.
- Sửa lỗi tiềm ẩn: nhóm `sheet` chưa từng được render có `gs.items === undefined`,
  làm crash khi nhảy thẳng sang bước Minh chứng.

### Báo lỗi chi tiết
- Backend gắn `scope` cho mọi phản hồi lỗi của `/api`
  (`offline/network/ratelimit/permission/input/conflict/notfound/storage/database/unavailable/server`)
  cùng `code` cho các tình huống quan trọng.
- Frontend dùng `callApi()` + `API_SCOPE_LABEL` để nói rõ lỗi thuộc về mạng của máy
  người dùng, máy chủ, kho ảnh hay dữ liệu vừa nhập, kèm hướng xử lý.
- Import Excel gom TOÀN BỘ dòng lỗi rồi báo một lượt dưới dạng bảng
  Dòng / Cột / Lý do / Nội dung, kèm nút tải file `.txt`, thay vì dừng ở lỗi đầu tiên.
- `PUT /api/admin/activity-catalog` trả `issues` chỉ rõ nhóm + tên hoạt động + lý do.

### Rate limit theo IP dùng chung (ký túc xá / wifi trường)
- `submitLimit` khóa theo MSSV (8 lần/10 phút) thay vì theo IP; thêm `submitIpLimit`
  120 lần/10 phút chỉ để chống flood.
- `/api/auth` chỉ đếm LẦN NHẬP SAI (10 lần/15 phút); đăng nhập đúng không tốn hạn mức
  và xóa bộ đếm.
- `lookup`/`review` nới lên 120 lần/5 phút và khóa theo IP+MSSV; hạn mức chung
  `/api` nới từ 180 lên 600 lần/phút.
- `express.json` được đăng ký TRƯỚC các limiter vì limiter cần đọc `req.body.mssv`.

### Quản trị
- Chưa có thành viên kiểm tra: nút "Lưu" và "Lưu bản kiểm tra" bị disable kèm cảnh báo
  chỉ đường sang Cấu hình, thay vì để bấm rồi nhận lỗi 400.
- Tên đã "Bỏ khỏi danh sách" hiện trong dropdown với nhãn "(đã bỏ khỏi danh sách)" và
  bị disable, thay vì trông như một lựa chọn hợp lệ rồi bị backend từ chối.
- `handleSubmitToBanSV5T` chặn hẳn khi đang ở chế độ xem hồ sơ chỉ đọc; trước đây nút
  chỉ bị ẩn bằng CSS.
- `applyActivityCatalog` dùng chung công thức sinh ID với `parseActivityCatalogRows`.

Kiểm thử: `npm test` — 40/40 pass (thêm `test/volunteer-dates.test.js`).
