
/* =========================================================
   1. DỮ LIỆU CẤU HÌNH
   ========================================================= */
// Cấu hình (4 link mẫu đơn) tải từ server lúc khởi động qua GET /api/config
// (xem main.js) - rỗng cho tới khi tải xong.
const APP_CONFIG = {
  linkDeXuatHoatDong: "",
  linkXacNhanCLB: "",
  linkXacNhanNgoaiKhoa: "",
  linkXacNhanChung: "",
  submissionsOpen: true,
  submissionStartAt: "",
  submissionEndAt: "",
  submissionClosedMessage: "Hiện không trong thời gian nhận hồ sơ."
  // Không còn "adminPassword" ở đây - việc kiểm tra mật khẩu giờ nằm hoàn
  // toàn ở server (server.js, biến môi trường ADMIN_PASSWORD), xem admin.js.
};

const REPORT_YEAR = 2025; // năm ghi trên tiêu đề báo cáo - đổi mỗi năm xét

const KHOA_MAPPING = { "2025": 1, "2024": 2, "2023": 3, "2022": 4, "2021": 5 };
const KHOA_LABEL = { "2025": "K70", "2024": "K69", "2023": "K68", "2022": "K67", "2021": "K66" };

const CRITERIA = {
  daoDuc: [
    {id:"DD-1", name:'Cuộc thi "Tuổi trẻ học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh" năm 2024', yeuCau:"Tham gia tích cực", minhchung:"Giấy chứng nhận đạt giải/Đơn xác nhận tham gia hoạt động ngoại khóa"},
    {id:"DD-2", name:'Hội thi các môn khoa học Mác Lênin và tư tưởng Hồ Chí Minh "Ánh sáng soi đường" năm 2025', yeuCau:"Đạt 21 điểm trở lên", minhchung:"Quay video quá trình làm bài hoặc reload lịch sử làm bài up vào form minh chứng"},
    {id:"DD-3", name:'Cuộc thi "Gương bác soi đường - Vững bước vươn xa" năm 2025', yeuCau:"Tham gia đủ 04/04 bài thi và đạt tối thiểu 30/40 câu đúng ở mỗi bài", minhchung:"Giấy chứng nhận tiêu chí"}
  ],
  hocTap: [
    {id:"HT-1", name:"KỲ THI OLYMPIC TOÁN HỌC SINH VIÊN CẤP ĐẠI HỌC 2025", yeuCau:"Tham gia", minhchung:"Giấy chứng nhận đạt giải/Giấy xác nhận của Khoa Toán - Tin"},
    {id:"HT-2", name:"MOSWC CẤP ĐẠI HỌC", yeuCau:"Hoàn thành", minhchung:"Giấy chứng nhận của CLB o365"},
    {id:"HT-3", name:"Tham gia kì thi chọn đội tuyển olympic vật lý", yeuCau:"Tham gia", minhchung:"Giấy chứng nhận đạt giải/Giấy xác nhận của Khoa Vật lý kĩ thuật"}
  ],
  theLuc: [
    {id:"TL-1", name:'Giải chạy "10000 bước chân vì sức khỏe mỗi ngày"', yeuCau:"Tham gia", minhchung:"Giấy chứng nhận hoàn thành giải chạy/Đơn xác nhận tham gia hoạt động ngoại khóa"},
    {id:"TL-2", name:'Giải chạy "Honda UNI RUN 2024"', yeuCau:"Tham gia", minhchung:"Giấy chứng nhận của BTC/Đơn xác nhận tham gia hoạt động ngoại khóa"},
    {id:"TL-3", name:"Hội thao Sinh viên Bách khoa năm 2024", yeuCau:"Tham gia", minhchung:"Giấy chứng nhận tham gia/Đơn xác nhận tham gia hoạt động ngoại khóa"},
    {id:"TL-4", name:"GIẢI CHẠY BỘ CONNECT FEST 2025", yeuCau:"Tham gia", minhchung:""},
    {id:"TL-5", name:"FESTIVAL THANH NIÊN QUỐC TẾ NĂM 2024", yeuCau:"Tham gia", minhchung:"Giấy chứng nhận tham gia nội dung Giải chạy và Cuộc thi Rung chuông vàng"}
  ],
  hoiNhapKhoaHoc: [
    {id:"HN-KH1", name:"Chinh phục Latex", yeuCau:"Tham gia", minhchung:"Giấy chứng nhận của Ban Tổ chức/Đơn xác nhận tham gia hoạt động ngoại khóa"},
    {id:"HN-KH2", name:"Chương trình kĩ năng mềm về Microsoft Office dành cho Cán bộ lớp, Câu lạc bộ sinh viên", yeuCau:"Tham gia", minhchung:"Giấy chứng nhận của Ban Tổ chức/Đơn xác nhận tham gia hoạt động ngoại khóa"},
    {id:"HN-KH3", name:"KHÓA HỌC KỸ NĂNG MỀM TIN HỌC VĂN PHÒNG DÀNH CHO SINH VIÊN", yeuCau:"Tham gia", minhchung:"Giấy chứng nhận của Ban Tổ chức/Đơn xác nhận tham gia hoạt động ngoại khóa"}
  ],
  hoiNhapCapDaiHoc: [
    {id:"HN-DH1", name:"WIN U GAME 4", yeuCau:"Tham gia", minhchung:"Giấy chứng nhận của Ban Tổ chức/Đơn xác nhận tham gia hoạt động ngoại khóa"},
    {id:"HN-DH2", name:'CUỘC THI: “TÌM HIỂU VĂN HÓA CÁC QUỐC GIA CHÂU Á” + Tuần lễ giao lưu văn hóa quốc tế (Chuỗi hoạt động SV5T cấp ĐH)', yeuCau:"Tham gia", minhchung:"Giấy chứng nhận của BTC"}
  ],
  hoiNhapPhu: [
    {id:"HN-G2-1", name:"FOFL IN ME 2025", yeuCau:"Vào top 10", minhchung:"Giấy chứng nhận của Ban Tổ chức/Đơn xác nhận tham gia hoạt động ngoại khóa"},
    {id:"HN-G2-2", name:"Cuộc thi tài năng anh ngữ thủ đô dành cho học sinh, sinh viên thủ đô lần thứ IX", yeuCau:"Đạt từ 45/70 điểm vòng sơ loại", minhchung:"Quay màn hình quá trình làm bài hoặc reload trang kết quả làm bài up vào link form"},
    {id:"HN-G2-3", name:'CUỘC THI “SEEE LinguaQuest”', yeuCau:"Top 25", minhchung:"Giấy chứng nhận từ BTC"}
  ]
};
// type: 'sheet' (chọn từ danh sách có sẵn) | 'manualList' (tự gõ tên rồi thêm vào danh sách)
// | 'manualYesNo' (Có/Không, nếu Có cho ghi chú chi tiết tự do)
// | 'manualRank' (Có/Không, nếu Có chọn xếp loại cụ thể từ rankOptions, ghi rõ loại vào báo cáo)
const GROUPS = {
  daoDuc: {
    list: [
      {id:"DD-G1", label:"Tham gia các cuộc thi, diễn đàn học thuật tìm hiểu về chủ nghĩa Mác - Lênin, tư tưởng Hồ Chí Minh.", type:"sheet", minCount:1, items:CRITERIA.daoDuc},
      {id:"DD-G2", label:"Là đảng viên Đảng Cộng sản Việt Nam, đánh giá xếp loại đảng viên là hoàn thành tốt nhiệm vụ trở lên.", type:"manualRank", rankOptions:["Hoàn thành tốt nhiệm vụ","Hoàn thành xuất sắc nhiệm vụ"], reportTemplate:"Là đảng viên Đảng Cộng sản Việt Nam, đánh giá xếp loại đảng viên là {rank}."},
      {id:"DD-G3", label:"Đạt giấy chứng nhận hoàn thành lớp bồi dưỡng nhận thức về Đảng cho đối tượng đảng từ loại giỏi trở lên.", type:"manualRank", rankOptions:["Giỏi","Xuất sắc"], reportTemplate:"Đạt giấy chứng nhận hoàn thành lớp bồi dưỡng nhận thức về Đảng cho đối tượng đảng loại {rank}."},
      {id:"DD-G4", label:"Tham gia tích cực các cuộc thi về Đảng, Đoàn - Hội do cấp đại học trở lên tổ chức, phát động hoặc công nhận.", type:"manualList", minCount:1},
      {id:"DD-G5", label:"Là thanh niên tiêu biểu, thanh niên tiên tiến, gương người tốt, việc tốt, có hành động dũng cảm cứu người được ghi nhận, biểu dương.", type:"manualYesNo"}
    ]
  },
  hocTap: {
    list: [
      {id:"HT-G1", label:"Thành viên tích cực mảng/ban chuyên môn của CLB học thuật cấp Đoàn Thanh niên, Hội Sinh viên trường/Liên chi đoàn, Liên chi hội sinh viên khoa trở lên được Ban Thư ký Hội Sinh viên Đại học công nhận.", type:"manualYesNo", plainDetail:true},
      {id:"HT-G2", label:"Tham gia đề tài nghiên cứu khoa học sinh viên.", type:"manualYesNo", plainDetail:true},
      {id:"HT-G3", label:"Tham gia kỳ thi, cuộc thi học thuật cấp đại học trở lên.", type:"sheet", minCount:1, items:CRITERIA.hocTap},
      {id:"HT-G4", label:"Tham gia nhóm nghiên cứu khoa học cấp trường/khoa trở lên.", type:"manualYesNo", plainDetail:true},
      {id:"HT-G5", label:"Có bài tham luận tại hội thảo khoa học hoặc tạp chí chuyên ngành.", type:"manualYesNo", plainDetail:true},
      {id:"HT-G6", label:"Có sản phẩm sáng tạo được cấp bằng sáng chế, cấp giấy phép xuất bản hoặc đạt giải thưởng trong các cuộc thi ý tưởng sáng tạo từ cấp đại học trở lên.", type:"manualYesNo", plainDetail:true}
    ]
  },
  theLuc: {
    list: [
      {id:"TL-G1", label:'Tham gia các hoạt động sát hạch thể lực và đạt danh hiệu "Sinh viên khỏe", "Thanh niên khỏe" từ cấp đại học trở lên.', type:"manualYesNo"},
      {id:"TL-G2", label:"Tham gia ít nhất 02 hoạt động thể dục thể thao từ cấp đại học trở lên.", type:"sheet", minCount:2, items:CRITERIA.theLuc},
      {id:"TL-G3", label:"Là thành viên đội tuyển thể thao cấp đại học trở lên.", type:"manualYesNo"},
      {id:"TL-G4", label:"Là thành viên tích cực của 01 câu lạc bộ thể thao cấp đại học.", type:"manualYesNo"}
    ]
  },
  hoiNhap: {
    list: [
      {id:"HN-G1", label:"Tham gia ít nhất 01 hoạt động giao lưu quốc tế: hội nghị, hội thảo quốc tế, các chương trình gặp gỡ, giao lưu, hợp tác với thanh niên, sinh viên quốc tế trong và ngoài nước.", type:"manualList", minCount:1},
      {id:"HN-G2", label:"Tham gia các cuộc thi về kiến thức hội nhập hoặc có sử dụng ngoại ngữ từ cấp trường/khoa trở lên tổ chức.", type:"sheet", minCount:1, items:CRITERIA.hoiNhapPhu}
    ]
  }
};

const HOINHAP_FIXED = [
  {id:"HN-KHOA-HOC", label:"Hoàn thành ít nhất 01 khóa trang bị kỹ năng thực hành xã hội hoặc có khen thưởng Đoàn/Hội từ cấp đại học trở lên.", type:"sheet", minCount:1, items:CRITERIA.hoiNhapKhoaHoc},
  {id:"HN-CAP-DAI-HOC", label:"Tham gia tích cực ít nhất 01 hoạt động hội nhập cấp đại học trở lên.", type:"sheet", minCount:1, items:CRITERIA.hoiNhapCapDaiHoc}
];

const HOCTAP_DIEN = {
  thuong:      {label:"Sinh viên đại học thường", scale:4, threshold:2.8},
  canBoDoan:   {label:"Cán bộ Đoàn/Hội từ ủy viên BCH chi đoàn, chi hội trở lên", scale:4, threshold:2.5},
  traoDoi:     {label:"Sinh viên diện trao đổi 1-2 kỳ học chính", scale:4, threshold:2.8}
};

/* =========================================================
   2. STATE
   ========================================================= */
function makeGroupState(list){
  const s = {};
  list.forEach(g => {
    if(g.type === "sheet" || g.type === "manualList") s[g.id] = {yes:null, items:[], pending:false};
    else if(g.type === "manualRank") s[g.id] = {yes:null, rank:"", pending:false};
    else s[g.id] = {yes:null, detail:"", pending:false};
  });
  return s;
}

const state = {
  step: 0,
  personal: {
    fullName:"", gender:"Nam", birthYear:"", ethnicity:"Kinh", mssv:"",
    className:"", khoaTruong:"Điện - Điện tử", positions:[""], partyStatus:"Đoàn viên", phone:""
  },
  reportDate: { day:"", month:"", year: String(new Date().getFullYear()) },
  daoDuc: {
    renLuyenKy1:"", renLuyenKy2:"",
    khongViPham:null,
    groups: makeGroupState(GROUPS.daoDuc.list)
  },
  hocTap: {
    dien:"thuong",
    diemKy1:"", tinChiKy1:"", diemKy2:"", tinChiKy2:"",
    groups: makeGroupState(GROUPS.hocTap.list)
  },
  theLuc: {
    hoanThanhDuGDTC:false,
    khongDiemF:null,
    groups: makeGroupState(GROUPS.theLuc.list)
  },
  tinhNguyen: {
    items:[],
    pending:false,
    khenThuong:false
  },
  hoiNhap: {
    fixed: makeGroupState(HOINHAP_FIXED),
    ngoaiNguMethod:"",
    ngoaiNguCertificateType:"",
    ngoaiNguCertificateScore:"",
    ngoaiNguPending:false,
    groups: makeGroupState(GROUPS.hoiNhap.list)
  },
  khac: { items:[] },
  evidence: {}, // key: trạng thái minh chứng: later | form | rỗng
  evidenceForms: {}, // key -> link đơn minh chứng đã mở quyền truy cập
  evidenceImages: {}, // key: "<catKey>::<itemKey>" hoặc "...::ky1"/"...::ky2" -> {name, dataUrl, file}
  removedEvidenceImageKeys: [], // ảnh đã xóa rõ ràng khỏi một hồ sơ cập nhật
  evidenceExpanded: null // card nào đang mở trong bước "Minh chứng hoạt động"
};

const STEPS = [
  {key:"personal", label:"Thông tin cá nhân"},
  {key:"daoDuc", label:"Đạo đức"},
  {key:"hocTap", label:"Học tập"},
  {key:"theLuc", label:"Thể lực"},
  {key:"tinhNguyen", label:"Tình nguyện"},
  {key:"hoiNhap", label:"Hội nhập"},
  {key:"khac", label:"Thành tích khác"},
  {key:"minhChung", label:"Minh chứng hoạt động"},
  {key:"preview", label:"Xem trước & Xuất"}
];

/* =========================================================
   3. TIỆN ÍCH
   ========================================================= */
function removeDiacritics(str){
  return str.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D");
}
function lowerFirst(s){ return s ? s.charAt(0).toLowerCase()+s.slice(1) : s; }
function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function escapeHtmlAttr(value){ return escapeHtml(value); }
function isValidHttpsUrl(value){
  try { const u = new URL(String(value || "")); return u.protocol === "https:" && Boolean(u.hostname); }
  catch { return false; }
}

function showFieldError(inputId, message){
  const input = document.getElementById(inputId);
  if(!input) return;
  input.classList.add("err");
  let error = input.parentElement.querySelector(".field-inline-error");
  if(!error){
    error = document.createElement("div");
    error.className = "err-msg field-inline-error";
    input.insertAdjacentElement("afterend", error);
  }
  error.textContent = message;
  input.scrollIntoView({behavior:"smooth", block:"center"});
  input.focus({preventScroll:true});
}

function clearFieldError(inputId){
  const input = document.getElementById(inputId);
  if(!input) return;
  input.classList.remove("err");
  const error = input.parentElement.querySelector(".field-inline-error");
  if(error) error.remove();
}

