// Dữ liệu mẫu và các hàm thay thế, chỉ dùng cho trang thử này.
//
// exportDocx() trong xuat-bao-cao.js đọc `state`, `REPORT_YEAR` và gọi sáu hàm
// dựng dòng của từng cột. Ở ứng dụng thật, sáu hàm đó tính ra từ biểu mẫu sinh
// viên đã điền; ở đây trả thẳng dữ liệu cố định bên dưới, nhờ vậy phần dựng file
// Word chạy đúng như bản thật mà không cần cả biểu mẫu.
//
// Mỗi dòng có dạng { text, plain?, color? }:
//   plain: true  -> dòng phụ, KHÔNG được đánh số (ví dụ "+ Kỳ 1: 96")
//   color: 'green' -> hoạt động sinh viên tự đề xuất
//   color: 'red'   -> mục còn thiếu, hoặc bị Ban đánh dấu khi đang chấm

const REPORT_YEAR = 2026;

const state = {
  personal: {
    fullName: "Nguyễn Mai Trang",
    mssv: "202412924",
    gender: "Nữ",
    birthYear: "2006",
    ethnicity: "Kinh",
    className: "CTTT HT điện và NL tái tạo 01-K69",
    khoaTruong: "Điện - Điện tử",
    positions: ["Ủy viên BCH HSV Trường Điện - Điện tử", "Thành viên Ban Chuyên môn CLB Học thuật"],
    partyStatus: "Đoàn viên",
    phone: "0987654321",
  },
  reportDate: { day: "15", month: "9", year: "2026" },
  khac: { items: [] },
};

// Cột Đạo đức: có dòng phụ không đánh số và một câu rất dài để xem cách ngắt dòng.
const DAO_DUC = [
  { text: "Điểm rèn luyện:" },
  { text: "+ Kỳ 1: 93", plain: true },
  { text: "+ Kỳ 2: 100", plain: true },
  { text: "Trung bình: 96.5", plain: true },
  { text: "Không vi phạm pháp luật và các quy chế, nội quy của Nhà trường, quy định của địa phương và cộng đồng." },
  { text: "Tham gia Cuộc thi tìm hiểu Nghị quyết Đại hội đại biểu Đảng bộ thành phố Hà Nội lần thứ XVIII, nhiệm kỳ 2025 - 2030" },
];

const HOC_TAP = [
  { text: "Điểm học tập:" },
  { text: "+ Kỳ 1: 3.5/4 (18 tín chỉ)", plain: true },
  { text: "+ Kỳ 2: 3.29/4 (19 tín chỉ)", plain: true },
  { text: "Trung bình: 3.39", plain: true },
  // Màu xanh: hoạt động do sinh viên tự đề xuất, không có trong danh mục của Ban.
  { text: "Là thành viên tích cực Ban chuyên môn CLB Học thuật SEEE", color: "green" },
  { text: "Tham gia Kỳ thi Olympic Toán học cấp Đại học năm 2026" },
];

const THE_LUC = [
  { text: "Không có điểm F nào trong tất cả các học phần giáo dục thể chất đã học trong 2 kỳ chính trong năm học." },
  { text: "Tham gia Giải chạy trực tuyến “BƯỚC CHÂN SINH VIÊN”" },
  { text: "Tham gia Giải bóng đá nam SEEE CUP 2025" },
];

// Cột Tình nguyện: dòng tổng không đánh số, và một dòng đỏ báo còn thiếu.
const TINH_NGUYEN = [
  { text: "Hỗ trợ tuyển CTV BCH ĐTN - HSV Trường Điện - Điện tử năm 2026 (1 ngày: 20/09/2025)" },
  { text: "Hỗ trợ tuyển Ban Cán sự K70 Trường Điện - Điện tử năm học 2025 - 2026 (1 ngày: 27/09/2025)" },
  { text: "Hỗ trợ Chuỗi sự kiện “GIAO THOA - SEEE 2026” (3 ngày: 01/04, 02/04, 03/04/2026)" },
  { text: "Tổng số ngày tình nguyện: 5 ngày.", plain: true },
  { text: "Còn thiếu/cần bổ sung sau 0 ngày.", color: "red" },
];

const HOI_NHAP = [
  { text: "Đạt giấy khen Đoàn viên có thành tích xuất sắc trong công tác Đoàn và phong trào thanh niên năm học 2025 - 2026" },
  { text: "Tham gia Cuộc thi “Thách thức trí tuệ cùng SEEE”" },
  { text: "Được miễn các học phần ngoại ngữ theo chương trình đào tạo." },
  { text: "Bổ sung sau: Tham gia ít nhất 01 hoạt động giao lưu quốc tế.", color: "red" },
];

const KHAC = [
  { text: "Đạt học bổng Khuyến khích học tập loại Xuất sắc kỳ 2025.1, 2025.2" },
];

function getDaoDucLines() { return DAO_DUC; }
function getHocTapLines() { return HOC_TAP; }
function getTheLucLines() { return THE_LUC; }
function getTinhNguyenLines() { return TINH_NGUYEN; }
function getHoiNhapLines() { return HOI_NHAP; }
function getSimpleLines() { return KHAC; }

function getPositionsList() {
  return state.personal.positions.filter(x => x && x.trim());
}

// Chép nguyên từ app.js để email in ra giống hệt bản thật.
function removeDiacritics(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}
function genEmail(fullName, mssv) {
  const clean = removeDiacritics(fullName.trim()).replace(/\s+/g, " ");
  if (!clean) return "";
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length < 2) return "";
  const given = parts[parts.length - 1];
  const initials = parts.slice(0, -1).map(p => p[0].toUpperCase()).join("");
  const suffix = mssv.startsWith("20") ? mssv.slice(2) : mssv;
  const givenFmt = given.charAt(0).toUpperCase() + given.slice(1).toLowerCase();
  return `${givenFmt}.${initials}${suffix}@sis.hust.edu.vn`;
}

// Bản thật tra bảng khóa; ở đây chỉ cần đúng "sinh viên năm thứ" cho MSSV mẫu.
function validateMSSV() {
  return { ok: true, year: 2, khoa: "2024", khoaLabel: "K69" };
}

// Thư viện docx đã được nạp sẵn bằng thẻ <script> trong index.html.
function ensureDocx() { return Promise.resolve(window.docx); }

function appAlert(message, title) {
  window.alert((title ? title + "\n\n" : "") + message);
  return Promise.resolve();
}