function validateMSSV(mssv){
  if(!mssv) return {ok:false, msg:"Vui lòng nhập MSSV"};
  if(!/^\d+$/.test(mssv)) return {ok:false, msg:"MSSV chỉ được chứa chữ số"};
  if(!mssv.startsWith("20")) return {ok:false, msg:"MSSV phải bắt đầu bằng 20"};
  if(mssv.length !== 8 && mssv.length !== 9){
    return {ok:false, msg:"MSSV phải có 8 hoặc 9 ký tự"};
  }
  const khoa = mssv.slice(0,4);
  const year = KHOA_MAPPING[khoa];
  if(year === undefined){
    return {ok:false, msg:`Không nhận diện được khóa "${khoa}" trong bảng ánh xạ - kiểm tra lại MSSV hoặc cập nhật bảng khóa`};
  }
  const expectedLen = year <= 2 ? 9 : 8;
  if(mssv.length !== expectedLen){
    return {ok:false, msg:`Sinh viên năm ${year} (khóa ${khoa}) phải có MSSV đúng ${expectedLen} ký tự`};
  }
  return {ok:true, year, khoa, khoaLabel: KHOA_LABEL[khoa] || "K65 trở về trước"};
}

function genEmail(fullName, mssv){
  const clean = removeDiacritics(fullName.trim()).replace(/\s+/g," ");
  if(!clean) return "";
  const parts = clean.split(" ").filter(Boolean);
  if(parts.length < 2) return "";
  const given = parts[parts.length-1];
  const initials = parts.slice(0,-1).map(p => p[0].toUpperCase()).join("");
  const suffix = mssv.startsWith("20") ? mssv.slice(2) : mssv;
  const givenFmt = given.charAt(0).toUpperCase() + given.slice(1).toLowerCase();
  return `${givenFmt}.${initials}${suffix}@sis.hust.edu.vn`;
}

function ngoaiNguRequirement(khoaLabel){
  if(khoaLabel === "K69") return 'Đạt điểm B trở lên các học phần tiếng Anh; hoặc được miễn học tiếng Anh; hoặc có TOEIC 350+ (hoặc tương đương) trở lên.';
  if(khoaLabel === "K68") return "TOEIC 400+ (hoặc tương đương) trở lên.";
  if(khoaLabel === "K67") return "TOEIC 450+ (hoặc tương đương) trở lên.";
  return "TOEIC 500+ (hoặc tương đương) trở lên (K66 trở về trước).";
}

function calculateWeightedGpa(hocTap){
  const g1=Number(hocTap.diemKy1), g2=Number(hocTap.diemKy2);
  const c1=Number(hocTap.tinChiKy1), c2=Number(hocTap.tinChiKy2);
  const total=c1+c2;
  if(![g1,g2,c1,c2].every(Number.isFinite) || total<=0) return null;
  return (g1*c1 + g2*c2) / total;
}

/* =========================================================
   4. RENDER - khung chung
   ========================================================= */
const stepsEl = document.getElementById("steps");
const contentEl = document.getElementById("stepContent");

function renderSteps(){
  stepsEl.innerHTML = "";
  STEPS.forEach((s, i) => {
    const pill = document.createElement("div");
    pill.className = "step-pill" + (i === state.step ? " active" : (i < state.step ? " done" : ""));
    pill.textContent = (i+1) + ". " + s.label;
    pill.onclick = () => { state.step = i; render(); };
    stepsEl.appendChild(pill);
  });
}

function render(){
  renderSteps();
  const key = STEPS[state.step].key;
  if(key === "personal") renderPersonal();
  else if(key === "daoDuc") renderDaoDuc();
  else if(key === "hocTap") renderHocTap();
  else if(key === "theLuc") renderTheLuc();
  else if(key === "tinhNguyen") renderTinhNguyen();
  else if(key === "hoiNhap") renderHoiNhap();
  else if(key === "khac") renderKhac();
  else if(key === "minhChung") renderMinhChung();
  else if(key === "preview") renderPreview();
  window.scrollTo(0,0);
}

function navButtons(onNext, nextLabel){
  const div = document.createElement("div");
  div.className = "nav-buttons";
  const back = document.createElement("button");
  back.className = "btn btn-secondary";
  back.textContent = "← Quay lại";
  back.disabled = state.step === 0;
  back.onclick = () => { state.step = Math.max(0, state.step-1); render(); };
  const next = document.createElement("button");
  next.className = "btn btn-primary";
  next.textContent = nextLabel || "Tiếp theo →";
  next.onclick = onNext;
  div.appendChild(back);
  div.appendChild(next);
  return div;
}

/* ---------- STEP: Thông tin cá nhân ---------- */
function renderPersonal(){
  const p = state.personal;
  p.khoaTruong = "Điện - Điện tử";
  const mssvCheck = p.mssv ? validateMSSV(p.mssv) : {ok:null};
  const email = (p.fullName && mssvCheck.ok) ? genEmail(p.fullName, p.mssv) : "";

  contentEl.innerHTML = `
    <div class="card">
      <h2>Thông tin cá nhân</h2>
      <p class="sub">Sinh viên năm và Email sẽ được hệ thống tự tính, không cần nhập tay.</p>

      <div class="field">
        <label>Họ và tên</label>
        <input type="text" id="fullName" value="${escapeHtml(p.fullName)}" placeholder="VD: Nguyễn Văn A">
      </div>

      <div class="row2">
        <div class="field">
          <label>Giới tính</label>
          <select id="gender">
            <option ${p.gender==="Nam"?"selected":""}>Nam</option>
            <option ${p.gender==="Nữ"?"selected":""}>Nữ</option>
          </select>
        </div>
        <div class="field">
          <label>Năm sinh</label>
          <input type="number" id="birthYear" value="${escapeHtml(p.birthYear)}" placeholder="VD: 2006" min="2000" max="2010" step="1">
        </div>
      </div>

      <div class="row2">
        <div class="field">
          <label>Dân tộc</label>
          <input type="text" id="ethnicity" value="${escapeHtml(p.ethnicity)}">
        </div>
        <div class="field">
          <label>Lớp</label>
          <input type="text" id="className" value="${escapeHtml(p.className)}" placeholder="VD: KT Y Sinh 02 - K69">
        </div>
      </div>

      <div class="field">
        <label>MSSV</label>
        <input type="text" id="mssv" class="${mssvCheck.ok===false?'err':''}" value="${escapeHtml(p.mssv)}" placeholder="VD: 202414918" maxlength="9">
        <div id="mssvMsgBox">
          ${mssvCheck.ok===false ? `<div class="err-msg">${mssvCheck.msg}</div>` : ""}
          ${mssvCheck.ok===true ? `<div class="ok-msg">Hợp lệ - sinh viên năm ${mssvCheck.year} (${mssvCheck.khoaLabel})</div>` : ""}
        </div>
      </div>

      <div class="row2">
        <div class="field">
          <label>Sinh viên năm (tự tính)</label>
          <div class="readonly-box" id="yearBox">${mssvCheck.ok ? mssvCheck.year : "-"}</div>
        </div>
        <div class="field">
          <label>Email (tự sinh)</label>
          <div class="readonly-box" id="emailBox">${email || "-"}</div>
        </div>
      </div>

      <div class="field">
        <label>Khoa/Trường</label>
        <div class="readonly-box">Điện - Điện tử</div>
      </div>

      <div class="field">
        <label>Chức vụ Đoàn, Hội (nếu có)</label>
        <div id="positionsHost"></div>
        <button type="button" class="btn btn-secondary" id="addPositionBtn" style="margin-top:6px">+ Thêm chức vụ</button>
      </div>

      <div class="row2">
        <div class="field">
          <label>Đảng viên/Đoàn viên</label>
          <select id="partyStatus">
            <option ${p.partyStatus==="Đoàn viên"?"selected":""}>Đoàn viên</option>
            <option ${p.partyStatus==="Đảng viên"?"selected":""}>Đảng viên</option>
            <option ${p.partyStatus==="Không"?"selected":""}>Không</option>
          </select>
        </div>
        <div class="field">
          <label>Số điện thoại</label>
          <input type="text" id="phone" value="${escapeHtml(p.phone)}">
        </div>
      </div>

    </div>
  `;

  ["fullName","birthYear","ethnicity","className","phone"].forEach(id => {
    document.getElementById(id).addEventListener("input", e => {
      state.personal[id] = e.target.value;
      if(id === "fullName") updatePersonalDerived();
    });
  });
  document.getElementById("mssv").addEventListener("input", e => {
    state.personal.mssv = e.target.value;
    updatePersonalDerived();
  });
  document.getElementById("gender").addEventListener("change", e => state.personal.gender = e.target.value);
  document.getElementById("partyStatus").addEventListener("change", e => state.personal.partyStatus = e.target.value);

  renderPositions();
  document.getElementById("addPositionBtn").onclick = () => {
    p.positions.push("");
    renderPositions();
  };

  const nav = navButtons(() => {
    const currentMssvCheck = p.mssv ? validateMSSV(p.mssv) : {ok:null};
    const currentEmail = (p.fullName && currentMssvCheck.ok) ? genEmail(p.fullName, p.mssv) : "";
    if(!p.fullName){ showFieldError("fullName", "Vui lòng nhập họ và tên."); return; }
    if(!p.birthYear || !Number.isInteger(Number(p.birthYear)) || Number(p.birthYear) < 2000 || Number(p.birthYear) > 2010){ showFieldError("birthYear", "Năm sinh phải là số nguyên từ 2000 đến 2010."); return; }
    if(!p.className){ showFieldError("className", "Vui lòng nhập lớp."); return; }
    if(!currentMssvCheck.ok || !currentEmail){ showFieldError("mssv", currentMssvCheck.msg || "MSSV không hợp lệ."); return; }
    state.step++; render();
  });
  contentEl.appendChild(nav);
}

function renderPositions(){
  const p = state.personal;
  const host = document.getElementById("positionsHost");
  host.innerHTML = "";
  p.positions.forEach((val, idx) => {
    const row = document.createElement("div");
    row.className = "freeform-row";
    row.style.marginBottom = "6px";
    const inp = document.createElement("input");
    inp.type = "text";
    inp.value = val;
    inp.placeholder = "VD: Ủy viên BCH Chi đoàn, Chi hội K69";
    inp.addEventListener("input", e => { p.positions[idx] = e.target.value; });
    row.appendChild(inp);
    if(p.positions.length > 1){
      const rm = document.createElement("button");
      rm.type = "button";
      rm.textContent = "✕";
      rm.onclick = () => { p.positions.splice(idx,1); renderPositions(); };
      row.appendChild(rm);
    }
    host.appendChild(row);
  });
}

function updatePersonalDerived(){
  const p = state.personal;
  const mssvInput = document.getElementById("mssv");
  const mssvCheck = p.mssv ? validateMSSV(p.mssv) : {ok:null};
  const email = (p.fullName && mssvCheck.ok) ? genEmail(p.fullName, p.mssv) : "";

  mssvInput.classList.toggle("err", mssvCheck.ok === false);
  const msgBox = document.getElementById("mssvMsgBox");
  if(msgBox){
    msgBox.innerHTML = mssvCheck.ok===false ? `<div class="err-msg">${mssvCheck.msg}</div>`
      : mssvCheck.ok===true ? `<div class="ok-msg">Hợp lệ - sinh viên năm ${mssvCheck.year} (${mssvCheck.khoaLabel})</div>` : "";
  }
  const yearBox = document.getElementById("yearBox");
  if(yearBox) yearBox.textContent = mssvCheck.ok ? mssvCheck.year : "-";
  const emailBox = document.getElementById("emailBox");
  if(emailBox) emailBox.textContent = email || "-";
}

/* ---------- Đánh giá trạng thái nhóm tiêu chí ---------- */
function evaluateGroupState(groupDef, groupState){
  const gs = groupState || {};
  const pending = gs.pending === true;
  const notMet = gs.yes === false || gs.notMet === true;
  let achieved = false;
  if(gs.yes === true){
    if(groupDef.type === "sheet" || groupDef.type === "manualList"){
      achieved = (gs.items || []).length >= (groupDef.minCount || 1);
    } else if(groupDef.type === "manualRank"){
      achieved = Boolean(gs.rank);
    } else {
      achieved = groupDef.plainDetail ? Boolean(String(gs.detail || "").trim()) : true;
    }
  }
  return {
    achieved,
    pending,
    notMet,
    declared: pending || notMet || achieved
  };
}

function getGroupsEvaluation(groupsDef, groupsState){
  return groupsDef.list.map(g => evaluateGroupState(g, groupsState[g.id]));
}
function areGroupsDeclared(groupsDef, groupsState){
  return getGroupsEvaluation(groupsDef, groupsState).every(x => x.declared);
}
function refreshPhuSummary(summaryChip, groupsDef, groupsState){
  const evaluations = getGroupsEvaluation(groupsDef, groupsState);
  const anyAchieved = evaluations.some(x => x.achieved);
  const anyPending = evaluations.some(x => x.pending);
  summaryChip.className = "req-chip" + (anyAchieved ? " met" : "");
  summaryChip.textContent = anyAchieved
    ? "Đã đạt tiêu chí phụ"
    : (anyPending ? "Tiêu chí phụ đang bổ sung sau" : "Chưa đạt tiêu chí phụ nào");
}

/* ---------- Card hiển thị 1 "group" tiêu chí, hỗ trợ 4 kiểu ---------- */
function renderGroupCard(container, groupDef, groupState, onChange){
  const wrap = document.createElement("div");
  wrap.className = "fixed-block";

  // Tương thích dữ liệu cũ: notMet trước đây tương đương chọn Không đạt.
  if(groupState.notMet === true && groupState.yes == null) groupState.yes = false;

  const evaluation = evaluateGroupState(groupDef, groupState);
  const met = evaluation.declared;
  const achieved = evaluation.achieved;

  const topRow = document.createElement("div");
  topRow.className = "criterion-card-top";
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.style.background = groupState.pending ? "#8a6d1a" : (groupState.yes === false ? "var(--err)" : (met ? "var(--ok)" : "var(--navy)"));
  tag.textContent = groupState.pending ? "BỔ SUNG SAU" : (groupState.yes === false ? "KHÔNG ĐẠT" : ((groupDef.type==="sheet"||groupDef.type==="manualList") ? `CHỌN TỐI THIỂU ${groupDef.minCount||1}` : "XÁC NHẬN"));
  topRow.appendChild(tag);

  const pendingLabel = document.createElement("label");
  pendingLabel.className = "criterion-pending-toggle";
  pendingLabel.innerHTML = `<input type="checkbox" ${groupState.pending ? "checked" : ""}> Thiếu/bổ sung sau`;
  pendingLabel.querySelector("input").onchange = e => {
    groupState.pending = e.target.checked;
    onChange();
  };
  topRow.appendChild(pendingLabel);
  wrap.appendChild(topRow);

  const label = document.createElement("div");
  label.className = "field";
  label.style.marginTop = "6px";
  label.innerHTML = `<label style="font-weight:500">${escapeHtml(groupDef.label)}</label>`;
  wrap.appendChild(label);

  if(groupDef.type === "sheet" || groupDef.type === "manualList"){
    const yn = document.createElement("div");
    yn.className = "yesno";
    const yesBtn = document.createElement("button");
    yesBtn.type = "button";
    yesBtn.textContent = "Đạt";
    yesBtn.className = groupState.yes === true ? "selected-yes" : "";
    yesBtn.onclick = () => { groupState.yes = true; groupState.notMet = false; onChange(); };
    const noBtn = document.createElement("button");
    noBtn.type = "button";
    noBtn.textContent = "Không đạt";
    noBtn.className = groupState.yes === false ? "selected-no" : "";
    noBtn.onclick = () => { groupState.yes = false; groupState.notMet = true; groupState.pending = false; onChange(); };
    yn.append(yesBtn,noBtn);
    wrap.appendChild(yn);

    if(groupState.yes !== true){
      if(groupState.yes === false){
        const note=document.createElement("p"); note.className="hint"; note.textContent="Đã khai báo không đạt tiêu chí này."; wrap.appendChild(note);
      }
      container.appendChild(wrap);
      return met;
    }
  }

  if(groupState.pending){
    const note = document.createElement("p");
    note.className = "hint criterion-pending-note";
    note.textContent = "Đã khai báo còn thiếu và sẽ bổ sung sau.";
    wrap.appendChild(note);
  }

  if(groupDef.type === "sheet"){
    const already = new Set((groupState.items || []).map(x=>x.id));
    const options = groupDef.items.filter(c => !already.has(c.id));
    const row = document.createElement("div"); row.className = "add-picker";
    const sel = document.createElement("select");
    sel.innerHTML = options.length ? options.map(c => `<option value="${escapeHtmlAttr(c.id)}">${escapeHtml(c.name)}</option>`).join("") : `<option value="">(Đã chọn hết danh sách)</option>`;
    const btn = document.createElement("button"); btn.type="button"; btn.textContent = "+ Thêm";
    btn.onclick = () => { const item=groupDef.items.find(c=>c.id===sel.value); if(!item) return; groupState.items.push({id:item.id,name:item.name,yeuCau:item.yeuCau||"",minhchung:item.minhchung||""}); onChange(); };
    row.append(sel,btn); wrap.appendChild(row);

    const proposeBtn=document.createElement("button"); proposeBtn.type="button"; proposeBtn.className="btn btn-secondary"; proposeBtn.style.marginBottom="10px"; proposeBtn.style.fontSize="12px";
    proposeBtn.textContent=groupState.proposeOpen?"Đóng đề xuất hoạt động":"+ Đề xuất hoạt động";
    proposeBtn.onclick=()=>{ groupState.proposeOpen=!groupState.proposeOpen; onChange(); };
    wrap.appendChild(proposeBtn);
    if(groupState.proposeOpen){
      const proposeRow=document.createElement("div"); proposeRow.className="freeform-row";
      const input=document.createElement("input"); input.type="text"; input.placeholder="Nhập tên hoạt động muốn đề xuất thêm...";
      const add=document.createElement("button"); add.type="button"; add.textContent="Thêm đề xuất";
      add.onclick=()=>{ const v=input.value.trim(); if(!v){ groupState.proposeOpen=false; onChange(); return; } groupState.items.push({id:"PROPOSED-"+Date.now(),name:v,proposed:true}); groupState.proposeOpen=false; onChange(); };
      proposeRow.append(input,add); wrap.appendChild(proposeRow);
    }
  } else if(groupDef.type === "manualList"){
    const row=document.createElement("div"); row.className="freeform-row";
    const input=document.createElement("input"); input.type="text"; input.placeholder="Nhập tên hoạt động...";
    const btn=document.createElement("button"); btn.type="button"; btn.textContent="+ Thêm";
    btn.onclick=()=>{ const v=input.value.trim(); if(!v) return; groupState.items.push({name:v}); onChange(); };
    row.append(input,btn); wrap.appendChild(row);
  } else if(groupDef.type === "manualRank"){
    const yn=document.createElement("div"); yn.className="yesno";
    const y=document.createElement("button"); y.type="button"; y.textContent="Đạt"; y.className=groupState.yes===true?"selected-yes":""; y.onclick=()=>{groupState.yes=true;onChange();};
    const n=document.createElement("button"); n.type="button"; n.textContent="Không đạt"; n.className=groupState.yes===false?"selected-no":""; n.onclick=()=>{groupState.yes=false;groupState.rank="";groupState.pending=false;onChange();};
    yn.append(y,n); wrap.appendChild(yn);
    if(groupState.yes===true){ const f=document.createElement("div"); f.className="field"; f.innerHTML="<label>Xếp loại cụ thể</label>"; const sel=document.createElement("select"); sel.innerHTML='<option value="">Chọn xếp loại</option>'+groupDef.rankOptions.map(r=>`<option value="${escapeHtmlAttr(r)}" ${groupState.rank===r?"selected":""}>${escapeHtml(r)}</option>`).join(""); sel.onchange=()=>{groupState.rank=sel.value;onChange();}; f.appendChild(sel); wrap.appendChild(f); }
  } else {
    const yn=document.createElement("div"); yn.className="yesno";
    const y=document.createElement("button"); y.type="button"; y.textContent="Đạt"; y.className=groupState.yes===true?"selected-yes":""; y.onclick=()=>{groupState.yes=true;onChange();};
    const n=document.createElement("button"); n.type="button"; n.textContent="Không đạt"; n.className=groupState.yes===false?"selected-no":""; n.onclick=()=>{groupState.yes=false;groupState.detail="";groupState.pending=false;onChange();};
    yn.append(y,n); wrap.appendChild(yn);
    if(groupState.yes===true){ const f=document.createElement("div"); f.className="field"; f.innerHTML=`<label>${groupDef.plainDetail?"Ghi rõ thành tích/hoạt động":"Chi tiết cụ thể"}</label>`; const inp=document.createElement("input"); inp.type="text"; inp.value=groupState.detail||""; inp.placeholder="Nhập nội dung cụ thể..."; inp.oninput=e=>{groupState.detail=e.target.value; if(typeof container._refreshCriterionSummary==="function") container._refreshCriterionSummary();}; f.appendChild(inp); wrap.appendChild(f); }
  }

  if(groupDef.type === "sheet" || groupDef.type === "manualList"){
    const ul=document.createElement("ul"); ul.className="item-list";
    (groupState.items||[]).forEach((it,idx)=>{ const li=document.createElement("li"); li.innerHTML=`<span class="txt">${escapeHtml(it.name)}${it.yeuCau ? `<span class="hint activity-requirement">Yêu cầu: ${escapeHtml(it.yeuCau)}</span>` : ""}</span>`; const rm=document.createElement("button"); rm.type="button"; rm.textContent="Xóa"; rm.onclick=()=>{groupState.items.splice(idx,1);onChange();}; li.appendChild(rm); ul.appendChild(li); });
    wrap.appendChild(ul);
    const count=document.createElement("div"); count.className=achieved?"ok-msg":(groupState.pending?"hint":"err-msg"); count.textContent=`Đã thêm ${(groupState.items||[]).length}/${groupDef.minCount||1}`; wrap.appendChild(count);
  }
  container.appendChild(wrap);
  return met;
}

function renderPhuGroupsBlock(container, groupsDef, groupsState, onChange, title){
  const head = document.createElement("div");
  head.style.margin = "18px 0 6px";
  head.innerHTML = `<b>${title || "ĐẠT THÊM 01 TIÊU CHÍ TRONG CÁC TIÊU CHÍ SAU:"}</b>`;
  container.appendChild(head);

  groupsDef.list.forEach(g => renderGroupCard(container, g, groupsState[g.id], onChange));

  const summary = document.createElement("div");
  summary.className = "req-summary";
  const chip = document.createElement("div");
  summary.appendChild(chip);
  container.appendChild(summary);
  container._refreshCriterionSummary = () => refreshPhuSummary(chip, groupsDef, groupsState);
  container._refreshCriterionSummary();

  // Điều kiện chuyển bước là đã khai báo đầy đủ, không đồng nghĩa với đã đạt.
  return areGroupsDeclared(groupsDef, groupsState);
}

/* ---------- STEP: Đạo đức ---------- */
function renderDaoDuc(){
  const d = state.daoDuc;
  contentEl.innerHTML = `
    <div class="card">
      <h2>Đạo đức</h2>
      <p class="sub">Bắt buộc khai báo điểm rèn luyện hai kỳ, xác nhận không vi phạm và các tiêu chí phụ.</p>
      <div id="fixedHost"></div>
      <div id="phuHost"></div>
    </div>`;
  const fixedHost = document.getElementById("fixedHost");
  const avg = (d.renLuyenKy1!=="" && d.renLuyenKy2!=="") ? (Number(d.renLuyenKy1)+Number(d.renLuyenKy2))/2 : null;
  const scoreOk = avg !== null && avg >= 80;
  const fb1 = document.createElement("div");
  fb1.className = "fixed-block";
  fb1.innerHTML = `<span class="tag">TIÊU CHÍ CHÍNH - BẮT BUỘC</span>
    <div class="row2" style="margin-top:8px">
      <div class="field"><label>Điểm rèn luyện kỳ 1 (0-100)</label><input type="number" id="rl1" value="${d.renLuyenKy1}" min="0" max="100" step="1"></div>
      <div class="field"><label>Điểm rèn luyện kỳ 2 (0-100)</label><input type="number" id="rl2" value="${d.renLuyenKy2}" min="0" max="100" step="1"></div>
    </div><div id="rlAvgBox">${avg!==null ? `<div class="${scoreOk?'ok-msg':'err-msg'}">Trung bình: ${avg.toFixed(1)} - ${scoreOk?'Đạt':'Không đạt (yêu cầu ≥ 80)'}</div>` : ""}</div>`;
  fixedHost.appendChild(fb1);
  const fb2 = document.createElement("div");
  fb2.className = "fixed-block";
  fb2.innerHTML = `<span class="tag">TIÊU CHÍ CHÍNH - BẮT BUỘC</span><div class="field" style="margin-top:6px"><label>Không vi phạm pháp luật và các quy chế, nội quy của đại học, quy định của địa phương và cộng đồng</label><div class="yesno"><button id="yn-yes" class="${d.khongViPham===true?'selected-yes':''}">Có / Đúng</button><button id="yn-no" class="${d.khongViPham===false?'selected-no':''}">Không đúng</button></div></div>`;
  fixedHost.appendChild(fb2);
  function updateRl(){
    const a = d.renLuyenKy1!=="" && d.renLuyenKy2!=="" ? (Number(d.renLuyenKy1)+Number(d.renLuyenKy2))/2 : null;
    const box=document.getElementById("rlAvgBox");
    if(box) box.innerHTML=a!==null?`<div class="${a>=80?'ok-msg':'err-msg'}">Trung bình: ${a.toFixed(1)} - ${a>=80?'Đạt':'Không đạt (yêu cầu ≥ 80)'}</div>`:"";
  }
  document.getElementById("rl1").addEventListener("input",e=>{d.renLuyenKy1=e.target.value;markStateDirty();updateRl();});
  document.getElementById("rl2").addEventListener("input",e=>{d.renLuyenKy2=e.target.value;markStateDirty();updateRl();});
  document.getElementById("yn-yes").onclick=()=>{d.khongViPham=true;renderDaoDuc();};
  document.getElementById("yn-no").onclick=()=>{d.khongViPham=false;renderDaoDuc();};
  const phuMet=renderPhuGroupsBlock(document.getElementById("phuHost"),GROUPS.daoDuc,d.groups,renderDaoDuc);
  const nav=navButtons(()=>{
    const scores=[d.renLuyenKy1,d.renLuyenKy2].every(v=>v!==""&&Number(v)>=0&&Number(v)<=100);
    if(!scores||d.khongViPham===null||!areGroupsDeclared(GROUPS.daoDuc,d.groups)){appAlert("Vui lòng khai báo đầy đủ điểm rèn luyện, tình trạng vi phạm và các tiêu chí phụ.","Dữ liệu chưa đầy đủ");return;}
    state.step++;render();
  });
  contentEl.appendChild(nav);
}

/* ---------- STEP: Học tập ---------- */
function renderHocTap(){
  const h = state.hocTap;
  const dien = HOCTAP_DIEN[h.dien];
  contentEl.innerHTML = `
    <div class="card">
      <h2>Học tập</h2>
      <p class="sub">Chuẩn điểm khác nhau tùy diện xét - chọn đúng diện của sinh viên.</p>

      <div class="field">
        <label>Diện xét</label>
        <select id="dien">
          ${Object.entries(HOCTAP_DIEN).map(([k,v]) => `<option value="${k}" ${h.dien===k?"selected":""}>${v.label}</option>`).join("")}
        </select>
        <div class="hint">Chuẩn áp dụng: điểm TB ≥ ${dien.threshold}/${dien.scale} (điểm TB có trọng số tín chỉ hai kỳ chính)</div>
      </div>

      <div class="fixed-block">
        <span class="tag">TIÊU CHÍ CHÍNH - BẮT BUỘC</span>
        <div class="row2" style="margin-top:8px">
          <div class="field">
            <label>Điểm học tập kỳ 1 (thang ${dien.scale})</label>
            <input type="number" step="0.01" id="dk1" value="${h.diemKy1}" min="0" max="4">
          </div>
          <div class="field">
            <label>Số tín chỉ kỳ 1</label>
            <input type="number" id="tc1" value="${h.tinChiKy1}" min="1" max="30" step="1">
          </div>
        </div>
        <div class="row2">
          <div class="field">
            <label>Điểm học tập kỳ 2 (thang ${dien.scale})</label>
            <input type="number" step="0.01" id="dk2" value="${h.diemKy2}" min="0" max="4">
          </div>
          <div class="field">
            <label>Số tín chỉ kỳ 2</label>
            <input type="number" id="tc2" value="${h.tinChiKy2}" min="1" max="30" step="1">
          </div>
        </div>
        <div id="gpaBox"></div>
        ${h.dien==='traoDoi' ? '<div class="hint">Diện trao đổi sinh viên cần làm đơn trình Ban Thư ký Hội Sinh viên Đại học phê duyệt.</div>' : ''}
      </div>

      <div id="phuHost"></div>
    </div>
  `;

  function syncHocTapInputs(){
    const fieldMap = {
      dk1: "diemKy1",
      tc1: "tinChiKy1",
      dk2: "diemKy2",
      tc2: "tinChiKy2"
    };
    Object.entries(fieldMap).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if(el) h[key] = el.value;
    });
  }

  function updateGpaBox(){
    // Luôn đọc trực tiếp giá trị đang hiển thị trong các ô trước khi tính.
    // Cách này đảm bảo GPA thay đổi ngay cả khi người dùng đang sửa số tín chỉ.
    syncHocTapInputs();
    const avg = calculateWeightedGpa(h);
    const ok = avg !== null && avg >= dien.threshold;
    const box = document.getElementById("gpaBox");
    if(!box) return;
    if(avg === null){
      box.innerHTML = "";
      return;
    }
    const totalCredits = Number(h.tinChiKy1) + Number(h.tinChiKy2);
    box.innerHTML = `<div class="${ok?'ok-msg':'err-msg'}">Trung bình có trọng số: ${avg.toFixed(2)}/${dien.scale} - ${ok?'Đạt':'Không đạt (yêu cầu ≥ '+dien.threshold+')'}</div>`;
  }
  updateGpaBox();

  document.getElementById("dien").addEventListener("change", e => { h.dien = e.target.value; renderHocTap(); });
  [["dk1","diemKy1",4],["tc1","tinChiKy1",30],["dk2","diemKy2",4],["tc2","tinChiKy2",30]].forEach(([id,key,max]) => {
    const input = document.getElementById(id);
    const handleLiveUpdate = () => updateGpaBox();
    input.addEventListener("input", handleLiveUpdate);
    input.addEventListener("change", handleLiveUpdate);
    input.addEventListener("keyup", handleLiveUpdate);
    input.addEventListener("blur", e => {
      if(e.target.value === ""){
        updateGpaBox();
        return;
      }
      const value = Number(e.target.value);
      if(!Number.isFinite(value) || value < 0 || value > max){
        e.target.classList.add("err");
        updateGpaBox();
        return;
      }
      e.target.classList.remove("err");
      if(key.startsWith("tinChi")){
        const integerValue = Math.round(value);
        e.target.value = String(integerValue);
      }
      updateGpaBox();
    });
  });

  const phuMet = renderPhuGroupsBlock(document.getElementById("phuHost"), GROUPS.hocTap, h.groups, renderHocTap);

  const nav = navButtons(() => {
    const avg = calculateWeightedGpa(h);
    const scoresValid = [h.diemKy1,h.diemKy2].every(v => v !== "" && Number(v) >= 0 && Number(v) <= 4);
    const creditsValid = [h.tinChiKy1,h.tinChiKy2].every(v => v !== "" && Number(v) >= 1 && Number(v) <= 30);
    if(!scoresValid || !creditsValid || avg === null || !areGroupsDeclared(GROUPS.hocTap,h.groups)){
      appAlert("Vui lòng nhập hợp lệ điểm, tín chỉ và khai báo đầy đủ các tiêu chí phụ. Điểm chưa đạt chuẩn vẫn được phép khai báo và gửi hồ sơ.","Dữ liệu chưa đầy đủ");
      return;
    }
    state.step++; render();
  });
  contentEl.appendChild(nav);
}

/* ---------- STEP: Thể lực ---------- */
function renderTheLuc(){
  const t = state.theLuc;
  contentEl.innerHTML = `
    <div class="card">
      <h2>Thể lực</h2>
      <div class="fixed-block">
        <span class="tag">TIÊU CHÍ CHÍNH - BẮT BUỘC</span>
        <div class="field" style="margin-top:6px">
          <label><input type="checkbox" id="duGdtc" ${t.hoanThanhDuGDTC?"checked":""}> Đã hoàn thành đủ 05 học phần Giáo dục thể chất</label>
        </div>
        <div id="tlFixedInner"></div>
      </div>
      <div id="phuHost"></div>
    </div>
  `;
  const inner = document.getElementById("tlFixedInner");
  if(t.hoanThanhDuGDTC){
    inner.innerHTML = `<div class="ok-msg">Đạt tiêu chí: hoàn thành chương trình đào tạo GDTC theo quy định.</div>`;
  } else {
    inner.innerHTML = `
      <div class="field">
        <label>Không có điểm F nào trong các học phần GDTC đã học trong 2 kỳ chính năm học (áp dụng khi chưa học đủ 5 học phần)</label>
        <div class="yesno">
          <button id="yn-yes" class="${t.khongDiemF===true?'selected-yes':''}">Có / Đúng</button>
          <button id="yn-no" class="${t.khongDiemF===false?'selected-no':''}">Không đúng</button>
        </div>
      </div>
    `;
  }
  document.getElementById("duGdtc").addEventListener("change", e => { t.hoanThanhDuGDTC = e.target.checked; renderTheLuc(); });
  if(!t.hoanThanhDuGDTC){
    document.getElementById("yn-yes").onclick = () => { t.khongDiemF = true; renderTheLuc(); };
    document.getElementById("yn-no").onclick = () => { t.khongDiemF = false; renderTheLuc(); };
  }

  const phuMet = renderPhuGroupsBlock(document.getElementById("phuHost"), GROUPS.theLuc, t.groups, renderTheLuc);

  const nav = navButtons(() => {
    const chinhDeclared = t.hoanThanhDuGDTC || t.khongDiemF === true || t.khongDiemF === false;
    if(!chinhDeclared || !areGroupsDeclared(GROUPS.theLuc,t.groups)){
      appAlert("Cần khai báo tình trạng Giáo dục thể chất và đầy đủ các tiêu chí phụ. Không đạt vẫn được phép khai báo và gửi hồ sơ.","Dữ liệu chưa đầy đủ");
      return;
    }
    state.step++; render();
  });
  contentEl.appendChild(nav);
}

/* ---------- STEP: Tình nguyện ---------- */
function renderTinhNguyen(){
  const tn = state.tinhNguyen;
  const total = (tn.items || []).reduce((sum,it)=>sum+(Number(it.days)||0),0);
  const missingDays = Math.max(0, 5-total);
  contentEl.innerHTML = `
    <div class="card">
      <h2>Tình nguyện</h2>
      <p class="sub">Ghi rõ từng hoạt động và số ngày tham gia. Nếu chưa đủ 5 ngày, hãy chủ động đánh dấu sẽ bổ sung sau.</p>
      <div class="freeform-row">
        <input type="text" id="tnText" placeholder="Tên hoạt động, VD: Hiến máu nhân đạo">
        <input type="number" id="tnDays" placeholder="Số ngày" min="0" step="0.5" style="max-width:110px">
        <button id="tnAdd">+ Thêm</button>
      </div>
      <ul class="item-list" id="tnList"></ul>
      <div id="tnTotalBox"></div>
      ${missingDays > 0 ? `<label class="volunteer-pending-box"><input type="checkbox" id="tnPending" ${tn.pending?"checked":""}> Thiếu/bổ sung sau ${missingDays} ngày</label>` : ""}
      <div class="fixed-block" style="margin-top:16px">
        <span class="tag">TIÊU CHÍ ƯU TIÊN - không bắt buộc</span>
        <div class="field" style="margin-top:6px"><label><input type="checkbox" id="tnKhenThuong" ${tn.khenThuong?"checked":""}> Được khen thưởng từ cấp đại học trở lên về hoạt động tình nguyện</label></div>
      </div>
    </div>`;
  const ul=document.getElementById("tnList");
  (tn.items||[]).forEach((it,idx)=>{ const li=document.createElement("li"); li.innerHTML=`<span class="txt">${escapeHtml(it.text)} - <b>${escapeHtml(it.days)} ngày</b></span>`; const rm=document.createElement("button"); rm.type="button"; rm.textContent="Xóa"; rm.onclick=()=>{tn.items.splice(idx,1);renderTinhNguyen();}; li.appendChild(rm); ul.appendChild(li); });
  const box=document.getElementById("tnTotalBox");
  box.innerHTML=`<div class="${total>=5?'ok-msg':'err-msg'}">Tổng số ngày tình nguyện: ${total} ngày - ${total>=5?'Đạt':`Còn thiếu ${missingDays} ngày`}</div>`;
  document.getElementById("tnAdd").onclick=()=>{ const text=document.getElementById("tnText").value.trim(); const raw=document.getElementById("tnDays").value; const days=Number(raw); if(!text){appAlert("Vui lòng nhập tên hoạt động.","Thiếu thông tin");return;} if(raw===""||!Number.isFinite(days)||days<0){appAlert("Số ngày tình nguyện phải là số từ 0 trở lên.","Dữ liệu chưa hợp lệ");return;} tn.items.push({text,days}); renderTinhNguyen(); };
  const pending=document.getElementById("tnPending"); if(pending) pending.onchange=e=>{tn.pending=e.target.checked;markStateDirty();};
  document.getElementById("tnKhenThuong").onchange=e=>tn.khenThuong=e.target.checked;
  const nav=navButtons(()=>{ const currentTotal=(tn.items||[]).reduce((sum,it)=>sum+(Number(it.days)||0),0); if(currentTotal<5 && !tn.pending){appAlert(`Bạn còn thiếu ${Math.max(0,5-currentTotal)} ngày. Hãy thêm hoạt động hoặc đánh dấu Thiếu/bổ sung sau.`,"Chưa khai báo đầy đủ");return;} state.step++;render(); });
  contentEl.appendChild(nav);
}


function validateNgoaiNguCertificate(hn, khoaLabel){
  if(hn.ngoaiNguMethod !== "certificate") return {ok:true,msg:""};
  const type=String(hn.ngoaiNguCertificateType||"");
  const raw=String(hn.ngoaiNguCertificateScore??"").trim();
  if(!["IELTS","TOEIC"].includes(type)) return {ok:false,msg:"Vui lòng chọn IELTS hoặc TOEIC."};
  if(raw==="" || !Number.isFinite(Number(raw))) return {ok:false,msg:"Vui lòng nhập điểm chứng chỉ hợp lệ."};
  const score=Number(raw);
  if(type==="IELTS"){
    if(score<0 || score>9 || Math.abs(score*2-Math.round(score*2))>1e-9) return {ok:false,msg:"Điểm IELTS phải từ 0 đến 9 và theo bước 0.5."};
  } else {
    if(!Number.isInteger(score) || score<0 || score>990) return {ok:false,msg:"Điểm TOEIC phải là số nguyên từ 0 đến 990."};
    const minimum = khoaLabel === "K69" ? 350 : khoaLabel === "K68" ? 400 : khoaLabel === "K67" ? 450 : 500;
    if(score < minimum) return {ok:false,msg:`Điểm TOEIC của ${khoaLabel || "khóa hiện tại"} phải từ ${minimum} trở lên.`};
  }
  return {ok:true,msg:""};
}

/* ---------- STEP: Hội nhập ---------- */
function renderHoiNhap(){
  const hn = state.hoiNhap;
  // Tương thích hồ sơ cũ: tách dữ liệu HN-F sang 2 tiêu chí mới.
  if(hn.fixed?.["HN-F"]){
    const old=hn.fixed["HN-F"];
    const oldItems=old.items||[];
    hn.fixed["HN-KHOA-HOC"] ||= {yes:old.yes,items:oldItems.filter(it=>String(it.id||"").match(/^HN-C[1-3]$/)),pending:old.pending||false};
    hn.fixed["HN-CAP-DAI-HOC"] ||= {yes:old.yes,items:oldItems.filter(it=>String(it.id||"").match(/^HN-C[45]$/)),pending:old.pending||false};
    delete hn.fixed["HN-F"];
  }
  HOINHAP_FIXED.forEach(g=>{ hn.fixed[g.id] ||= makeGroupState([g])[g.id]; });
  if(hn.ngoaiNguDat === true && !hn.ngoaiNguMethod) hn.ngoaiNguMethod="certificate";
  if(hn.ngoaiNguDat === false && !hn.ngoaiNguMethod) hn.ngoaiNguMethod="notMet";

  contentEl.innerHTML = `
    <div class="card">
      <h2>Hội nhập</h2>
      <p class="sub">Hoàn thành các tiêu chí chính và khai báo ít nhất 1 tiêu chí phụ.</p>
      <div id="fixedHost"></div>
      <div id="ngoaiNguHost"></div>
      <div id="mainCriteriaSummary"></div>
      <div id="phuHost"></div>
    </div>
  `;
  const fixedHost = document.getElementById("fixedHost");
  let completedMain = 0;
  HOINHAP_FIXED.forEach((g,i) => {
    const label = document.createElement("div");
    label.innerHTML = `<div style="margin:${i?14:0}px 0 4px"><b>Tiêu chí chính ${i+1}:</b></div>`;
    fixedHost.appendChild(label);
    const met = renderGroupCard(fixedHost, g, hn.fixed[g.id], renderHoiNhap);
    const gs=hn.fixed[g.id];
    if(met && gs.yes===true && !gs.pending && (gs.items||[]).length >= (g.minCount||1)) completedMain++;
  });

  const p = state.personal;
  const mssvCheck = p.mssv ? validateMSSV(p.mssv) : {ok:null};
  const khoaLabel = mssvCheck.ok ? mssvCheck.khoaLabel : null;
  const ngoaiNguHost = document.getElementById("ngoaiNguHost");
  const box = document.createElement("div");
  box.className = "fixed-block";
  const certificateValid = validateNgoaiNguCertificate(hn, khoaLabel).ok;
  const englishCompleted = hn.ngoaiNguMethod === "exempt" || (hn.ngoaiNguMethod === "certificate" && certificateValid);
  if(englishCompleted) completedMain++;
  box.innerHTML = `
    <div class="criterion-card-top">
      <b>Tiêu chí chính 3: Chuẩn ngoại ngữ</b>
      <label class="criterion-pending-toggle"><input type="checkbox" id="nn-pending" ${hn.ngoaiNguPending?"checked":""}> Thiếu/bổ sung sau</label>
    </div>
    <div class="field" style="margin-top:10px">
      ${khoaLabel ? `<div class="hint" style="margin-bottom:8px">Chuẩn áp dụng (${khoaLabel}): ${ngoaiNguRequirement(khoaLabel)}</div>` : ""}
      <div class="yesno english-methods">
        <button type="button" id="nn-exempt" class="${hn.ngoaiNguMethod==="exempt"?'selected-yes':''}">Được miễn các học phần Tiếng Anh</button>
        <button type="button" id="nn-certificate" class="${hn.ngoaiNguMethod==="certificate"?'selected-yes':''}">Có chứng chỉ IELTS/TOEIC</button>
        <button type="button" id="nn-notmet" class="${hn.ngoaiNguMethod==="notMet"?'selected-no':''}">Không đạt</button>
      </div>
      ${hn.ngoaiNguMethod === "certificate" ? `
        <div class="row2" style="margin-top:10px">
          <div class="field">
            <label>Loại chứng chỉ</label>
            <select id="nn-certificate-type">
              <option value="">Chọn IELTS hoặc TOEIC</option>
              <option value="IELTS" ${hn.ngoaiNguCertificateType==="IELTS"?'selected':''}>IELTS</option>
              <option value="TOEIC" ${hn.ngoaiNguCertificateType==="TOEIC"?'selected':''}>TOEIC</option>
            </select>
          </div>
          <div class="field">
            <label>Điểm chứng chỉ</label>
            <input type="number" id="nn-certificate-score" value="${escapeHtmlAttr(hn.ngoaiNguCertificateScore || "")}" placeholder="${hn.ngoaiNguCertificateType === 'IELTS' ? 'VD: 6.5' : hn.ngoaiNguCertificateType === 'TOEIC' ? 'VD: 650' : 'Chọn loại chứng chỉ trước'}" ${hn.ngoaiNguCertificateType === 'IELTS' ? 'min="0" max="9" step="0.5"' : hn.ngoaiNguCertificateType === 'TOEIC' ? 'min="0" max="990" step="1"' : 'disabled'}>
          </div>
        </div>
        <div id="nn-certificate-error" class="${certificateValid?'ok-msg':'err-msg'}">${certificateValid ? 'Thông tin chứng chỉ hợp lệ.' : escapeHtml(validateNgoaiNguCertificate(hn, khoaLabel).msg || 'Vui lòng chọn loại chứng chỉ và nhập điểm.')}</div>
      ` : ''}
    </div>`;
  ngoaiNguHost.appendChild(box);
  document.getElementById("nn-pending").onchange=e=>{hn.ngoaiNguPending=e.target.checked; renderHoiNhap();};
  document.getElementById("nn-exempt").onclick=()=>{hn.ngoaiNguMethod="exempt";hn.ngoaiNguPending=false;hn.ngoaiNguCertificateType="";hn.ngoaiNguCertificateScore="";renderHoiNhap();};
  document.getElementById("nn-certificate").onclick=()=>{hn.ngoaiNguMethod="certificate";hn.ngoaiNguPending=false;renderHoiNhap();};
  document.getElementById("nn-notmet").onclick=()=>{hn.ngoaiNguMethod="notMet";hn.ngoaiNguPending=false;hn.ngoaiNguCertificateType="";hn.ngoaiNguCertificateScore="";renderHoiNhap();};
  const certType=document.getElementById("nn-certificate-type");
  const certScore=document.getElementById("nn-certificate-score");
  if(certType) certType.onchange=e=>{hn.ngoaiNguCertificateType=e.target.value;hn.ngoaiNguCertificateScore="";renderHoiNhap();};
  if(certScore) certScore.addEventListener("input",e=>{hn.ngoaiNguCertificateScore=e.target.value;});

  const totalMain=HOINHAP_FIXED.length+1;
  const summary=document.getElementById("mainCriteriaSummary");
  summary.innerHTML = completedMain===totalMain
    ? `<div class="req-summary"><div class="req-chip met">Đã hoàn thành tiêu chí chính</div></div>`
    : `<div class="req-summary"><div class="req-chip">Đã hoàn thành ${completedMain}/${totalMain} tiêu chí chính</div></div>`;

  const phuMet = renderPhuGroupsBlock(document.getElementById("phuHost"), GROUPS.hoiNhap, hn.groups, renderHoiNhap);
  const nav = navButtons(() => {
    const fixedDeclared=HOINHAP_FIXED.every(g=>{const gs=hn.fixed[g.id]; return gs.pending || gs.yes===false || (gs.yes===true && (gs.items||[]).length>=(g.minCount||1));});
    const englishDeclared=hn.ngoaiNguPending || hn.ngoaiNguMethod==="exempt" || hn.ngoaiNguMethod==="notMet" || (hn.ngoaiNguMethod==="certificate" && validateNgoaiNguCertificate(hn,khoaLabel).ok);
    if(!fixedDeclared || !englishDeclared || !areGroupsDeclared(GROUPS.hoiNhap,hn.groups)){
      appAlert("Mục Hội nhập còn tiêu chí chưa được khai báo. Có thể chọn Không đạt hoặc Thiếu/bổ sung sau nếu chưa hoàn thành.","Chưa hoàn tất khai báo");
      return;
    }
    state.step++; render();
  });
  contentEl.appendChild(nav);
}

/* ---------- Free-form list dùng chung: Thành tích khác ---------- */
function renderFreeform(container, itemsList, onChange, placeholder){
  const wrap = document.createElement("div");
  const row = document.createElement("div");
  row.className = "freeform-row";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = placeholder || "Nhập tên hoạt động / thành tích...";
  const btn = document.createElement("button");
  btn.textContent = "+ Thêm";
  btn.onclick = () => {
    const v = input.value.trim();
    if(!v) return;
    itemsList.push({text:v});
    onChange();
  };
  row.appendChild(input);
  row.appendChild(btn);
  wrap.appendChild(row);

  const ul = document.createElement("ul");
  ul.className = "item-list";
  itemsList.forEach((it, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="txt">${escapeHtml(it.text)}</span>`;
    const rm = document.createElement("button");
    rm.textContent = "✕";
    rm.onclick = () => { itemsList.splice(idx,1); onChange(); };
    li.appendChild(rm);
    ul.appendChild(li);
  });
  wrap.appendChild(ul);
  container.appendChild(wrap);
}

/* ---------- STEP: Thành tích khác ---------- */
function renderKhac(){
  contentEl.innerHTML = `
    <div class="card">
      <h2>Các thành tích khác</h2>
      <p class="sub">Tự điền các thành tích không thuộc 5 mục trên (nếu có).</p>
      <div id="ffHost"></div>
    </div>
  `;
  renderFreeform(document.getElementById("ffHost"), state.khac.items, renderKhac, "VD: Đạt học bổng KKHT loại B kỳ 2024.1");
  const nav = navButtons(() => { state.step++; render(); });
  contentEl.appendChild(nav);
}

/* =========================================================
   MỤC 9 - MINH CHỨNG HOẠT ĐỘNG
   Gom tất cả tiêu chí/hoạt động sinh viên đã chọn ở các bước trước thành
   1 checklist minh chứng theo từng mục lớn, để dễ đối chiếu khi nộp ảnh/giấy
   tờ minh chứng kèm báo cáo (thường nộp qua Drive).
   ========================================================= */
const EVIDENCE_DEFAULT_MANUAL = "Giấy chứng nhận/xác nhận/quyết định liên quan";
const EVIDENCE_DEFAULT_MEMBER = "Giấy xác nhận (của CLB/Đội/Nhóm/Ban chủ nhiệm liên quan)";
const EVIDENCE_DEFAULT_RANK = "Quyết định/giấy chứng nhận xếp loại";
const EVIDENCE_DEFAULT_ACTIVITY = "Giấy chứng nhận/xác nhận tham gia hoạt động";

// Gom minh chứng của các "group" tiêu chí phụ/chính dùng chung cho nhiều mục
function groupEvidenceItems(list, groupsState){
  const items = [];
  list.forEach(g => {
    const gs = groupsState[g.id];
    if(!gs) return;
    if(g.type === "sheet" || g.type === "manualList"){
      gs.items.forEach(it => {
        items.push({
          key: g.id + ":" + (it.id || it.name),
          label: it.name,
          method: it.minhchung || EVIDENCE_DEFAULT_ACTIVITY
        });
      });
    } else if(g.type === "manualRank"){
      if(gs.yes === true && gs.rank){
        const tpl = g.reportTemplate || g.label;
        items.push({ key:g.id, label: tpl.replace("{rank}", lowerFirst(gs.rank)), method: EVIDENCE_DEFAULT_RANK });
      }
    } else if(g.type === "manualYesNo"){
      if(gs.yes === true){
        const isMember = /là thành viên|là đội tuyển/i.test(g.label);
        const label = g.plainDetail
          ? (gs.detail ? gs.detail : g.label)
          : (gs.detail ? `${g.label.replace(/\.$/, "")} (${gs.detail})` : g.label);
        items.push({
          key: g.id,
          label: label,
          method: isMember ? EVIDENCE_DEFAULT_MEMBER : EVIDENCE_DEFAULT_MANUAL
        });
      }
    }
  });
  return items;
}

function evidenceDaoDuc(){
  const d = state.daoDuc;
  const items = [];
  if(d.renLuyenKy1!=="" && d.renLuyenKy2!=="") items.push({key:"dd-rl",label:`Điểm rèn luyện (Kỳ 1: ${d.renLuyenKy1}, Kỳ 2: ${d.renLuyenKy2})`,method:"Chụp màn hình điểm rèn luyện trên CTT",dualSlot:true});
  items.push(...groupEvidenceItems(GROUPS.daoDuc.list,d.groups));
  return items;
}

function evidenceHocTap(){
  const h = state.hocTap;
  const items = [];
  if(h.diemKy1!=="" && h.diemKy2!==""){
    items.push({key:"ht-diem", label:`Điểm học tập (Kỳ 1: ${h.diemKy1}, Kỳ 2: ${h.diemKy2})`, method:"Chụp màn hình bảng điểm trên CTT (Cổng thông tin sinh viên)", dualSlot:true});
  }
  items.push(...groupEvidenceItems(GROUPS.hocTap.list, h.groups));
  return items;
}

function evidenceTheLuc(){
  const t = state.theLuc;
  const items = [];
  if(t.hoanThanhDuGDTC){
    items.push({key:"tl-gdtc", label:"Hoàn thành đủ 05 học phần Giáo dục thể chất", method:"Chụp màn hình bảng điểm GDTC trên CTT xác nhận đã hoàn thành đủ 05 học phần"});
  } else if(t.khongDiemF === true){
    items.push({key:"tl-gdtc", label:"Không có điểm F trong các học phần GDTC đã học (2 kỳ chính)", method:"Chụp màn hình bảng điểm GDTC trên CTT xác nhận không có điểm F"});
  }
  items.push(...groupEvidenceItems(GROUPS.theLuc.list, t.groups));
  return items;
}

function evidenceTinhNguyen(){
  const tn = state.tinhNguyen;
  const items = tn.items.map((it, idx) => ({
    key: "tn-" + idx,
    label: `${it.text} (${it.days} ngày)`,
    method: /hiến máu/i.test(it.text) ? "Có giấy chứng nhận từ Ban Tổ chức" : "Giấy xác nhận/chứng nhận tham gia hoạt động tình nguyện"
  }));
  if(tn.khenThuong){
    items.push({key:"tn-khenthuong", label:"Được khen thưởng từ cấp đại học trở lên về hoạt động tình nguyện", method:"Giấy khen/quyết định khen thưởng"});
  }
  return items;
}

function evidenceHoiNhap(){
  const hn = state.hoiNhap;
  const p = state.personal;
  const items = [];
  items.push(...groupEvidenceItems(HOINHAP_FIXED, hn.fixed));
  if(hn.ngoaiNguMethod === "exempt"){
    items.push({key:"hn-ngoaingu", label:"Được miễn các học phần Tiếng Anh", method:"Xác nhận miễn học phần Tiếng Anh"});
  } else if(hn.ngoaiNguMethod === "certificate" && validateNgoaiNguCertificate(hn, validateMSSV(state.personal.mssv).khoaLabel).ok){
    items.push({key:"hn-ngoaingu", label:`${hn.ngoaiNguCertificateType} ${hn.ngoaiNguCertificateScore}`, method:"Ảnh chứng chỉ ngoại ngữ hoặc giấy xác nhận tương đương"});
  }
  items.push(...groupEvidenceItems(GROUPS.hoiNhap.list, hn.groups));
  return items;
}

function evidenceKhac(){
  return state.khac.items.map((it, idx) => ({
    key: "khac-" + idx,
    label: it.text,
    method: EVIDENCE_DEFAULT_MANUAL
  }));
}

const EVIDENCE_CARDS = [
  {key:"daoDuc",     title:"Đạo đức Tốt",           getItems: evidenceDaoDuc},
  {key:"hocTap",     title:"Học tập Tốt",           getItems: evidenceHocTap},
  {key:"theLuc",     title:"Thể lực Tốt",           getItems: evidenceTheLuc},
  {key:"tinhNguyen", title:"Tình nguyện Tốt",       getItems: evidenceTinhNguyen},
  {key:"hoiNhap",    title:"Hội nhập Tốt",          getItems: evidenceHoiNhap},
  {key:"khac",       title:"Các thành tích khác",   getItems: evidenceKhac}
];

function compressEvidenceImage(file, maxDim, quality){
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if(w > maxDim || h > maxDim){
          if(w > h){ h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(ev.target.result); // ảnh lỗi (vd HEIC không decode được) - dùng nguyên bản
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderImageSlot(container, evKey, slotLabel){
  const wrap = document.createElement("div");
  wrap.className = "evidence-img-slot";
  const existing = state.evidenceImages[evKey];

  if(existing){
    wrap.innerHTML = `
      <img src="${existing.dataUrl}" class="evidence-img-thumb" alt="minh chứng">
      <div class="evidence-img-info">
        <div class="evidence-img-name">${escapeHtml(slotLabel ? slotLabel + ": " : "")}${escapeHtml(existing.name)}</div>
        <div class="evidence-img-actions">
          <button type="button" class="evidence-img-preview">Xem ảnh</button>
          <button type="button" class="evidence-img-remove">Xóa ảnh</button>
        </div>
      </div>
    `;
    wrap.querySelector(".evidence-img-preview").onclick = (e) => {
      e.preventDefault();
      openImagePreview(existing.dataUrl, existing.name || "Ảnh minh chứng");
    };
    wrap.querySelector(".evidence-img-remove").onclick = (e) => {
      e.preventDefault();
      delete state.evidenceImages[evKey];
      state.removedEvidenceImageKeys ||= [];
      if(!state.removedEvidenceImageKeys.includes(evKey)) state.removedEvidenceImageKeys.push(evKey);
      markStateDirty();
      renderMinhChung();
    };
  } else {
    const inputId = "img_" + evKey.replace(/[^a-zA-Z0-9]/g, "_");
    wrap.innerHTML = `
      <label class="evidence-img-upload-btn" for="${inputId}">${slotLabel ? "Tải ảnh " + slotLabel : "Tải ảnh minh chứng"}</label>
      <input type="file" accept="image/*" id="${inputId}" style="display:none">
    `;
    const inputEl = wrap.querySelector("input[type=file]");
    inputEl.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const label = wrap.querySelector(".evidence-img-upload-btn");
      const originalLabelText = label.textContent;
      label.textContent = "Đang xử lý ảnh...";
      const dataUrl = await compressEvidenceImage(file, 1280, 0.75);
      state.evidenceImages[evKey] = { file, dataUrl, name: file.name, contentType:"image/jpeg" };
      state.removedEvidenceImageKeys = (state.removedEvidenceImageKeys || []).filter(key => key !== evKey);
      markStateDirty();
      renderMinhChung();
    });
  }
  container.appendChild(wrap);
}

// Card nào hiện link mẫu đơn xác nhận nào (điền/sửa ở mục Quản trị)
const EVIDENCE_CARD_LINK = {
  daoDuc:     () => ({label:"Mẫu đơn xác nhận tham gia hoạt động (chung)", url: APP_CONFIG.linkXacNhanChung}),
  hocTap:     () => ({label:"Mẫu đơn xác nhận tham gia CLB", url: APP_CONFIG.linkXacNhanCLB}),
  theLuc:     () => ({label:"Mẫu đơn xác nhận tham gia hoạt động (chung)", url: APP_CONFIG.linkXacNhanChung}),
  tinhNguyen: () => ({label:"Mẫu đơn xác nhận tham gia hoạt động ngoại khóa", url: APP_CONFIG.linkXacNhanNgoaiKhoa}),
  hoiNhap:    () => ({label:"Mẫu đơn xác nhận tham gia hoạt động (chung)", url: APP_CONFIG.linkXacNhanChung}),
  khac:       () => ({label:"Mẫu đơn xác nhận tham gia hoạt động (chung)", url: APP_CONFIG.linkXacNhanChung})
};


function normalizeEvidenceStatus(value){
  if(value === true) return "ready";
  if(value === false || value == null) return "";
  return ["later","form"].includes(value) ? value : "";
}

function hasEvidenceImageForItem(evKey, dualSlot){
  if(dualSlot){
    return Boolean(state.evidenceImages[evKey+"::ky1"]?.dataUrl && state.evidenceImages[evKey+"::ky2"]?.dataUrl);
  }
  return Boolean(state.evidenceImages[evKey]?.dataUrl);
}

function countGroupDeclarations(groupDefs, groupStates){
  const result = {declared:0, later:0, unanswered:0};
  groupDefs.forEach(g => {
    const gs = groupStates?.[g.id];
    if(!gs){ result.unanswered++; return; }
    if(gs.pending){ result.later++; return; }
    if(gs.notMet === true && gs.yes == null) gs.yes = false;
    if(g.type === "sheet" || g.type === "manualList"){
      if(gs.yes === false) result.declared++;
      else if(gs.yes === true && (gs.items || []).length >= (g.minCount || 1)) result.declared++;
      else result.unanswered++;
    } else if(g.type === "manualRank"){
      if(gs.yes === null || gs.yes === undefined) result.unanswered++;
      else if(gs.yes === true && !gs.rank) result.unanswered++;
      else result.declared++;
    } else {
      if(gs.yes === null || gs.yes === undefined) result.unanswered++;
      else if(gs.yes === true && g.plainDetail && !String(gs.detail || "").trim()) result.unanswered++;
      else result.declared++;
    }
  });
  return result;
}

function addCounts(target, source){
  target.declared += source.declared || 0;
  target.later += source.later || 0;
  target.unanswered += source.unanswered || 0;
}

function getSectionCriterionSummary(cardKey){
  const out = {declared:0, later:0, unanswered:0};
  if(cardKey === "daoDuc"){
    const d = state.daoDuc;
    (d.renLuyenKy1 !== "" && d.renLuyenKy2 !== "") ? out.declared++ : out.unanswered++;
    d.khongViPham === null || d.khongViPham === undefined ? out.unanswered++ : out.declared++;
    addCounts(out, countGroupDeclarations(GROUPS.daoDuc.list, d.groups));
  } else if(cardKey === "hocTap"){
    const h = state.hocTap;
    (h.diemKy1 !== "" && h.diemKy2 !== "" && h.tinChiKy1 !== "" && h.tinChiKy2 !== "") ? out.declared++ : out.unanswered++;
    addCounts(out, countGroupDeclarations(GROUPS.hocTap.list, h.groups));
  } else if(cardKey === "theLuc"){
    const t = state.theLuc;
    (t.hoanThanhDuGDTC || t.khongDiemF !== null) ? out.declared++ : out.unanswered++;
    addCounts(out, countGroupDeclarations(GROUPS.theLuc.list, t.groups));
  } else if(cardKey === "tinhNguyen"){
    const tn = state.tinhNguyen;
    const total=(tn.items||[]).reduce((sum,it)=>sum+(Number(it.days)||0),0);
    if(total >= 5) out.declared++;
    else if(tn.pending) out.later++;
    else out.unanswered++;
  } else if(cardKey === "hoiNhap"){
    const hn = state.hoiNhap;
    addCounts(out, countGroupDeclarations(HOINHAP_FIXED, hn.fixed));
    const certOk=hn.ngoaiNguMethod==="certificate" && validateNgoaiNguCertificate(hn, validateMSSV(state.personal.mssv).khoaLabel).ok;
    if(hn.ngoaiNguPending || hn.ngoaiNguMethod==="exempt" || hn.ngoaiNguMethod==="notMet" || certOk) { hn.ngoaiNguPending ? out.later++ : out.declared++; } else out.unanswered++;
    addCounts(out, countGroupDeclarations(GROUPS.hoiNhap.list, hn.groups));
  } else if(cardKey === "khac"){
    out.declared++;
  }
  return out;
}

function buildSubmissionReview(){
  const rows = EVIDENCE_CARDS.map(card => {
    const criteria = getSectionCriterionSummary(card.key);
    const items = card.getItems();
    let ready=0, later=0, missing=0;
    items.forEach(it=>{
      const evKey=card.key+"::"+it.key;
      if(hasEvidenceImageForItem(evKey,it.dualSlot)) ready++;
      else {
        const status=normalizeEvidenceStatus(state.evidence[evKey]);
        if(status==="later") later++;
        else if(status==="form") ready++;
        else missing++;
      }
    });
    return {key:card.key,title:card.title,criteria,evidence:{ready,later,missing,total:items.length}};
  });
  const blockers=rows.reduce((sum,row)=>sum+row.criteria.unanswered+row.evidence.missing,0);
  return {rows,blockers};
}

async function fetchServerSubmissionReview(){
  const res=await fetch('/api/submissions/review',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      fullName:state.personal.fullName,
      mssv:state.personal.mssv,
      className:state.personal.className,
      data:serializeStateForStorage({includeImageData:false}),
      evidenceImages:buildEvidenceImagesPayload(),
      removedEvidenceImageKeys:[...(state.removedEvidenceImageKeys || [])]
    })
  });
  const result=await res.json().catch(()=>({success:false,message:'Phản hồi máy chủ không hợp lệ.'}));
  if(!res.ok||!result.success) throw new Error(result.message||'Không kiểm tra được hồ sơ.');
  return result.review;
}

function formatReviewIssue(issue){
  const text=String(issue||"");
  const exact={
    "HN-F":"Hội nhập: tiêu chí cũ không còn áp dụng",
    "DD-G1":"Đạo đức: cuộc thi/diễn đàn về lý luận chính trị và tư tưởng Hồ Chí Minh",
    "DD-G2":"Đạo đức: xếp loại đảng viên",
    "DD-G3":"Đạo đức: lớp bồi dưỡng nhận thức về Đảng",
    "DD-G4":"Đạo đức: hoạt động về Đảng, Đoàn - Hội",
    "DD-G5":"Đạo đức: thanh niên tiêu biểu/người tốt việc tốt",
    "HT-G1":"Học tập: thành viên ban chuyên môn CLB học thuật",
    "HT-G2":"Học tập: đề tài nghiên cứu khoa học sinh viên",
    "HT-G3":"Học tập: kỳ thi/cuộc thi học thuật",
    "HT-G4":"Học tập: nhóm nghiên cứu khoa học",
    "HT-G5":"Học tập: bài tham luận/tạp chí chuyên ngành",
    "HT-G6":"Học tập: sản phẩm sáng tạo/giải thưởng",
    "TL-G1":"Thể lực: danh hiệu Sinh viên khỏe/Thanh niên khỏe",
    "TL-G2":"Thể lực: ít nhất 02 hoạt động thể dục thể thao",
    "TL-G3":"Thể lực: thành viên đội tuyển thể thao",
    "TL-G4":"Thể lực: thành viên CLB thể thao",
    "HN-KHOA-HOC":"Hội nhập: khóa kỹ năng hoặc khen thưởng Đoàn/Hội",
    "HN-CAP-DAI-HOC":"Hội nhập: hoạt động hội nhập cấp đại học",
    "HN-G1":"Hội nhập: hoạt động giao lưu quốc tế",
    "HN-G2":"Hội nhập: cuộc thi kiến thức hội nhập/ngoại ngữ",
    "theLuc::tl-gdtc":"Thể lực: minh chứng Giáo dục thể chất",
    "hoiNhap::hn-ngoaingu":"Hội nhập: minh chứng ngoại ngữ",
    "daoDuc::dd-rl":"Đạo đức: minh chứng điểm rèn luyện",
    "hocTap::ht-diem":"Học tập: minh chứng bảng điểm"
  };
  const [key,reason]=text.split(/:\s*/,2);
  const label=exact[key] || key
    .replace(/^daoDuc::/,"Đạo đức: ")
    .replace(/^hocTap::/,"Học tập: ")
    .replace(/^theLuc::/,"Thể lực: ")
    .replace(/^tinhNguyen::/,"Tình nguyện: ")
    .replace(/^hoiNhap::/,"Hội nhập: ")
    .replace(/^khac::/,"Thành tích khác: ");
  if(!reason) return label;
  if(reason.includes("link đơn")) return `${label} — link đơn đang trống hoặc không đúng định dạng HTTPS (hãy tự kiểm tra quyền ở cửa sổ ẩn danh)`;
  return `${label} — ${reason}`;
}

async function openSubmissionReviewDialog(){
  let review;
  try{
    review=await fetchServerSubmissionReview();
  }catch(err){
    await appAlert(err.message||'Không kiểm tra được hồ sơ trên máy chủ.','Không thể kiểm tra hồ sơ');
    return false;
  }
  const tbody=(review.rows||[]).map(row => `
    <tr>
      <td>${escapeHtml(row.title)}</td>
      <td>${row.criteria.declared}</td>
      <td>${row.criteria.later}</td>
      <td class="${row.criteria.unanswered ? 'review-danger' : ''}">${row.criteria.unanswered}</td>
      <td>${row.evidence.ready}</td>
      <td>${row.evidence.later}</td>
      <td class="${row.evidence.missing ? 'review-danger' : ''}">${row.evidence.missing}</td>
    </tr>`).join('');
  document.getElementById('submissionReviewBody').innerHTML=tbody;
  const message=document.getElementById('submissionReviewMessage');
  const confirmBtn=document.getElementById('submissionReviewConfirm');
  if(review.blockers){
    message.className='review-message review-message-error';
    const details=[...(review.missingCriteria||[]),...(review.missingEvidence||[])].map(formatReviewIssue).slice(0,5);
    message.textContent=`Còn ${review.criteriaMissing} tiêu chí và ${review.evidenceMissing} minh chứng chưa khai báo đầy đủ.${details.length?' Cần kiểm tra: '+details.join('; '):''}`;
    confirmBtn.disabled=true;
  }else{
    const totalLater=(review.rows||[]).reduce((s,r)=>s+r.criteria.later+r.evidence.later,0);
    message.className='review-message review-message-ok';
    message.textContent=totalLater?`Hồ sơ đã được khai báo đầy đủ. Có ${totalLater} mục được đánh dấu bổ sung sau và vẫn có thể gửi.`:'Hồ sơ đã được khai báo đầy đủ và có thể gửi.';
    confirmBtn.disabled=false;
  }
  showOnlyModal('submissionReviewModal');
  return new Promise(resolve=>{
    const close=result=>{closeAllModals();resolve(result);};
    document.getElementById('submissionReviewCancel').onclick=()=>close(false);
    confirmBtn.onclick=()=>close(true);
  });
}

function renderMinhChung(){
  contentEl.innerHTML = `
    <div class="card">
      <h2>Minh chứng hoạt động</h2>
      <p class="sub">Đánh dấu các hoạt động đã chuẩn bị xong ảnh/giấy tờ minh chứng, dùng để đối chiếu khi nộp minh chứng qua drive.</p>
      <div class="evidence-grid" id="evidenceGrid"></div>
    </div>
  `;
  const grid = document.getElementById("evidenceGrid");

  EVIDENCE_CARDS.forEach(cardDef => {
    const items = cardDef.getItems();
    const doneCount = items.filter(it => { const key=cardDef.key+"::"+it.key; return hasEvidenceImageForItem(key,it.dualSlot) || normalizeEvidenceStatus(state.evidence[key]) === "form"; }).length;
    const total = items.length;
    const pct = total ? Math.round(doneCount/total*100) : 0;
    const isOpen = state.evidenceExpanded === cardDef.key;

    const card = document.createElement("div");
    card.className = "evidence-card" + (isOpen ? " open" : "");

    const header = document.createElement("div");
    header.className = "evidence-card-header";
    header.innerHTML = `
      <div class="evidence-card-info">
        <div class="evidence-card-title">${escapeHtml(cardDef.title)}</div>
        <div class="evidence-card-count ${total>0 && doneCount===total ? 'all-done' : ''}">${total===0 ? 'Chưa có hoạt động nào' : `${doneCount}/${total} hoạt động đã có minh chứng`}</div>
      </div>
      <div class="evidence-card-chevron">${isOpen ? '▲' : '▼'}</div>
    `;
    header.onclick = () => {
      state.evidenceExpanded = isOpen ? null : cardDef.key;
      renderMinhChung();
    };
    card.appendChild(header);

    if(total > 0){
      const bar = document.createElement("div");
      bar.className = "evidence-progress";
      bar.innerHTML = `<div class="evidence-progress-fill" style="width:${pct}%"></div>`;
      card.appendChild(bar);
    }

    if(isOpen){
      const body = document.createElement("div");
      body.className = "evidence-card-body";

      const linkInfo = (EVIDENCE_CARD_LINK[cardDef.key] || (()=>null))();
      if(linkInfo && linkInfo.url){
        const linkBar = document.createElement("div");
        linkBar.className = "evidence-form-link";
        const safeUrl = isValidHttpsUrl(linkInfo.url) ? linkInfo.url : "";
        if(safeUrl){
          linkBar.innerHTML = `${escapeHtml(linkInfo.label)}: <a href="${escapeHtmlAttr(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(safeUrl)}</a>`;
        } else {
          linkBar.textContent = `${linkInfo.label}: link cấu hình không hợp lệ`;
        }
        body.appendChild(linkBar);
      }

      if(total === 0){
        const p = document.createElement("p");
        p.className = "hint";
        p.textContent = "Chưa chọn hoạt động nào ở mục này - quay lại bước tương ứng để thêm.";
        body.appendChild(p);
      } else {
        items.forEach(it => {
          const evKey = cardDef.key+"::"+it.key;
          const evStatus = normalizeEvidenceStatus(state.evidence[evKey]);
          const hasImage = hasEvidenceImageForItem(evKey, it.dualSlot);
          const row = document.createElement("div");
          row.className = "evidence-item" + (hasImage ? " checked" : evStatus === "later" ? " pending" : "");

          const top = document.createElement("div");
          top.className = "evidence-item-main";
          top.innerHTML = `
            <div class="evidence-item-text">
              <div class="evidence-item-label">${escapeHtml(it.label)}</div>
              <div class="evidence-item-method">Minh chứng: ${escapeHtml(it.method)}</div>
              <div class="evidence-auto-status ${hasImage ? "ready" : ""}">${hasImage ? "Đã đủ ảnh minh chứng" : "Chưa đủ ảnh minh chứng"}</div>
            </div>
            <div class="evidence-choice-box">
              <label><input type="checkbox" class="ev-later" ${evStatus === "later" ? "checked" : ""}> Bổ sung sau</label>
              <label><input type="checkbox" class="ev-form" ${evStatus === "form" ? "checked" : ""}> Minh chứng bằng đơn</label>
            </div>`;
          top.querySelector(".ev-later").onchange=e=>{ state.evidence[evKey]=e.target.checked?"later":""; if(e.target.checked) delete state.evidenceForms[evKey]; markStateDirty(); renderMinhChung(); };
          top.querySelector(".ev-form").onchange=e=>{ state.evidence[evKey]=e.target.checked?"form":""; if(!e.target.checked) delete state.evidenceForms[evKey]; markStateDirty(); renderMinhChung(); };
          row.appendChild(top);
          if(evStatus === "form"){
            const formWrap=document.createElement("div"); formWrap.className="evidence-form-url field";
            const label=document.createElement("label"); label.textContent="Link đơn minh chứng (phải mở quyền truy cập cho người có link)";
            const input=document.createElement("input"); input.type="url"; input.placeholder="https://drive.google.com/..."; input.value=state.evidenceForms[evKey]||"";
            const hint=document.createElement("div"); hint.className="hint"; hint.textContent="Hãy kiểm tra link ở cửa sổ ẩn danh trước khi gửi.";
            input.addEventListener("input",e=>{state.evidenceForms[evKey]=e.target.value.trim();markStateDirty();});
            formWrap.append(label,input,hint); row.appendChild(formWrap);
          }

          const imgRow = document.createElement("div");
          imgRow.className = "evidence-img-row";
          if(it.dualSlot){
            renderImageSlot(imgRow, evKey+"::ky1", "Kỳ 1");
            renderImageSlot(imgRow, evKey+"::ky2", "Kỳ 2");
          } else {
            renderImageSlot(imgRow, evKey, "");
          }
          row.appendChild(imgRow);

          body.appendChild(row);
        });
      }
      card.appendChild(body);
    }

    grid.appendChild(card);
  });

  const nav = navButtons(() => { state.step++; render(); });
  contentEl.appendChild(nav);
}

/* =========================================================
   5. XEM TRƯỚC & XUẤT
   ========================================================= */
function buildColumnHtml(numberedItems){
  let html = "";
  let n = 1;
  numberedItems.forEach(it => {
    const colorStyle = it.color === "red" ? ' style="color:#b3261e; font-weight:600"' : it.color === "green" ? ' style="color:#1e7d4b; font-weight:600"' : "";
    if(it.plain){
      html += `<div${colorStyle}>${escapeHtml(it.text)}</div>`;
    } else {
      html += `<div${colorStyle}><span class="num">${n}.</span> ${escapeHtml(it.text)}</div>`;
      n++;
    }
  });
  return html;
}

function pickedGroupItemNames(groupsDef, groupsState){
  const entries = [];
  groupsDef.list.forEach(g => {
    const gs = groupsState[g.id];
    if(gs.pending){
      entries.push({text:`Bổ sung sau: ${g.label}`, color:"red"});
      return;
    }
    if(gs.notMet || gs.yes===false) return;
    if(g.type === "sheet" || g.type === "manualList"){
      gs.items.forEach(it => entries.push(it.proposed ? {text:it.name, color:"green"} : {text:it.name}));
    } else if(g.type === "manualRank"){
      if(gs.yes === true && gs.rank){
        const tpl = g.reportTemplate || g.label;
        entries.push({text:tpl.replace("{rank}", lowerFirst(gs.rank))});
      }
    } else {
      if(gs.yes === true){
        if(g.plainDetail){
          // Chỉ ghi đúng nội dung sinh viên tự điền, không lặp lại cả câu tiêu chí gốc
          entries.push({text: gs.detail ? gs.detail : g.label});
        } else {
          const base = g.label.replace(/\.$/, "");
          entries.push({text: gs.detail ? `${base} (${gs.detail}).` : g.label});
        }
      }
    }
  });
  return entries;
}

function getDaoDucLines(){
  const d=state.daoDuc; const lines=[];
  const avg=(d.renLuyenKy1!==""&&d.renLuyenKy2!=="")?((Number(d.renLuyenKy1)+Number(d.renLuyenKy2))/2).toFixed(1):"";
  lines.push({text:"Điểm rèn luyện:"},{text:`+ Kỳ 1: ${d.renLuyenKy1}`,plain:true},{text:`+ Kỳ 2: ${d.renLuyenKy2}`,plain:true},{text:`Trung bình: ${avg}`,plain:true});
  if(d.khongViPham===true) lines.push({text:"Không vi phạm pháp luật và các quy chế, nội quy của Nhà trường, quy định của địa phương và cộng đồng."});
  pickedGroupItemNames(GROUPS.daoDuc,d.groups).forEach(entry=>lines.push(entry)); return lines;
}
function getHocTapLines(){
  const h = state.hocTap;
  const dien = HOCTAP_DIEN[h.dien];
  const avg = calculateWeightedGpa(h) !== null ? calculateWeightedGpa(h).toFixed(2) : "";
  const lines = [];
  lines.push({text:"Điểm học tập:"});
  lines.push({text:`+ Kỳ 1: ${h.diemKy1}/${dien.scale} (${h.tinChiKy1} tín chỉ)`, plain:true});
  lines.push({text:`+ Kỳ 2: ${h.diemKy2}/${dien.scale} (${h.tinChiKy2} tín chỉ)`, plain:true});
  lines.push({text:`Trung bình: ${avg}`, plain:true});
  pickedGroupItemNames(GROUPS.hocTap, h.groups).forEach(entry => lines.push(entry));
  return lines;
}
function getTheLucLines(){
  const t = state.theLuc;
  const lines = [];
  if(t.hoanThanhDuGDTC){
    lines.push({text:"Hoàn thành chương trình đào tạo giáo dục thể chất theo quy định tại Đại học Bách khoa Hà Nội."});
  } else if(t.khongDiemF === true) {
    lines.push({text:"Không có điểm F nào trong tất cả các học phần giáo dục thể chất đã học trong 2 kỳ chính trong năm học."});
  }
  pickedGroupItemNames(GROUPS.theLuc, t.groups).forEach(entry => lines.push(entry));
  return lines;
}
function getTinhNguyenLines(){
  const tn = state.tinhNguyen;
  const lines = tn.items.map(it => ({text:`${it.text} (${it.days} ngày)`}));
  const total = tn.items.reduce((s,it)=>s+(Number(it.days)||0),0);
  lines.push({text:`Tổng số ngày tình nguyện: ${total} ngày.`, plain:true});
  if(total < 5 && tn.pending) lines.push({text:`Còn thiếu/cần bổ sung sau ${Math.max(0,5-total)} ngày.`, color:"red"});
  if(tn.khenThuong) lines.push({text:"Được khen thưởng từ cấp đại học trở lên về hoạt động tình nguyện."});
  return lines;
}
function getHoiNhapLines(){
  const hn = state.hoiNhap;
  const lines = [];
  HOINHAP_FIXED.forEach(g => {
    const gs = hn.fixed[g.id];
    if(gs.pending){
      lines.push({text:`Bổ sung sau: ${g.label}`, color:"red"});
    } else if(gs.notMet || gs.yes===false){
      return;
    } else {
      gs.items.forEach(it => lines.push(it.proposed ? {text:it.name, color:"green"} : {text:it.name}));
    }
  });
  if(hn.ngoaiNguPending){
    lines.push({text:"Chuẩn ngoại ngữ: cần bổ sung sau.", color:"red"});
  } else if(hn.ngoaiNguMethod === "exempt"){
    lines.push({text:"Được miễn các học phần Tiếng Anh."});
  } else if(hn.ngoaiNguMethod === "certificate" && hn.ngoaiNguCertificateType && hn.ngoaiNguCertificateScore !== ""){
    lines.push({text:`${hn.ngoaiNguCertificateType}: ${hn.ngoaiNguCertificateScore} điểm.`});
  }
  pickedGroupItemNames(GROUPS.hoiNhap, hn.groups).forEach(entry => lines.push(entry));
  return lines;
}
function getSimpleLines(items){
  return items.map(it => ({text: it.text}));
}
function getPositionsText(){
  return state.personal.positions.filter(x=>x && x.trim()).join(" - ");
}
function getPositionsList(){
  return state.personal.positions.filter(x=>x && x.trim());
}

function renderPreview(){
  const p = state.personal;
  const mssvCheck = validateMSSV(p.mssv);
  const email = genEmail(p.fullName, p.mssv);

  const daoDucHtml = buildColumnHtml(getDaoDucLines());
  const hocTapHtml = buildColumnHtml(getHocTapLines());
  const theLucHtml = buildColumnHtml(getTheLucLines());
  const tinhNguyenHtml = buildColumnHtml(getTinhNguyenLines());
  const hoiNhapHtml = buildColumnHtml(getHoiNhapLines());
  const khacHtml = buildColumnHtml(getSimpleLines(state.khac.items));

  contentEl.innerHTML = `
    <div class="card">
      <h2>Xem trước báo cáo</h2>
      <p class="sub">Kiểm tra lại toàn bộ nội dung trước khi xuất file. File xuất ra giữ đúng khối tiêu đề/xác nhận của mẫu gốc, khổ ngang.</p>

      <div class="preview-doc" id="previewDoc" style="position:relative">
        <div style="position:absolute; top:0; left:0; width:70px; height:91px; text-align:center; font-size:11px; font-weight:bold; padding-top:4px; border:1px solid #000; box-sizing:border-box; z-index:2">Ảnh 4x6</div>
        <table style="margin-bottom:10px">
          <tr>
            <td style="width:60%;font-size:16.9px" class="center">HỘI SINH VIÊN VIỆT NAM THÀNH PHỐ HÀ NỘI<br><b>BCH ĐẠI HỌC BÁCH KHOA HÀ NỘI</b><br><b>***</b></td>
            <td style="width:40%;font-size:18.2px" class="center"><b><u>HỘI SINH VIÊN VIỆT NAM</u></b></td>
          </tr>
        </table>
        <div class="titleblock">
          <h3 style="font-size:20.8px">BÁO CÁO THÀNH TÍCH</h3>
          <div class="bold" style="font-size:18.2px">ĐỀ NGHỊ CÔNG NHẬN DANH HIỆU SINH VIÊN 5 TỐT CẤP ĐẠI HỌC</div>
          <div class="bold" style="font-size:18.2px">NĂM ${REPORT_YEAR}</div>
        </div>
        <table>
          <tr><td class="center bold" colspan="7" style="font-size:13px">THÀNH TÍCH</td></tr>
          <tr>
            <td></td>
            <td class="center bold">Đạo đức</td>
            <td class="center bold">Học tập</td>
            <td class="center bold">Thể lực</td>
            <td class="center bold">Tình nguyện</td>
            <td class="center bold">Hội nhập</td>
            <td class="center bold">Các thành tích khác</td>
          </tr>
          <tr>
            <td>
              <div><b>Họ và tên:</b> ${escapeHtml(p.fullName)}</div>
              <div><b>MSSV:</b> ${escapeHtml(p.mssv)}</div>
              <div><b>Giới tính:</b> ${escapeHtml(p.gender)}</div>
              <div><b>Năm sinh:</b> ${escapeHtml(p.birthYear)}</div>
              <div><b>Dân tộc:</b> ${escapeHtml(p.ethnicity)}</div>
              <div><b>Sinh viên năm thứ:</b> ${mssvCheck.ok ? mssvCheck.year : "-"}</div>
              <div><b>Lớp:</b> ${escapeHtml(p.className)}</div>
              <div><b>Khoa/Trường:</b> ${escapeHtml(p.khoaTruong)}</div>
              <div><b>Chức vụ Đoàn, Hội:</b>${getPositionsList().length ? getPositionsList().map(pos=>`<br>- ${escapeHtml(pos)}`).join("") : ""}</div>
              <div><b>Đảng viên/Đoàn viên:</b> ${escapeHtml(p.partyStatus)}</div>
              <div><b>Số điện thoại:</b> ${escapeHtml(p.phone)}</div>
              <div><b>Email:</b> ${escapeHtml(email)}</div>
            </td>
            <td>${daoDucHtml}</td>
            <td>${hocTapHtml}</td>
            <td>${theLucHtml}</td>
            <td>${tinhNguyenHtml}</td>
            <td>${hoiNhapHtml}</td>
            <td>${khacHtml}</td>
          </tr>
        </table>
        <table style="margin-top:10px">
          <tr>
            <td class="center bold" style="width:33%;font-size:14.3px">XÁC NHẬN CỦA BAN CHẤP HÀNH<br>HỘI SINH VIÊN TRƯỜNG ${escapeHtml((p.khoaTruong||"...").toUpperCase())}</td>
            <td class="center bold" style="width:34%;font-size:14.3px">XÁC NHẬN CỦA BAN THƯ KÝ HỘI SINH VIÊN ĐẠI HỌC</td>
            <td style="width:33%;font-size:14.3px" class="center">
              <i>Hà Nội, ngày</i>
              <input type="text" id="rdDay" maxlength="2" value="${escapeHtmlAttr(state.reportDate.day)}" placeholder="...." style="width:32px;text-align:center;font-family:inherit;font-size:inherit;font-style:italic;border:none;border-bottom:1px dotted #666">
              <i>tháng</i>
              <input type="text" id="rdMonth" maxlength="2" value="${escapeHtmlAttr(state.reportDate.month)}" placeholder="...." style="width:32px;text-align:center;font-family:inherit;font-size:inherit;font-style:italic;border:none;border-bottom:1px dotted #666">
              <i>năm</i>
              <input type="text" id="rdYear" maxlength="4" value="${escapeHtmlAttr(state.reportDate.year)}" style="width:48px;text-align:center;font-family:inherit;font-size:inherit;font-style:italic;border:none;border-bottom:1px dotted #666">
              <br><b>NGƯỜI BÁO CÁO</b>
            </td>
          </tr>
        </table>
      </div>

      <div class="export-bar no-print">
        <button class="btn btn-export" onclick="exportDocx()">Tải file Word</button>
        <button class="btn btn-secondary" id="saveLocalBtn">Lưu local trên máy</button>
        <button class="btn btn-primary" id="submitSupabaseBtn">${getSubmissionButtonLabel()}</button>
      </div>
      <div id="lastSubmissionInfo" class="submission-sent-info">${getLastSubmissionInfoHtml()}</div>
      <div id="submitStatusMsg"></div>
    </div>
  `;

  document.getElementById("saveLocalBtn").onclick = saveDraftToLocalStorage;
  document.getElementById("submitSupabaseBtn").onclick = handleSubmitToBanSV5T;

  const nav = navButtons(() => {}, "");
  nav.querySelector(".btn-primary").style.display = "none";
  contentEl.appendChild(nav);

  ["rdDay","rdMonth","rdYear"].forEach(id => {
    const el = document.getElementById(id);
    const key = id === "rdDay" ? "day" : id === "rdMonth" ? "month" : "year";
    el.addEventListener("input", e => { state.reportDate[key] = e.target.value; });
  });
}

/* ---------- Xuất Word (.docx) - giữ khối tiêu đề + xác nhận của file gốc ---------- */
function exportDocx(){
  if(typeof docx === "undefined"){
    alert("Không tải được thư viện tạo file Word (cần kết nối mạng). Vui lòng kiểm tra lại kết nối mạng rồi thử lại.");
    return;
  }
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, PageOrientation, convertInchesToTwip, VerticalAlign, UnderlineType, FrameAnchorType, FrameWrap, BorderStyle, HeightRule } = docx;

  const p = state.personal;
  const mssvCheck = validateMSSV(p.mssv);
  const email = genEmail(p.fullName, p.mssv);
  const FONT = "Times New Roman";
  const T = (text, opts) => new TextRun(Object.assign({text, font:FONT, size:20}, opts||{}));
  const Ppar = (children, opts) => new Paragraph(Object.assign({children}, opts||{}));

  function cellParagraphs(lines){
    return lines.map(l => {
      const colorHex = l.color === "red" ? "B3261E" : l.color === "green" ? "1E7D4B" : undefined;
      const runOpts = colorHex ? {color: colorHex, bold:true} : {};
      return new Paragraph({
        children: l.plain
          ? [T(l.text, colorHex ? {color: colorHex, bold:true} : {})]
          : [T(l.num ? l.num+"." : "", Object.assign({bold:true}, colorHex ? {color: colorHex} : {})), T(" "+l.text, colorHex ? {color: colorHex, bold:true} : {})]
      });
    });
  }
  function numberLines(rawLines){
    let n = 1;
    return rawLines.map(l => {
      if(l.plain) return {text:l.text, plain:true, color:l.color};
      const withNum = {text:l.text, num:n, color:l.color};
      n++;
      return withNum;
    });
  }

  const positionsList = getPositionsList();
  const positionParagraphs = positionsList.length
    ? [
        Ppar([T("Chức vụ Đoàn, Hội:", {bold:true})]),
        ...positionsList.map(pos => Ppar([T("- " + pos)]))
      ]
    : [ Ppar([T("Chức vụ Đoàn, Hội: ", {bold:true}), T("")]) ];

  const personalLines = [
    Ppar([T("Họ và tên: ", {bold:true}), T(p.fullName)]),
    Ppar([T("MSSV: ", {bold:true}), T(p.mssv)]),
    Ppar([T("Giới tính: ", {bold:true}), T(p.gender)]),
    Ppar([T("Năm sinh: ", {bold:true}), T(p.birthYear)]),
    Ppar([T("Dân tộc: ", {bold:true}), T(p.ethnicity)]),
    Ppar([T("Sinh viên năm thứ: ", {bold:true}), T(mssvCheck.ok ? String(mssvCheck.year) : "")]),
    Ppar([T("Lớp: ", {bold:true}), T(p.className)]),
    Ppar([T("Khoa/Trường: ", {bold:true}), T(p.khoaTruong)]),
    ...positionParagraphs,
    Ppar([T("Đảng viên/Đoàn viên: ", {bold:true}), T(p.partyStatus)]),
    Ppar([T("Số điện thoại: ", {bold:true}), T(p.phone)]),
    Ppar([T("Email: ", {bold:true}), T(email)])
  ];

  function mkCell(children, widthPct, opts){
    return new TableCell(Object.assign({
      width:{size:widthPct, type:WidthType.PERCENTAGE},
      margins:{top:60, bottom:60, left:120, right:100},
      children: children.length ? children : [Ppar([T("")])]
    }, opts||{}));
  }
  function headerCell(text){
    return mkCell([Ppar([T(text, {bold:true})], {alignment:AlignmentType.CENTER})], 14.3);
  }

  // ---- Khối tiêu đề: dùng 3 KHUNG NỔI (frame) độc lập, neo tuyệt đối cùng y=0,
  //      thay vì dùng bảng - vì bảng KHÔNG chảy quanh khung nổi được (chỉ đoạn văn bản
  //      thường mới chảy quanh khung nổi), nên trước đây bảng bị đẩy xuống dưới khung ảnh
  //      thay vì nằm ngang hàng. Dùng frame cho cả 3 khối đảm bảo luôn cùng 1 hàng. ----
  const CM_TWIP = 566.929;
  const PHOTO_W_CM = 2.35; // ngang
  const PHOTO_H_CM = 3.05; // dọc
  const PAGE_CONTENT_WIDTH = convertInchesToTwip(11.69) - 720 - 720; // khổ ngang trừ lề trái/phải
  const photoGap = 150; // khoảng cách nhỏ giữa khung ảnh và khối tổ chức
  const photoWidthTwip = Math.round(PHOTO_W_CM * CM_TWIP);
  const headerHeightTwip = Math.round(PHOTO_H_CM * CM_TWIP);
  const orgTextX = photoWidthTwip + photoGap;
  const orgTextWidth = Math.round((PAGE_CONTENT_WIDTH - photoWidthTwip) * 0.52);
  const hsvX = orgTextX + orgTextWidth;
  const hsvWidth = PAGE_CONTENT_WIDTH - orgTextX - orgTextWidth;
  const HEADER_SPACER_AFTER = 260; // canh để có khoảng 1 dòng trống trước tiêu đề

  const photoFrame = Ppar([T("Ảnh 4x6", {bold:true})], {
    alignment: AlignmentType.CENTER,
    spacing: { before:0, after:0 },
    frame: {
      type: "absolute",
      position: { x: 0, y: 0 },
      width: photoWidthTwip,
      height: headerHeightTwip,
      anchor: { horizontal: FrameAnchorType.MARGIN, vertical: FrameAnchorType.MARGIN },
      wrap: FrameWrap.AROUND
    },
    border: {
      top:{style:BorderStyle.SINGLE, size:4, color:"000000"},
      bottom:{style:BorderStyle.SINGLE, size:4, color:"000000"},
      left:{style:BorderStyle.SINGLE, size:4, color:"000000"},
      right:{style:BorderStyle.SINGLE, size:4, color:"000000"}
    }
  });

  // Cả 3 đoạn văn bản của khối tên tổ chức dùng CHUNG 1 cấu hình frame (cùng x,y,w,h)
  // để Word gộp chúng vào cùng một khung nổi duy nhất.
  const orgFrameCfg = {
    type: "absolute",
    position: { x: orgTextX, y: 0 },
    width: orgTextWidth,
    height: headerHeightTwip,
    rule: HeightRule.AUTO,
    anchor: { horizontal: FrameAnchorType.MARGIN, vertical: FrameAnchorType.MARGIN },
    wrap: FrameWrap.AROUND
  };
  const orgLine1 = Ppar([T("HỘI SINH VIÊN VIỆT NAM THÀNH PHỐ HÀ NỘI", {size:26})], {alignment:AlignmentType.CENTER, spacing:{before:0,after:0}, frame: orgFrameCfg});
  const orgLine2 = Ppar([T("BCH ĐẠI HỌC BÁCH KHOA HÀ NỘI", {bold:true, size:26})], {alignment:AlignmentType.CENTER, spacing:{before:0,after:0}, frame: orgFrameCfg});
  const orgLine3 = Ppar([T("***", {bold:true, size:26})], {alignment:AlignmentType.CENTER, spacing:{before:0,after:0}, frame: orgFrameCfg});

  const hsvFrameCfg = {
    type: "absolute",
    position: { x: hsvX, y: 0 },
    width: hsvWidth,
    height: headerHeightTwip,
    rule: HeightRule.AUTO,
    anchor: { horizontal: FrameAnchorType.MARGIN, vertical: FrameAnchorType.MARGIN },
    wrap: FrameWrap.AROUND
  };
  const hsvLine = Ppar([T("HỘI SINH VIÊN VIỆT NAM", {bold:true, size:28, underline:{type:UnderlineType.SINGLE}})], {alignment:AlignmentType.CENTER, spacing:{before:0,after:0}, frame: hsvFrameCfg});

  // Đoạn trống để "đẩy" nội dung phía sau (tiêu đề báo cáo) xuống dưới, tránh đè lên
  // 3 khung nổi ở trên (vì khung nổi không chiếm chỗ trong dòng chảy văn bản bình thường).
  // Giá trị được đo & hiệu chỉnh thực nghiệm (xem ghi chú lúc build) để chỉ cách đúng ~1 dòng.
  const headerSpacer = Ppar([T("")], { spacing:{ before:0, after: HEADER_SPACER_AFTER } });

  const thanhTichRow = new TableRow({children:[
    new TableCell({columnSpan:7, margins:{top:60,bottom:60,left:120,right:100}, children:[
      Ppar([T("THÀNH TÍCH", {bold:true, size:20})], {alignment:AlignmentType.CENTER})
    ]})
  ]});

  const headerRow = new TableRow({children:[
    mkCell([Ppar([T("")])], 14),
    headerCell("Đạo đức"), headerCell("Học tập"), headerCell("Thể lực"),
    headerCell("Tình nguyện"), headerCell("Hội nhập"), headerCell("Các thành tích khác")
  ]});

  const dataRow = new TableRow({children:[
    mkCell(personalLines, 14),
    mkCell(cellParagraphs(numberLines(getDaoDucLines())), 14.3),
    mkCell(cellParagraphs(numberLines(getHocTapLines())), 14.3),
    mkCell(cellParagraphs(numberLines(getTheLucLines())), 14.3),
    mkCell(cellParagraphs(numberLines(getTinhNguyenLines())), 14.3),
    mkCell(cellParagraphs(numberLines(getHoiNhapLines())), 14.3),
    mkCell(cellParagraphs(numberLines(getSimpleLines(state.khac.items))), 14.3),
  ]});

  const mainTable = new Table({
    width:{size:100, type:WidthType.PERCENTAGE},
    rows:[thanhTichRow, headerRow, dataRow]
  });

  // ---- Khối xác nhận + chữ ký (giữ đúng nội dung file mẫu, cỡ chữ 11) ----
  const confirmTable = new Table({
    width:{size:100, type:WidthType.PERCENTAGE},
    borders:{ top:{style:"none",size:0,color:"FFFFFF"}, bottom:{style:"none",size:0,color:"FFFFFF"}, left:{style:"none",size:0,color:"FFFFFF"}, right:{style:"none",size:0,color:"FFFFFF"}, insideHorizontal:{style:"none",size:0,color:"FFFFFF"}, insideVertical:{style:"none",size:0,color:"FFFFFF"} },
    rows:[ new TableRow({children:[
      new TableCell({width:{size:33,type:WidthType.PERCENTAGE}, children:[
        Ppar([T("XÁC NHẬN CỦA BAN CHẤP HÀNH", {bold:true, size:22})], {alignment:AlignmentType.CENTER}),
        Ppar([T("HỘI SINH VIÊN TRƯỜNG " + (p.khoaTruong||"").toUpperCase(), {bold:true, size:22})], {alignment:AlignmentType.CENTER})
      ]}),
      new TableCell({width:{size:34,type:WidthType.PERCENTAGE}, children:[
        Ppar([T("XÁC NHẬN CỦA BAN THƯ KÝ HỘI SINH VIÊN ĐẠI HỌC", {bold:true, size:22})], {alignment:AlignmentType.CENTER})
      ]}),
      new TableCell({width:{size:33,type:WidthType.PERCENTAGE}, children:[
        Ppar([T("Hà Nội, ngày " + (state.reportDate.day || "......") + " tháng " + (state.reportDate.month || "......") + " năm " + (state.reportDate.year || String(new Date().getFullYear())), {italics:true, size:22})], {alignment:AlignmentType.CENTER}),
        Ppar([T("NGƯỜI BÁO CÁO", {bold:true, size:22})], {alignment:AlignmentType.CENTER})
      ]})
    ]})]
  });

  const doc = new Document({
    styles:{ default:{ document:{ run:{ font:FONT, size:20 } } } },
    sections:[{
      properties:{
        page:{
          size:{
            orientation: PageOrientation.LANDSCAPE,
            width: convertInchesToTwip(8.27),
            height: convertInchesToTwip(11.69)
          },
          margin:{ top:720, bottom:720, left:720, right:720 }
        }
      },
      children:[
        photoFrame,
        orgLine1,
        orgLine2,
        orgLine3,
        hsvLine,
        headerSpacer,
        Ppar([T("BÁO CÁO THÀNH TÍCH", {bold:true, size:32})], {alignment:AlignmentType.CENTER}),
        Ppar([T("ĐỀ NGHỊ CÔNG NHẬN DANH HIỆU SINH VIÊN 5 TỐT CẤP ĐẠI HỌC", {bold:true, size:28})], {alignment:AlignmentType.CENTER}),
        Ppar([T("NĂM " + REPORT_YEAR, {bold:true, size:28})], {alignment:AlignmentType.CENTER}),
        Ppar([T("")]),
        mainTable,
        Ppar([T("")]),
        confirmTable
      ]
    }]
  });

  Packer.toBlob(doc).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (p.fullName || "bao_cao") + "_5tot.docx";
    a.click();
    URL.revokeObjectURL(url);
  });
}

/* =========================================================
   6. KHỞI ĐỘNG
   ========================================================= */
// (window.beforeunload được gắn trong main.js)

/* =========================================================
   7. DỮ LIỆU MẪU - điền nhanh để test/demo
   ========================================================= */
function fillSampleData(){
  state.personal = {
    fullName:"Nguyễn Văn A", gender:"Nam", birthYear:"2006", ethnicity:"Kinh", mssv:"202414918",
    className:"ET1 01 - K69", khoaTruong:"Điện - Điện tử",
    positions:["Ủy viên Ban Chấp hành Chi đoàn, Chi hội lớp"],
    partyStatus:"Đoàn viên", phone:"0904xxxxxx"
  };
  state.reportDate = { day:"", month:"", year: String(new Date().getFullYear()) };
  state.daoDuc = {
    renLuyenKy1:"96", renLuyenKy2:"96",
    khongViPham:true,
    groups: {
      "DD-G1": {items:[
        {...CRITERIA.daoDuc[0]},
        {...CRITERIA.daoDuc[1]},
        {...CRITERIA.daoDuc[2]}
      ]},
      "DD-G2": {yes:null, rank:""},
      "DD-G3": {yes:null, rank:""},
      "DD-G4": {items:[]},
      "DD-G5": {yes:null, detail:""}
    }
  };
  state.hocTap = {
    dien:"thuong", diemKy1:"3.38", tinChiKy1:"13", diemKy2:"3.37", tinChiKy2:"13",
    groups: {
      "HT-G1": {yes:null, detail:""},
      "HT-G2": {yes:null, detail:""},
      "HT-G3": {items:[{...CRITERIA.hocTap[0]}]},
      "HT-G4": {yes:null, detail:""},
      "HT-G5": {yes:null, detail:""},
      "HT-G6": {yes:null, detail:""}
    }
  };
  state.theLuc = {
    hoanThanhDuGDTC:false, khongDiemF:true,
    groups: {
      "TL-G1": {yes:null, detail:""},
      "TL-G2": {items:[
        {...CRITERIA.theLuc[0]},
        {...CRITERIA.theLuc[1]}
      ]},
      "TL-G3": {yes:null, detail:""},
      "TL-G4": {yes:null, detail:""}
    }
  };
  state.tinhNguyen = {
    items:[{text:"Hỗ trợ Đại hội Đoàn trường Điện - Điện tử", days:5}],
    khenThuong:false
  };
  state.hoiNhap = {
    fixed: {
      "HN-KHOA-HOC": {yes:true,items:[{...CRITERIA.hoiNhapKhoaHoc[0]}],pending:false},
      "HN-CAP-DAI-HOC": {yes:true,items:[{...CRITERIA.hoiNhapCapDaiHoc[0]}],pending:false}
    },
    ngoaiNguMethod: "certificate",
    ngoaiNguCertificateType:"TOEIC",
    ngoaiNguCertificateScore:"650",
    ngoaiNguPending:false,
    groups: {
      "HN-G1": {items:[]},
      "HN-G2": {items:[{...CRITERIA.hoiNhapPhu[0]}]}
    }
  };
  state.khac = { items:[{text:"Đạt học bổng KKHT loại B kỳ 2024.1"}] };
  state.step = 0;
  render();
}
// (Sự kiện các nút được gắn tập trung trong main.js sau khi trang tải xong)

/* =========================================================
   8. NHẬP / XUẤT EXCEL DANH SÁCH HOẠT ĐỘNG
   Cấu trúc cột: Tiêu chí | Tiêu chí chính/phụ | Mô tả tiêu chí cụ thể | Hoạt động | Yêu cầu | Cách thức Minh chứng
   ========================================================= */
const EXCEL_CATEGORY_MAP = [
  {key:"daoDuc",  label:"Đạo đức Tốt",  match:"dao duc"},
  {key:"hocTap",  label:"Học tập Tốt",  match:"hoc tap"},
  {key:"theLuc",  label:"The luc Tot",  match:"the luc"},
  {key:"hoiNhap", label:"Hội nhập Tốt", match:"hoi nhap"}
];

function normalizeVN(s){
  return removeDiacritics(String(s||"")).toLowerCase().trim();
}

function exportCriteriaExcel(){
  if(typeof XLSX === "undefined"){
    alert("Không tải được thư viện Excel (cần kết nối mạng).");
    return;
  }
  const rows = [["Tiêu chí", "Tiêu chí chính/phụ", "Mô tả tiêu chí cụ thể", "Hoạt động", "Yêu cầu", "Cách thức Minh chứng"]];

  function addRows(tieuChi, loai, moTa, items){
    if(!items.length){
      if(loai === "Tiêu chí chính") return; // bỏ qua, không cần dòng ghi chú thừa
      rows.push([tieuChi, loai, moTa||"", "(Không có hoạt động dạng danh sách - nhập trực tiếp trên web)", "", ""]);
      return;
    }
    items.forEach(it => rows.push([tieuChi, loai, moTa||"", it.name, it.yeuCau||"", it.minhchung||""]));
  }

  const ddPhuDesc = (GROUPS.daoDuc.list.find(g=>g.id==="DD-G1")||{}).label || "";
  const htPhuDesc = (GROUPS.hocTap.list.find(g=>g.id==="HT-G3")||{}).label || "";
  const tlPhuDesc = (GROUPS.theLuc.list.find(g=>g.id==="TL-G2")||{}).label || "";
  const hnKhoaHocDesc = (HOINHAP_FIXED[0]||{}).label || "";
  const hnCapDaiHocDesc = (HOINHAP_FIXED[1]||{}).label || "";
  const hnPhuDesc = (GROUPS.hoiNhap.list.find(g=>g.id==="HN-G2")||{}).label || "";

  addRows("Đạo đức Tốt", "Tiêu chí phụ", ddPhuDesc, CRITERIA.daoDuc);
  addRows("Học tập Tốt", "Tiêu chí phụ", htPhuDesc, CRITERIA.hocTap);
  addRows("Thể lực Tốt", "Tiêu chí phụ", tlPhuDesc, CRITERIA.theLuc);
  addRows("Hội nhập Tốt", "Tiêu chí chính", hnKhoaHocDesc, CRITERIA.hoiNhapKhoaHoc);
  addRows("Hội nhập Tốt", "Tiêu chí chính", hnCapDaiHocDesc, CRITERIA.hoiNhapCapDaiHoc);
  addRows("Hội nhập Tốt", "Tiêu chí phụ", hnPhuDesc, CRITERIA.hoiNhapPhu);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{wch:14},{wch:14},{wch:40},{wch:42},{wch:24},{wch:34}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Danh sách hoạt động");
  XLSX.writeFile(wb, "danh_sach_hoat_dong_sv5tot.xlsx");
}

function importCriteriaExcel(file){
  if(typeof XLSX === "undefined"){
    alert("Không tải được thư viện Excel (cần kết nối mạng).");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, {type:"array"});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:""});
      if(!rows.length) throw new Error("File rỗng");

      // Dò cột theo TÊN header thay vì vị trí cố định - hỗ trợ cả định dạng cũ (5 cột,
      // không có "Mô tả tiêu chí cụ thể") lẫn định dạng mới (6 cột, có thêm cột đó).
      const header = rows[0].map(h => normalizeVN(h));
      const findCol = (pred, fallback) => { const i = header.findIndex(pred); return i>=0 ? i : fallback; };
      const colTieuChi   = findCol(h => h.includes("tieu chi") && !h.includes("chinh") && !h.includes("phu") && !h.includes("cu the"), 0);
      const colLoai      = findCol(h => h.includes("chinh") && h.includes("phu"), 1);
      const colMoTa      = findCol(h => h.includes("cu the"), -1);
      const colHoatDong  = findCol(h => h.includes("hoat dong"), rows[0].length >= 6 ? 3 : 2);
      const colYeuCau    = findCol(h => h.includes("yeu cau"), rows[0].length >= 6 ? 4 : -1);
      const colMinhChung = findCol(h => h.includes("minh chung"), rows[0].length - 1);

      const dataRows = rows.slice(1);
      const collected = { daoDuc:[], hocTap:[], theLuc:[], hoiNhapKhoaHoc:[], hoiNhapCapDaiHoc:[], hoiNhapPhu:[] };
      let curCatKey = null;
      let curLoai = null;

      dataRows.forEach(row => {
        const rawCat = row[colTieuChi], rawLoai = row[colLoai], rawMoTa = colMoTa >= 0 ? row[colMoTa] : "", rawHoatDong = row[colHoatDong], rawYeuCau = colYeuCau >= 0 ? row[colYeuCau] : "", rawMinhChung = row[colMinhChung];
        if(rawCat && String(rawCat).trim()){
          const norm = normalizeVN(rawCat);
          const found = EXCEL_CATEGORY_MAP.find(c => norm.includes(normalizeVN(c.match)));
          curCatKey = found ? found.key : null;
        }
        if(rawLoai && String(rawLoai).trim()){
          const normLoai = normalizeVN(rawLoai);
          curLoai = normLoai.includes("phu") ? "phu" : (normLoai.includes("chinh") ? "chinh" : curLoai);
        }
        const activity = String(rawHoatDong||"").trim();
        if(!activity || activity.startsWith("(") || !curCatKey) return;
        const entry = { name: activity, yeuCau: String(rawYeuCau||"").trim(), minhchung: String(rawMinhChung||"").trim() };

        if(curCatKey === "hoiNhap"){
          if(curLoai === "chinh"){
            const desc=normalizeVN(rawMoTa || "");
            if(desc.includes("khoa") || desc.includes("khen thuong")) collected.hoiNhapKhoaHoc.push(entry);
            else collected.hoiNhapCapDaiHoc.push(entry);
          } else collected.hoiNhapPhu.push(entry);
        } else {
          if(curLoai === "phu") collected[curCatKey].push(entry);
          // Bỏ qua dòng "chính" cho Đạo đức/Học tập/Thể lực vì 3 mục này không có
          // hoạt động dạng danh sách (tiêu chí chính là điểm số/xác nhận, nhập trực tiếp trên web)
        }
      });

      function rebuild(arr, list, prefix){
        arr.length = 0;
        list.forEach((entry, i) => arr.push({id: prefix+"-"+(i+1), name: entry.name, yeuCau: entry.yeuCau || "", minhchung: entry.minhchung || ""}));
      }
      rebuild(CRITERIA.daoDuc, collected.daoDuc, "DD");
      rebuild(CRITERIA.hocTap, collected.hocTap, "HT");
      rebuild(CRITERIA.theLuc, collected.theLuc, "TL");
      rebuild(CRITERIA.hoiNhapKhoaHoc, collected.hoiNhapKhoaHoc, "HN-KH");
      rebuild(CRITERIA.hoiNhapCapDaiHoc, collected.hoiNhapCapDaiHoc, "HN-DH");
      rebuild(CRITERIA.hoiNhapPhu, collected.hoiNhapPhu, "HN-G2");

      alert(
        "Đã nhập xong danh sách hoạt động từ Excel:\n" +
        `- Đạo đức (phụ): ${CRITERIA.daoDuc.length} hoạt động\n` +
        `- Học tập (phụ): ${CRITERIA.hocTap.length} hoạt động\n` +
        `- Thể lực (phụ): ${CRITERIA.theLuc.length} hoạt động\n` +
        `- Hội nhập (khóa học/giấy khen): ${CRITERIA.hoiNhapKhoaHoc.length} hoạt động\n` +
        `- Hội nhập (cấp đại học): ${CRITERIA.hoiNhapCapDaiHoc.length} hoạt động\n` +
        `- Hội nhập (phụ): ${CRITERIA.hoiNhapPhu.length} hoạt động\n\n` +
        "Lưu ý: dòng 'Tiêu chí chính' của Đạo đức/Học tập/Thể lực không có hoạt động dạng " +
        "danh sách (tiêu chí chính là điểm số/xác nhận trực tiếp trên web) nên bị bỏ qua."
      );
      render();
    } catch(err){
      console.error(err);
      alert("Không đọc được file Excel - kiểm tra lại đúng cấu trúc cột: Tiêu chí | Tiêu chí chính/phụ | (Mô tả tiêu chí cụ thể) | Hoạt động | Yêu cầu | Cách thức Minh chứng.");
    }
  };
  reader.readAsArrayBuffer(file);
}

// (Sự kiện các nút + lệnh render() khởi động được gắn tập trung trong main.js)