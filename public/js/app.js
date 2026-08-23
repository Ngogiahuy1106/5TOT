
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
  submissionClosedMessage: "Hiện không trong thời gian nhận hồ sơ.",
  activityCatalog: null,
  reportYear: 2025
  // Không còn "adminPassword" ở đây - việc kiểm tra mật khẩu giờ nằm hoàn
  // toàn ở server (server.js, biến môi trường ADMIN_PASSWORD), xem admin.js.
};

let REPORT_YEAR = 2025;

const KHOA_MAPPING = { "2025": 1, "2024": 2, "2023": 3, "2022": 4, "2021": 5 };
const KHOA_LABEL = { "2025": "K70", "2024": "K69", "2023": "K68", "2022": "K67", "2021": "K66" };

const CRITERIA = {
  // Danh mục chính thức được quản trị bằng Excel và lưu ở AppConfig.activityCatalog.
  // Mọi hoạt động trong Excel được đưa vào đúng nhóm, ngoại trừ HT-G1 được
  // giữ là mục tự điền theo yêu cầu nghiệp vụ.
  daoDuc: [],
  daoDucDangDoan: [],
  hocTap: [],
  hocTapClb: [],
  hocTapNckh: [],
  hocTapNhomNckh: [],
  hocTapThamLuan: [],
  hocTapSangTao: [],
  theLuc: [],
  tinhNguyen: [],
  hoiNhapKhoaHoc: [],
  hoiNhapCapDaiHoc: [],
  hoiNhapGiaoLuu: [],
  hoiNhapPhu: []
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
      {id:"DD-G4", label:"Tham gia tích cực các cuộc thi về Đảng, Đoàn - Hội do cấp đại học trở lên tổ chức, phát động hoặc công nhận.", type:"sheet", minCount:1, items:CRITERIA.daoDucDangDoan},
      {id:"DD-G5", label:"Là thanh niên tiêu biểu, thanh niên tiên tiến, gương người tốt, việc tốt, có hành động dũng cảm cứu người được ghi nhận, biểu dương.", type:"manualYesNo"}
    ]
  },
  hocTap: {
    list: [
      {id:"HT-G1", label:"Thành viên tích cực mảng/ban chuyên môn của CLB học thuật cấp Đoàn Thanh niên, Hội Sinh viên trường/Liên chi đoàn, Liên chi hội sinh viên khoa trở lên được Ban Thư ký Hội Sinh viên Đại học công nhận.", type:"sheet", minCount:1, items:CRITERIA.hocTapClb},
      {id:"HT-G2", label:"Tham gia đề tài nghiên cứu khoa học sinh viên.", type:"sheet", minCount:1, items:CRITERIA.hocTapNckh},
      {id:"HT-G3", label:"Tham gia kỳ thi, cuộc thi học thuật cấp đại học trở lên.", type:"sheet", minCount:1, items:CRITERIA.hocTap},
      {id:"HT-G4", label:"Tham gia nhóm nghiên cứu khoa học cấp trường/khoa trở lên.", type:"sheet", minCount:1, items:CRITERIA.hocTapNhomNckh},
      {id:"HT-G5", label:"Có bài tham luận tại hội thảo khoa học hoặc tạp chí chuyên ngành.", type:"sheet", minCount:1, items:CRITERIA.hocTapThamLuan},
      {id:"HT-G6", label:"Có sản phẩm sáng tạo được cấp bằng sáng chế, cấp giấy phép xuất bản hoặc đạt giải thưởng trong các cuộc thi ý tưởng sáng tạo từ cấp đại học trở lên.", type:"sheet", minCount:1, items:CRITERIA.hocTapSangTao}
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
      {id:"HN-G1", label:"Tham gia ít nhất 01 hoạt động giao lưu quốc tế: hội nghị, hội thảo quốc tế, các chương trình gặp gỡ, giao lưu, hợp tác với thanh niên, sinh viên quốc tế trong và ngoài nước.", type:"sheet", minCount:1, items:CRITERIA.hoiNhapGiaoLuu},
      {id:"HN-G2", label:"Tham gia các cuộc thi về kiến thức hội nhập hoặc có sử dụng ngoại ngữ từ cấp trường/khoa trở lên tổ chức.", type:"sheet", minCount:1, items:CRITERIA.hoiNhapPhu}
    ]
  }
};

const HOINHAP_FIXED = [
  {id:"HN-KHOA-HOC", label:"Hoàn thành ít nhất 01 khóa trang bị kỹ năng thực hành xã hội hoặc được Đoàn Thanh niên/Hội Sinh viên từ cấp Đại học trở lên khen thưởng về thành tích xuất sắc trong công tác Đoàn và phong trào thanh niên/công tác Hội và phong trào sinh viên Đại học trong năm học.", type:"sheet", minCount:1, items:CRITERIA.hoiNhapKhoaHoc},
  {id:"HN-CAP-DAI-HOC", label:"Tham gia tích cực ít nhất 01 hoạt động hội nhập có quy mô từ cấp Đại học trở lên.", type:"sheet", minCount:1, items:CRITERIA.hoiNhapCapDaiHoc}
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
    khenThuong:false,
    proposeOpen:false
  },
  hoiNhap: {
    fixed: makeGroupState(HOINHAP_FIXED),
    ngoaiNguMethod:"",
    ngoaiNguCertificateType:"",
    ngoaiNguCertificateName:"",
    ngoaiNguCertificateScore:"",
    ngoaiNguCertificateDetails:{},
    ngoaiNguPending:false,
    groups: makeGroupState(GROUPS.hoiNhap.list)
  },
  khac: { items:[] },
  evidence: {}, // key: trạng thái minh chứng: later | form | rỗng
  evidenceForms: {}, // key -> link đơn minh chứng
  evidenceImages: {}, // key -> {name, dataUrl, blob?, size, contentType, localVersion}
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
function newStableId(prefix){
  const token=globalThis.crypto?.randomUUID?globalThis.crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${token}`;
}
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
  const toeic = khoaLabel === "K70" ? 350 : khoaLabel === "K69" ? 400 : khoaLabel === "K68" ? 450 : 500;
  const ielts = khoaLabel === "K67" ? 5.5 : ["K68","K69","K70"].includes(khoaLabel) ? 5.0 : null;
  return `Không có học phần Tiếng Anh nào dưới loại B trong 2 kỳ chính; hoặc được miễn học phần ngoại ngữ; hoặc có TOEIC ${toeic}+${ielts!==null ? ` / IELTS ${ielts}+` : ""} (hoặc chứng chỉ tương đương theo phụ lục).`;
}

function calculateWeightedGpa(hocTap){
  return window.SV5TRules.calculateWeightedGpa(hocTap);
}

/* =========================================================
   4. RENDER - khung chung
   ========================================================= */
const stepsEl = document.getElementById("steps");
const contentEl = document.getElementById("stepContent");

function getStepDeclarationState(key){
  if(key==="personal"){
    const p=state.personal,m=validateMSSV(p.mssv||"");
    return p.fullName?.trim()&&p.className?.trim()&&m.ok&&Number.isInteger(Number(p.birthYear))&&Number(p.birthYear)>=2000&&Number(p.birthYear)<=2010 ? "done" : "incomplete";
  }
  if(["daoDuc","hocTap","theLuc","tinhNguyen","hoiNhap","khac"].includes(key)){
    try{const r=getSectionCriterionSummary(key); if(r.unanswered>0)return "incomplete"; if(r.later>0)return "pending"; return "done";}catch{return "incomplete";}
  }
  if(key==="minhChung"){
    try{const r=buildSubmissionReview(); const missing=r.rows.reduce((n,x)=>n+x.evidence.missing,0),later=r.rows.reduce((n,x)=>n+x.evidence.later,0); return missing?"incomplete":later?"pending":"done";}catch{return "incomplete";}
  }
  return "";
}
function renderSteps(){
  stepsEl.innerHTML = "";
  STEPS.forEach((s, i) => {
    const pill = document.createElement("button");
    pill.type = "button";
    const declaration=getStepDeclarationState(s.key);
    const statusClass=declaration||"navigation";
    pill.className = `step-pill ${statusClass}${i === state.step ? " active" : ""}`;
    pill.textContent = (i+1) + ". " + s.label;
    pill.title = declaration==="done" ? "Đã khai báo đầy đủ" : declaration==="pending" ? "Có nội dung bổ sung sau" : declaration==="incomplete" ? "Chưa khai báo đầy đủ" : "Mở mục này";
    pill.setAttribute("aria-current",i===state.step?"step":"false");
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
      achieved = (gs.items || []).length >= (groupDef.minCount || 1) || Boolean(String(gs.detail || "").trim());
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

  // Các bản nháp/hồ sơ trước phiên bản danh mục mới có thể lưu nội dung tự gõ
  // ở `detail`. Giữ dữ liệu đó để xem lại, đồng thời chuẩn bị mảng items cho UI mới.
  if(groupDef.type === "sheet" && !Array.isArray(groupState.items)) groupState.items = [];

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

  if(groupDef.type === "sheet" && String(groupState.detail || "").trim()){
    const legacy = document.createElement("p");
    legacy.className = "hint";
    legacy.textContent = `Nội dung đã khai báo ở bản cũ: ${groupState.detail}`;
    wrap.appendChild(legacy);
  }

  if(groupDef.type === "sheet"){
    if(!groupDef.items.length){
      const warning=document.createElement("p");warning.className="err-msg";warning.textContent="Danh mục hoạt động chính thức cho tiêu chí này chưa được Ban quản trị tải lên.";wrap.appendChild(warning);
    }
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
      add.onclick=()=>{
        const resolved=resolveProposedActivity(input.value,groupDef.items,groupState.items);
        if(resolved.status==="empty"){ groupState.proposeOpen=false; onChange(); return; }
        if(resolved.status==="duplicate"){ appAlert(`Hoạt động “${resolved.name}” đã có trong danh sách bên dưới.`,"Hoạt động bị trùng"); return; }
        groupState.items.push(resolved.item);
        groupState.proposeOpen=false;
        onChange();
        // Thông báo sau khi render lại để modal không bị xoá cùng nội dung bước.
        if(resolved.status==="official") appAlert(`“${resolved.item.name}” đã có trong danh mục chính thức nên được thêm như hoạt động chính thức, không tính là đề xuất.`,"Đã có trong danh mục");
      };
      proposeRow.append(input,add); wrap.appendChild(proposeRow);
    }
  } else if(groupDef.type === "manualList"){
    const row=document.createElement("div"); row.className="freeform-row";
    const input=document.createElement("input"); input.type="text"; input.placeholder="Nhập tên hoạt động...";
    const btn=document.createElement("button"); btn.type="button"; btn.textContent="+ Thêm";
    btn.onclick=()=>{ const v=input.value.trim(); if(!v) return; groupState.items.push({id:newStableId(groupDef.id.toLowerCase()),name:v}); onChange(); };
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
    (groupState.items||[]).forEach((it,idx)=>{ const noLongerOfficial=groupDef.type==="sheet"&&!it.proposed&&!groupDef.items.some(current=>current.id===it.id); const li=document.createElement("li"); li.innerHTML=`<span class="txt">${escapeHtml(it.name)}${it.yeuCau ? `<span class="hint activity-requirement">Yêu cầu: ${escapeHtml(it.yeuCau)}</span>` : ""}${noLongerOfficial?'<span class="err-msg activity-requirement">Hoạt động này không còn trong danh mục chính thức hiện tại.</span>':""}</span>`; const rm=document.createElement("button"); rm.type="button"; rm.textContent="Xóa"; rm.onclick=()=>{groupState.items.splice(idx,1);onChange();}; li.appendChild(rm); ul.appendChild(li); });
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
    const academic=window.SV5TRules.evaluateAcademicMinimum(state);
    if(!academic.drlMet){appAlert(`Điểm rèn luyện trung bình phải từ ${academic.drlRequired} trở lên. Kết quả hiện tại: ${academic.drlAverage?.toFixed(1)??'chưa hợp lệ'}.`,"Chưa đạt điều kiện Đạo đức");return;}
    if(d.khongViPham!==true){appAlert("Điều kiện không vi phạm pháp luật, quy chế và nội quy là tiêu chí cứng. Hồ sơ không thể gửi khi mục này không đạt.","Chưa đạt điều kiện Đạo đức");return;}
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
      appAlert("Vui lòng nhập hợp lệ điểm, tín chỉ và khai báo đầy đủ các tiêu chí phụ.","Dữ liệu chưa đầy đủ");
      return;
    }
    const academic=window.SV5TRules.evaluateAcademicMinimum(state);
    if(!academic.gpaMet){appAlert(`GPA trung bình có trọng số phải từ ${academic.gpaThreshold} trở lên. Kết quả hiện tại: ${academic.gpaAverage?.toFixed(2)??'chưa hợp lệ'}.`,"Chưa đạt điều kiện Học tập");return;}
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
      appAlert("Cần khai báo tình trạng Giáo dục thể chất và đầy đủ các tiêu chí phụ.","Dữ liệu chưa đầy đủ");
      return;
    }
    if(!window.SV5TRules.evaluateHardEligibility(state).physicalMet){
      appAlert("Điểm F ở học phần GDTC là điều kiện cứng. Chỉ có thể tiếp tục khi đã hoàn thành đủ 05 học phần GDTC hoặc không có điểm F trong các học phần đã học.","Chưa đạt điều kiện Thể lực");
      return;
    }
    state.step++; render();
  });
  contentEl.appendChild(nav);
}

/* ---------- STEP: Tình nguyện ---------- */
// Mỗi hoạt động lưu `dates` (mảng "YYYY-MM-DD") song song với `days` (số ngày quy đổi).
// Hai giá trị này KHÁC nhau: một buổi có thể chỉ tính 0,5 ngày nên số mốc ngày
// không nhất thiết bằng số ngày quy đổi - đúng như bản báo cáo mẫu của Ban.
const VOLUNTEER_REQUIRED_DAYS = 5;

function volunteerDatesOf(item){ return window.SV5TRules.normalizeVolunteerDates(item?.dates); }
function volunteerTotalDays(items){ return (items||[]).reduce((sum,it)=>sum+(Number(it.days)||0),0); }

// So trùng bằng normalizeActivityName của shared-rules - cùng một luật với bước
// đề xuất của các nhóm khác và với validate ở backend, để ba nơi không lệch nhau.
function volunteerItemExists(items,{id,name}){
  const key = name ? window.SV5TRules.normalizeActivityName(name) : "";
  return (items||[]).some(it =>
    (id && it.id===id) || (key && window.SV5TRules.normalizeActivityName(it.text)===key)
  );
}

function renderVolunteerDateEditor(host, item, onChange){
  const dates = volunteerDatesOf(item);

  const label = document.createElement("div");
  label.className = "tn-field-label";
  label.textContent = dates.length ? `Các ngày đã tham gia (${dates.length} mốc)` : "Các ngày đã tham gia";
  host.appendChild(label);

  const chips = document.createElement("div");
  chips.className = "tn-date-chips";
  if(!dates.length){
    const empty = document.createElement("span");
    empty.className = "tn-date-empty";
    empty.textContent = "Chưa có ngày nào - bắt buộc điền trước khi gửi hồ sơ.";
    chips.appendChild(empty);
  }
  dates.forEach(iso => {
    const [y,m,d] = iso.split("-");
    const chip = document.createElement("span");
    chip.className = "tn-date-chip";
    const text = document.createElement("span");
    text.textContent = `${d}/${m}/${y}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "tn-chip-remove";
    remove.setAttribute("aria-label", `Xóa ngày ${d}/${m}/${y}`);
    remove.textContent = "×";
    remove.onclick = () => { item.dates = volunteerDatesOf(item).filter(v => v !== iso); onChange(); };
    chip.append(text, remove);
    chips.appendChild(chip);
  });
  host.appendChild(chips);

  const row = document.createElement("div");
  row.className = "tn-date-add";
  const input = document.createElement("input");
  input.type = "date";
  input.min = "2000-01-01";
  input.max = "2100-12-31";
  input.setAttribute("aria-label","Chọn ngày đã tham gia");
  const add = document.createElement("button");
  add.type = "button";
  add.className = "tn-btn-add-date";
  add.textContent = "+ Thêm ngày";
  const commit = () => {
    const value = String(input.value || "").trim();
    if(!window.SV5TRules.isValidVolunteerDate(value)){ appAlert("Hãy chọn một ngày hợp lệ trước khi thêm.","Chưa chọn ngày"); return; }
    const current = volunteerDatesOf(item);
    if(current.includes(value)){ appAlert("Ngày này đã có trong danh sách của hoạt động.","Ngày bị trùng"); return; }
    if(current.length >= window.SV5TRules.MAX_VOLUNTEER_DATES){ appAlert(`Mỗi hoạt động chỉ ghi tối đa ${window.SV5TRules.MAX_VOLUNTEER_DATES} ngày.`,"Quá nhiều ngày"); return; }
    item.dates = [...current, value];
    input.value = "";
    onChange();
  };
  add.onclick = commit;
  input.onkeydown = e => { if(e.key === "Enter"){ e.preventDefault(); commit(); } };
  row.append(input, add);
  host.appendChild(row);
}

function renderVolunteerCard(host, item, index, onChange){
  const official = CRITERIA.tinhNguyen.find(c => c.id === item.id);
  const noLongerOfficial = !item.proposed && !official;

  const card = document.createElement("div");
  card.className = "tn-card" + (volunteerDatesOf(item).length ? "" : " tn-card-incomplete");

  const head = document.createElement("div");
  head.className = "tn-card-head";
  const order = document.createElement("span");
  order.className = "tn-card-order";
  order.textContent = index + 1;
  const titleWrap = document.createElement("div");
  titleWrap.className = "tn-card-title-wrap";
  const title = document.createElement("div");
  title.className = "tn-card-title";
  title.textContent = item.text;
  const badge = document.createElement("span");
  // Cùng huy hiệu chính/phụ với danh sách hoạt động của các bước khác.
  badge.className = "badge " + (item.proposed ? "phu" : "chinh");
  badge.textContent = item.proposed ? "Tự nhập" : "Từ danh mục của Ban";
  titleWrap.append(title, badge);
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "tn-card-remove";
  remove.textContent = "Xóa";
  remove.onclick = onChange.remove;
  head.append(order, titleWrap, remove);
  card.appendChild(head);

  if(noLongerOfficial){
    const warn = document.createElement("div");
    warn.className = "tn-card-warning";
    warn.textContent = "Hoạt động này không còn trong danh mục chính thức hiện tại. Ban sẽ đối chiếu thủ công.";
    card.appendChild(warn);
  }

  const body = document.createElement("div");
  body.className = "tn-card-body";

  const daysCol = document.createElement("div");
  daysCol.className = "tn-days-col";
  const daysLabel = document.createElement("div");
  daysLabel.className = "tn-field-label";
  daysLabel.textContent = "Số ngày quy đổi";
  const daysInput = document.createElement("input");
  daysInput.type = "number"; daysInput.min = "0"; daysInput.step = "0.5";
  daysInput.className = "tn-days-input";
  daysInput.placeholder = "VD: 0.5";
  daysInput.value = (item.days === "" || item.days === null || item.days === undefined) ? "" : String(item.days);
  daysInput.oninput = e => {
    const raw = e.target.value;
    item.days = raw === "" ? "" : Number(raw);
    onChange.refreshTotals();
  };
  daysCol.append(daysLabel, daysInput);
  if(official?.yeuCau){
    const hint = document.createElement("div");
    hint.className = "tn-days-hint";
    hint.textContent = `Danh mục ghi: ${official.yeuCau} ngày`;
    daysCol.appendChild(hint);
  }
  body.appendChild(daysCol);

  const dateCol = document.createElement("div");
  dateCol.className = "tn-dates-col";
  renderVolunteerDateEditor(dateCol, item, onChange.rerender);
  body.appendChild(dateCol);
  card.appendChild(body);

  // Cho sinh viên thấy trước đúng dòng sẽ in ra trong báo cáo thành tích.
  const preview = document.createElement("div");
  preview.className = "tn-card-preview";
  const previewLabel = document.createElement("span");
  previewLabel.className = "tn-preview-label";
  previewLabel.textContent = "Sẽ in trong báo cáo:";
  const previewText = document.createElement("span");
  previewText.className = "tn-preview-text";
  previewText.textContent = window.SV5TRules.formatVolunteerItem(item);
  preview.append(previewLabel, previewText);
  card.appendChild(preview);

  host.appendChild(card);
}

function renderTinhNguyen(){
  const tn = state.tinhNguyen;
  if(!Array.isArray(tn.items)) tn.items = [];
  tn.items.forEach(it => { if(!Array.isArray(it.dates)) it.dates = []; });

  contentEl.innerHTML = `
    <div class="card">
      <h2>Tình nguyện</h2>
      <p class="sub">Cần tổng cộng ít nhất <b>${VOLUNTEER_REQUIRED_DAYS} ngày</b> tình nguyện. Với mỗi hoạt động, ghi số ngày quy đổi và liệt kê đầy đủ các ngày đã tham gia - báo cáo sẽ in đúng theo danh sách này.</p>

      <div class="tn-add-panel">
        <div class="tn-add-block">
          <div class="tn-field-label">Chọn từ danh mục của Ban</div>
          <div class="tn-add-row" id="tnPicker"></div>
        </div>
        <div class="tn-add-divider"><span>hoặc</span></div>
        <div class="tn-add-block">
          <div class="tn-field-label">Tự nhập hoạt động chưa có trong danh mục</div>
          <div class="tn-add-row">
            <input type="text" id="tnCustomText" maxlength="500" placeholder="VD: Hỗ trợ đại hội chi đoàn - chi hội trường Điện - Điện tử">
            <button type="button" id="tnCustomAdd">+ Thêm</button>
          </div>
          <div class="tn-add-note">Hoạt động tự nhập vẫn được tính; Ban sẽ đối chiếu khi duyệt minh chứng.</div>
        </div>
      </div>

      <div id="tnSummary" class="tn-summary"></div>
      <div id="tnCards" class="tn-cards"></div>
      <div id="tnPendingHost"></div>

      <div class="fixed-block" style="margin-top:16px">
        <span class="tag">TIÊU CHÍ ƯU TIÊN - không bắt buộc</span>
        <div class="field" style="margin-top:6px"><label><input type="checkbox" id="tnKhenThuong" ${tn.khenThuong?"checked":""}> Được khen thưởng từ cấp đại học trở lên về hoạt động tình nguyện</label></div>
      </div>
    </div>`;

  const rerender = () => { markStateDirty(); renderTinhNguyen(); };

  // ---- Cách 1: chọn từ danh mục chính thức ----
  const picker = document.getElementById("tnPicker");
  const chosen = new Set(tn.items.map(it => it.id));
  const options = CRITERIA.tinhNguyen.filter(c => !chosen.has(c.id));
  const select = document.createElement("select");
  select.id = "tnSelect";
  select.setAttribute("aria-label","Danh mục hoạt động tình nguyện");
  if(!CRITERIA.tinhNguyen.length){ select.innerHTML = `<option value="">(Ban quản trị chưa tải lên danh mục hoạt động)</option>`; select.disabled = true; }
  else if(!options.length){ select.innerHTML = `<option value="">(Đã chọn hết danh sách)</option>`; select.disabled = true; }
  else select.innerHTML = options.map(c => `<option value="${escapeHtmlAttr(c.id)}">${escapeHtml(c.name)}</option>`).join("");
  const addBtn = document.createElement("button");
  addBtn.type = "button"; addBtn.id = "tnAdd"; addBtn.textContent = "+ Thêm";
  addBtn.disabled = select.disabled;
  addBtn.onclick = () => {
    const picked = CRITERIA.tinhNguyen.find(c => c.id === select.value);
    if(!picked) return;
    tn.items.push({id:picked.id,text:picked.name,days:"",dates:[],yeuCau:picked.yeuCau||"",minhchung:picked.minhchung||""});
    rerender();
  };
  picker.append(select, addBtn);

  // ---- Cách 2: tự nhập tên hoạt động ----
  const customInput = document.getElementById("tnCustomText");
  const commitCustom = () => {
    const text = customInput.value.trim();
    if(!text){ appAlert("Vui lòng nhập tên hoạt động tình nguyện.","Thiếu tên hoạt động"); return; }
    // Nếu gõ trùng tên một hoạt động trong danh mục thì gắn luôn vào mục chính thức.
    const key = window.SV5TRules.normalizeActivityName(text);
    const official = CRITERIA.tinhNguyen.find(c => window.SV5TRules.normalizeActivityName(c.name) === key);
    if(volunteerItemExists(tn.items,{id:official?.id,name:text})){
      appAlert(`Hoạt động “${official ? official.name : text}” đã có trong danh sách bên dưới.`,"Hoạt động bị trùng");
      return;
    }
    tn.items.push(official
      ? {id:official.id,text:official.name,days:"",dates:[],yeuCau:official.yeuCau||"",minhchung:official.minhchung||""}
      : {id:newStableId('tn'),text,days:"",dates:[],proposed:true});
    customInput.value = "";
    rerender();
    // Thông báo sau khi render lại để modal không bị xóa cùng nội dung bước.
    if(official) appAlert(`“${official.name}” đã có trong danh mục chính thức nên được thêm như hoạt động chính thức, không tính là đề xuất.`,"Đã có trong danh mục");
  };
  document.getElementById("tnCustomAdd").onclick = commitCustom;
  customInput.onkeydown = e => { if(e.key === "Enter"){ e.preventDefault(); commitCustom(); } };

  // ---- Tổng hợp tiến độ ----
  const summaryHost = document.getElementById("tnSummary");
  const pendingHost = document.getElementById("tnPendingHost");
  const refreshTotals = () => {
    const total = volunteerTotalDays(tn.items);
    const missing = Math.max(0, VOLUNTEER_REQUIRED_DAYS - total);
    const percent = Math.min(100, Math.round(total / VOLUNTEER_REQUIRED_DAYS * 100));
    const reached = total >= VOLUNTEER_REQUIRED_DAYS;
    summaryHost.innerHTML = "";
    const row = document.createElement("div");
    row.className = "tn-summary-row";
    const strong = document.createElement("strong");
    strong.textContent = `${total} / ${VOLUNTEER_REQUIRED_DAYS} ngày`;
    const status = document.createElement("span");
    // Dùng lại đúng chip điều kiện của các bước khác thay vì chip riêng.
    status.className = reached ? "req-chip met" : "req-chip";
    status.textContent = reached ? "Đã đủ số ngày tối thiểu" : `Còn thiếu ${missing} ngày`;
    row.append(strong, status);
    const bar = document.createElement("div");
    bar.className = "tn-progress";
    const fill = document.createElement("div");
    fill.className = "tn-progress-fill" + (reached ? " tn-progress-done" : "");
    fill.style.width = percent + "%";
    bar.appendChild(fill);
    summaryHost.append(row, bar);

    // Ô "bổ sung sau" chỉ hiện khi thực sự còn thiếu ngày.
    pendingHost.innerHTML = "";
    if(!reached){
      const label = document.createElement("label");
      label.className = "volunteer-pending-box";
      const box = document.createElement("input");
      box.type = "checkbox"; box.id = "tnPending"; box.checked = tn.pending === true;
      box.onchange = e => { tn.pending = e.target.checked; markStateDirty(); };
      label.append(box, document.createTextNode(` Tôi sẽ bổ sung ${missing} ngày còn thiếu sau`));
      pendingHost.appendChild(label);
    } else if(tn.pending){
      tn.pending = false;
    }
  };

  // ---- Danh sách hoạt động ----
  const cards = document.getElementById("tnCards");
  if(!tn.items.length){
    const empty = document.createElement("div");
    empty.className = "tn-empty";
    empty.textContent = "Chưa có hoạt động nào. Hãy chọn từ danh mục hoặc tự nhập ở trên.";
    cards.appendChild(empty);
  }
  tn.items.forEach((item,index) => {
    renderVolunteerCard(cards, item, index, {
      rerender,
      refreshTotals,
      remove: () => { tn.items.splice(index,1); rerender(); }
    });
  });
  refreshTotals();

  document.getElementById("tnKhenThuong").onchange = e => tn.khenThuong = e.target.checked;

  const nav = navButtons(() => {
    const noDays = tn.items.filter(it => !(Number(it.days) > 0)).map(it => it.text);
    if(noDays.length){ appAlert(`Chưa nhập số ngày quy đổi cho: ${noDays.slice(0,3).join("; ")}${noDays.length>3?`; và ${noDays.length-3} hoạt động khác`:""}.`,"Thiếu số ngày"); return; }
    const missingDates = window.SV5TRules.volunteerItemsMissingDates(tn.items);
    if(missingDates.length){ appAlert(`Chưa liệt kê ngày tham gia cho: ${missingDates.slice(0,3).join("; ")}${missingDates.length>3?`; và ${missingDates.length-3} hoạt động khác`:""}.`,"Thiếu ngày tham gia"); return; }
    const total = volunteerTotalDays(tn.items);
    if(total < VOLUNTEER_REQUIRED_DAYS && !tn.pending){ appAlert(`Bạn còn thiếu ${Math.max(0,VOLUNTEER_REQUIRED_DAYS-total)} ngày. Hãy thêm hoạt động hoặc đánh dấu sẽ bổ sung sau.`,"Chưa khai báo đầy đủ"); return; }
    state.step++; render();
  });
  contentEl.appendChild(nav);
}


const FOREIGN_CERTIFICATES = {
  IELTS:{label:"IELTS Academic",kind:"number",min:[5.0,5.5],max:9,step:0.5},
  TOEIC:{label:"TOEIC tổng (theo tiêu chí SV5T)",kind:"toeicTotal"},
  VSTEP:{label:"VSTEP",kind:"number",min:[5.5,6.0],max:10,step:0.5},
  APTIS:{label:"Aptis ESOL",kind:"number",min:[80,121],max:200,step:1},
  PEIC:{label:"Pearson English International Certificate (PEIC)",kind:"level",levels:["Level 2","Level 3 (Pass)","Level 3 (Pass with Merit)","Level 3 (Pass with Distinction)","Level 4 (Pass)","Level 4 (Pass with Merit)","Level 4 (Pass with Distinction)","Level 5"],minLevel:[0,1]},
  PTE:{label:"PTE Academic",kind:"number",min:[29,36],max:90,step:1},
  LINGUASKILL:{label:"Linguaskill",kind:"number",min:[140,160],max:210,step:1},
  CAMBRIDGE_ASSESSMENT:{label:"Cambridge Assessment English",kind:"level",levels:["B1 Preliminary / B1 Business Preliminary","B2 First / B2 Business Vantage (Grade C)","B2 First / B2 Business Vantage (Grade B)","B2 First / B2 Business Vantage (Grade A)","C1 Advanced / C1 Business Higher","C2 Proficiency"],minLevel:[0,1]},
  CAMBRIDGE_TESTS:{label:"Cambridge English Tests",kind:"number",min:[140,160],max:230,step:1,unit:"điểm PET/FCE/CAE/CPE"},
  TOEIC_4:{label:"TOEIC 4 kỹ năng (theo phụ lục)",kind:"toeic4",min:[{listening:275,speaking:120,reading:275,writing:120},{listening:400,speaking:150,reading:385,writing:150}]},
  TOEFL_IBT:{label:"TOEFL iBT",kind:"number",min:[35,46],max:120,step:1},
  TOEFL_ITP:{label:"TOEFL ITP",kind:"number",min:[450,500],max:677,step:1},
  JLPT:{label:"JLPT tiếng Nhật",kind:"jlpt"},
  DELF:{label:"DELF/DALF tiếng Pháp",kind:"delf"},
  TCF:{label:"TCF tiếng Pháp",kind:"number",min:[200,250],max:699,step:1},
  HSK:{label:"HSK + HSKK tiếng Trung",kind:"hsk"}
};
function foreignTier(khoaLabel){ return ["K68","K69","K70"].includes(khoaLabel)?0:1; }
function certificateRequirement(type,khoaLabel){
  const cfg=FOREIGN_CERTIFICATES[type],tier=foreignTier(khoaLabel); if(!cfg)return "";
  if(cfg.kind==="number") return `${cfg.label} từ ${cfg.min[tier]} trở lên`;
  if(cfg.kind==="toeicTotal") return `TOEIC tổng từ ${khoaLabel==="K70"?350:khoaLabel==="K69"?400:khoaLabel==="K68"?450:500} trở lên`;
  if(cfg.kind==="level") return `${cfg.label}: ${cfg.levels[cfg.minLevel[tier]]} trở lên`;
  if(cfg.kind==="toeic4"){const m=cfg.min[tier];return `Nghe ≥${m.listening}, Nói ≥${m.speaking}, Đọc ≥${m.reading}, Viết ≥${m.writing}`;}
  if(cfg.kind==="jlpt") return tier===0?"JLPT N4 từ 145 điểm hoặc cấp cao hơn":"JLPT N3 từ 95 điểm hoặc cấp cao hơn";
  if(cfg.kind==="delf") return tier===0?"DELF A2 đạt chứng chỉ (nhóm điểm đến 70) hoặc cấp cao hơn":"DELF A2 trên 70 điểm hoặc cấp cao hơn";
  if(cfg.kind==="hsk") return tier===0?"HSK 3 từ 241 điểm và HSKK Sơ cấp":"HSK 4 từ 180 điểm và HSKK Trung cấp";
  return "";
}

function validateNgoaiNguCertificate(hn, khoaLabel){
  if(hn.ngoaiNguMethod !== "certificate") return {ok:true,msg:""};
  const type=String(hn.ngoaiNguCertificateType||"");
  const raw=String(hn.ngoaiNguCertificateScore??"").trim();
  const cfg=FOREIGN_CERTIFICATES[type]; if(!cfg) return {ok:false,msg:"Vui lòng chọn loại chứng chỉ ngoại ngữ."};
  const tier=foreignTier(khoaLabel),details=hn.ngoaiNguCertificateDetails||{};
  if(cfg.kind==="level"){
    const idx=cfg.levels.indexOf(String(details.level||""));
    return idx>=cfg.minLevel[tier]?{ok:true,msg:`Đạt: ${certificateRequirement(type,khoaLabel)}.`}:{ok:false,msg:`Yêu cầu ${certificateRequirement(type,khoaLabel)}.`};
  }
  if(cfg.kind==="toeic4"){
    const m=cfg.min[tier],keys=["listening","speaking","reading","writing"];
    if(!keys.every(k=>Number.isFinite(Number(details[k])))) return {ok:false,msg:"Vui lòng nhập đủ điểm Nghe, Nói, Đọc và Viết."};
    const limits={listening:495,speaking:200,reading:495,writing:200};
    const ok=keys.every(k=>Number(details[k])>=m[k]&&Number(details[k])<=limits[k]); return ok?{ok:true,msg:`Đạt: ${certificateRequirement(type,khoaLabel)}.`}:{ok:false,msg:`Yêu cầu ${certificateRequirement(type,khoaLabel)} và điểm không vượt thang tối đa.`};
  }
  if(cfg.kind==="jlpt"){
    const rank={N5:1,N4:2,N3:3,N2:4,N1:5},pass={N4:90,N3:95,N2:90,N1:100},need=tier===0?2:3,level=String(details.level||""),rawScore=String(details.score??"").trim(),score=Number(rawScore);
    const ok=rawScore!==""&&Number.isFinite(score)&&score<=180&&pass[level]&&(rank[level]>need?score>=pass[level]:rank[level]===need&&score>=(tier===0?145:95)); return ok?{ok:true,msg:`Đạt: ${certificateRequirement(type,khoaLabel)}.`}:{ok:false,msg:`Yêu cầu ${certificateRequirement(type,khoaLabel)} và điểm chứng chỉ hợp lệ.`};
  }
  if(cfg.kind==="delf"){
    const rank={A1:1,A2:2,B1:3,B2:4,C1:5,C2:6},level=String(details.level||""),rawScore=String(details.score??"").trim(),score=Number(rawScore),ok=rawScore!==""&&Number.isFinite(score)&&score>=0&&score<=100&&(rank[level]>2?score>=50:level==="A2"&&score>=(tier===0?50:71));
    return ok?{ok:true,msg:`Đạt: ${certificateRequirement(type,khoaLabel)}.`}:{ok:false,msg:`Yêu cầu ${certificateRequirement(type,khoaLabel)}.`};
  }
  if(cfg.kind==="hsk"){
    const hsk=Number(details.hskLevel),rawScore=String(details.hskScore??"").trim(),score=Number(rawScore),hskk=String(details.hskk||""),hskkRank={"Sơ cấp":1,"Trung cấp":2,"Cao cấp":3},needLevel=tier===0?3:4,needScore=tier===0?241:180,needHskk=tier===0?1:2;
    const ok=rawScore!==""&&Number.isFinite(score)&&score>=0&&score<=300&&(hsk>needLevel?score>=180:hsk===needLevel&&score>=needScore)&&hskkRank[hskk]>=needHskk; return ok?{ok:true,msg:`Đạt: ${certificateRequirement(type,khoaLabel)}.`}:{ok:false,msg:`Yêu cầu ${certificateRequirement(type,khoaLabel)}.`};
  }
  if(raw==="" || !Number.isFinite(Number(raw))) return {ok:false,msg:"Vui lòng nhập điểm chứng chỉ hợp lệ."};
  const score=Number(raw);
  if(cfg.kind==="toeicTotal"){
    if(!Number.isInteger(score) || score<0 || score>990) return {ok:false,msg:"Điểm TOEIC phải là số nguyên từ 0 đến 990."};
    const minimum = khoaLabel === "K70" ? 350 : khoaLabel === "K69" ? 400 : khoaLabel === "K68" ? 450 : 500;
    if(score < minimum) return {ok:false,msg:`Điểm TOEIC của ${khoaLabel || "khóa hiện tại"} phải từ ${minimum} trở lên.`};
  } else {
    if(score<0||score>cfg.max) return {ok:false,msg:`Điểm ${cfg.label} không hợp lệ.`};
    if(cfg.step===0.5&&Math.abs(score*2-Math.round(score*2))>1e-9) return {ok:false,msg:`Điểm ${cfg.label} phải theo bước 0.5.`};
    if(score<cfg.min[tier]) return {ok:false,msg:`Yêu cầu ${certificateRequirement(type,khoaLabel)}.`};
  }
  return {ok:true,msg:`Đạt: ${certificateRequirement(type,khoaLabel)}.`};
}

function renderCertificateFields(hn,khoaLabel){
  const type=hn.ngoaiNguCertificateType,cfg=FOREIGN_CERTIFICATES[type],d=hn.ngoaiNguCertificateDetails||{};
  if(!cfg) return '<div class="hint">Chọn loại chứng chỉ để nhập kết quả.</div>';
  const req=`<div class="hint certificate-requirement">Yêu cầu áp dụng: ${escapeHtml(certificateRequirement(type,khoaLabel))}</div>`;
  if(cfg.kind==="number"||cfg.kind==="toeicTotal") return `${req}<div class="field"><label>Điểm chứng chỉ</label><input type="number" id="nn-certificate-score" value="${escapeHtmlAttr(hn.ngoaiNguCertificateScore||'')}" min="0" max="${cfg.max||990}" step="${cfg.step||1}" placeholder="Nhập điểm"></div>`;
  if(cfg.kind==="level") return `${req}<div class="field"><label>Cấp độ/kết quả</label><select data-cert-field="level"><option value="">Chọn cấp độ</option>${cfg.levels.map(v=>`<option ${d.level===v?'selected':''}>${escapeHtml(v)}</option>`).join('')}</select></div>`;
  if(cfg.kind==="toeic4") return `${req}<div class="row2 cert-grid-4">${[["listening","Nghe",495],["speaking","Nói",200],["reading","Đọc",495],["writing","Viết",200]].map(([k,l,max])=>`<div class="field"><label>${l}</label><input type="number" data-cert-field="${k}" value="${escapeHtmlAttr(d[k]??'')}" min="0" max="${max}" step="1"></div>`).join('')}</div>`;
  if(cfg.kind==="jlpt") return `${req}<div class="row2"><div class="field"><label>Cấp độ JLPT</label><select data-cert-field="level"><option value="">Chọn cấp độ</option>${["N5","N4","N3","N2","N1"].map(v=>`<option ${d.level===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>Điểm</label><input type="number" data-cert-field="score" value="${escapeHtmlAttr(d.score??'')}" min="0" max="180" step="1"></div></div>`;
  if(cfg.kind==="delf") return `${req}<div class="row2"><div class="field"><label>Cấp độ DELF/DALF</label><select data-cert-field="level"><option value="">Chọn cấp độ</option>${["A1","A2","B1","B2","C1","C2"].map(v=>`<option ${d.level===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>Điểm /100</label><input type="number" data-cert-field="score" value="${escapeHtmlAttr(d.score??'')}" min="0" max="100" step="1"></div></div>`;
  if(cfg.kind==="hsk") return `${req}<div class="row2 cert-grid-4"><div class="field"><label>Cấp HSK</label><select data-cert-field="hskLevel"><option value="">Chọn</option>${[1,2,3,4,5,6].map(v=>`<option value="${v}" ${Number(d.hskLevel)===v?'selected':''}>HSK ${v}</option>`).join('')}</select></div><div class="field"><label>Điểm HSK</label><input type="number" data-cert-field="hskScore" value="${escapeHtmlAttr(d.hskScore??'')}" min="0" max="300" step="1"></div><div class="field"><label>HSKK</label><select data-cert-field="hskk"><option value="">Chọn</option>${["Sơ cấp","Trung cấp","Cao cấp"].map(v=>`<option ${d.hskk===v?'selected':''}>${v}</option>`).join('')}</select></div></div>`;
  return req;
}
function formatCertificateResult(hn){
  const type=hn.ngoaiNguCertificateType,cfg=FOREIGN_CERTIFICATES[type],d=hn.ngoaiNguCertificateDetails||{}; if(!cfg)return "Chứng chỉ ngoại ngữ";
  if(cfg.kind==="number"||cfg.kind==="toeicTotal") return `${cfg.label}: ${hn.ngoaiNguCertificateScore}`;
  if(cfg.kind==="level") return `${cfg.label}: ${d.level||''}`;
  if(cfg.kind==="toeic4") return `${cfg.label}: Nghe ${d.listening||'-'}, Nói ${d.speaking||'-'}, Đọc ${d.reading||'-'}, Viết ${d.writing||'-'}`;
  if(cfg.kind==="jlpt") return `JLPT: ${d.level||''} (${d.score||'-'} điểm)`;
  if(cfg.kind==="delf") return `DELF/DALF: ${d.level||''} (${d.score||'-'} điểm)`;
  if(cfg.kind==="hsk") return `HSK ${d.hskLevel||''}: ${d.hskScore||'-'} điểm; HSKK ${d.hskk||''}`;
  return cfg.label;
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
  const fixedCompletedMain=completedMain;

  const p = state.personal;
  const mssvCheck = p.mssv ? validateMSSV(p.mssv) : {ok:null};
  const khoaLabel = mssvCheck.ok ? mssvCheck.khoaLabel : null;
  const ngoaiNguHost = document.getElementById("ngoaiNguHost");
  const box = document.createElement("div");
  box.className = "fixed-block";
  const certificateValid = validateNgoaiNguCertificate(hn, khoaLabel).ok;
  const languageCompleted = hn.ngoaiNguMethod === "courseB" || hn.ngoaiNguMethod === "exempt" || (hn.ngoaiNguMethod === "certificate" && certificateValid);
  if(languageCompleted) completedMain++;
  box.innerHTML = `
    <div class="criterion-card-top">
      <b>Tiêu chí chính 3: Chuẩn ngoại ngữ</b>
      <label class="criterion-pending-toggle"><input type="checkbox" id="nn-pending" ${hn.ngoaiNguPending?"checked":""}> Thiếu/bổ sung sau</label>
    </div>
    <div class="field" style="margin-top:10px">
      ${khoaLabel ? `<div class="hint" style="margin-bottom:8px">Chuẩn áp dụng (${khoaLabel}): ${ngoaiNguRequirement(khoaLabel)}</div>` : ""}
      <div class="yesno english-methods">
        <button type="button" id="nn-courseb" class="${hn.ngoaiNguMethod==="courseB"?'selected-yes':''}">Không có học phần Tiếng Anh nào dưới loại B trong 2 kỳ chính</button>
        <button type="button" id="nn-exempt" class="${hn.ngoaiNguMethod==="exempt"?'selected-yes':''}">Được miễn học phần ngoại ngữ theo chương trình</button>
        <button type="button" id="nn-certificate" class="${hn.ngoaiNguMethod==="certificate"?'selected-yes':''}">Có chứng chỉ ngoại ngữ</button>
        <button type="button" id="nn-notmet" class="${hn.ngoaiNguMethod==="notMet"?'selected-no':''}">Không đạt</button>
      </div>
      ${hn.ngoaiNguMethod === "certificate" ? `
        <div class="row2" style="margin-top:10px">
          <div class="field" style="grid-column:1/-1"><label>Loại chứng chỉ</label><select id="nn-certificate-type"><option value="">Chọn loại chứng chỉ</option>${Object.entries(FOREIGN_CERTIFICATES).map(([key,cfg])=>`<option value="${key}" ${hn.ngoaiNguCertificateType===key?'selected':''}>${escapeHtml(cfg.label)}</option>`).join('')}</select></div>
        </div>
        <div class="certificate-detail-box">${renderCertificateFields(hn,khoaLabel)}</div>
        <div id="nn-certificate-error" class="${certificateValid?'ok-msg':'err-msg'}">${certificateValid ? 'Thông tin chứng chỉ hợp lệ.' : escapeHtml(validateNgoaiNguCertificate(hn, khoaLabel).msg || 'Vui lòng chọn loại chứng chỉ và nhập điểm.')}</div>
      ` : ''}
    </div>`;
  ngoaiNguHost.appendChild(box);
  document.getElementById("nn-pending").onchange=e=>{hn.ngoaiNguPending=e.target.checked; renderHoiNhap();};
  document.getElementById("nn-courseb").onclick=()=>{hn.ngoaiNguMethod="courseB";hn.ngoaiNguPending=false;hn.ngoaiNguCertificateType="";hn.ngoaiNguCertificateScore="";hn.ngoaiNguCertificateDetails={};renderHoiNhap();};
  document.getElementById("nn-exempt").onclick=()=>{hn.ngoaiNguMethod="exempt";hn.ngoaiNguPending=false;hn.ngoaiNguCertificateType="";hn.ngoaiNguCertificateScore="";hn.ngoaiNguCertificateDetails={};renderHoiNhap();};
  document.getElementById("nn-certificate").onclick=()=>{hn.ngoaiNguMethod="certificate";hn.ngoaiNguPending=false;renderHoiNhap();};
  document.getElementById("nn-notmet").onclick=()=>{hn.ngoaiNguMethod="notMet";hn.ngoaiNguPending=false;hn.ngoaiNguCertificateType="";hn.ngoaiNguCertificateScore="";hn.ngoaiNguCertificateDetails={};renderHoiNhap();};
  const certType=document.getElementById("nn-certificate-type");
  const certScore=document.getElementById("nn-certificate-score");
  if(certType) certType.onchange=e=>{hn.ngoaiNguCertificateType=e.target.value;hn.ngoaiNguCertificateScore="";hn.ngoaiNguCertificateDetails={};renderHoiNhap();};
  function refreshLanguageValidation(){
    const validation=validateNgoaiNguCertificate(hn,khoaLabel),feedback=document.getElementById('nn-certificate-error');
    if(feedback){feedback.className=validation.ok?'ok-msg':'err-msg';feedback.textContent=validation.ok?'Thông tin chứng chỉ hợp lệ.':(validation.msg||'Vui lòng chọn loại chứng chỉ và nhập điểm.');}
    const languageNow=hn.ngoaiNguMethod==='courseB'||hn.ngoaiNguMethod==='exempt'||(hn.ngoaiNguMethod==='certificate'&&validation.ok);
    const count=fixedCompletedMain+(languageNow?1:0),summary=document.getElementById('mainCriteriaSummary');
    if(summary)summary.innerHTML=count===totalMain?'<div class="req-summary"><div class="req-chip met">Đã hoàn thành tiêu chí chính</div></div>':`<div class="req-summary"><div class="req-chip">Đã hoàn thành ${count}/${totalMain} tiêu chí chính</div></div>`;
  }
  if(certScore) certScore.addEventListener("input",e=>{hn.ngoaiNguCertificateScore=e.target.value;refreshLanguageValidation();});
  document.querySelectorAll('[data-cert-field]').forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',e=>{hn.ngoaiNguCertificateDetails||={};hn.ngoaiNguCertificateDetails[e.target.dataset.certField]=e.target.value;refreshLanguageValidation();}));

  const totalMain=HOINHAP_FIXED.length+1;
  const summary=document.getElementById("mainCriteriaSummary");
  summary.innerHTML = completedMain===totalMain
    ? `<div class="req-summary"><div class="req-chip met">Đã hoàn thành tiêu chí chính</div></div>`
    : `<div class="req-summary"><div class="req-chip">Đã hoàn thành ${completedMain}/${totalMain} tiêu chí chính</div></div>`;

  const phuMet = renderPhuGroupsBlock(document.getElementById("phuHost"), GROUPS.hoiNhap, hn.groups, renderHoiNhap);
  const nav = navButtons(() => {
    const fixedDeclared=HOINHAP_FIXED.every(g=>{const gs=hn.fixed[g.id]; return gs.pending || gs.yes===false || (gs.yes===true && (gs.items||[]).length>=(g.minCount||1));});
    const englishDeclared=hn.ngoaiNguPending || hn.ngoaiNguMethod==="courseB" || hn.ngoaiNguMethod==="exempt" || hn.ngoaiNguMethod==="notMet" || (hn.ngoaiNguMethod==="certificate" && validateNgoaiNguCertificate(hn,khoaLabel).ok);
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
    itemsList.push({id:newStableId('khac'),text:v});
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
      const picked = Array.isArray(gs.items) ? gs.items : [];
      // Hồ sơ/bản nháp cũ của nhóm nay đã chuyển sang dạng danh sách vẫn còn nội
      // dung tự gõ ở `detail`; giữ nguyên khóa minh chứng cũ để không mất đánh dấu.
      if(!picked.length && gs.yes === true && String(gs.detail || "").trim()){
        items.push({key:g.id, label:String(gs.detail).trim(), method:EVIDENCE_DEFAULT_MANUAL});
      }
      picked.forEach(it => {
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
    key: it.id || "tn-" + idx,
    label: window.SV5TRules.formatVolunteerItem(it),
    // `minhchung` của nhóm Tình nguyện trong file Excel nguồn thực chất là cột
    // "Yêu cầu" ("Tham gia"), không phải cách minh chứng, nên không dùng làm gợi ý.
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
  if(hn.ngoaiNguMethod === "courseB"){
    items.push({key:"hn-ngoaingu", label:"Không có học phần Tiếng Anh nào dưới loại B trong 2 kỳ chính", method:"Ảnh bảng điểm hai kỳ chính thể hiện điểm các học phần Tiếng Anh"});
  } else if(hn.ngoaiNguMethod === "exempt"){
    items.push({key:"hn-ngoaingu", label:"Được miễn học phần ngoại ngữ theo chương trình", method:"Xác nhận miễn học phần ngoại ngữ"});
  } else if(hn.ngoaiNguMethod === "certificate" && validateNgoaiNguCertificate(hn, validateMSSV(state.personal.mssv).khoaLabel).ok){
    items.push({key:"hn-ngoaingu", label:formatCertificateResult(hn), method:"Ảnh chứng chỉ ngoại ngữ hoặc giấy xác nhận tương đương"});
  }
  items.push(...groupEvidenceItems(GROUPS.hoiNhap.list, hn.groups));
  return items;
}

function evidenceKhac(){
  return state.khac.items.map((it, idx) => ({
    key: it.id || "khac-" + idx,
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

const EVIDENCE_IMAGE_MAX_SOURCE_BYTES=20*1024*1024;
const EVIDENCE_IMAGE_MAX_DIMENSION=1600;
const EVIDENCE_IMAGE_INITIAL_QUALITY=0.82;
const EVIDENCE_IMAGE_TARGET_BYTES=900*1024;

function canvasToJpegBlob(canvas,quality){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Trình duyệt không thể tạo ảnh JPEG.")),"image/jpeg",quality);
  });
}

function loadEvidenceImage(file){
  return new Promise((resolve,reject)=>{
    const objectUrl=URL.createObjectURL(file);
    const img=new Image();
    img.decoding="async";
    img.onload=()=>resolve({img,objectUrl});
    img.onerror=()=>{URL.revokeObjectURL(objectUrl);reject(new Error("Ảnh bị hỏng hoặc trình duyệt không thể giải mã."));};
    img.src=objectUrl;
  });
}

async function compressEvidenceImage(file,maxDim=EVIDENCE_IMAGE_MAX_DIMENSION,quality=EVIDENCE_IMAGE_INITIAL_QUALITY){
  if(!file||!Number.isFinite(file.size)||file.size<=0) throw new Error("Tệp ảnh rỗng hoặc không đọc được dung lượng.");
  if(file.size>EVIDENCE_IMAGE_MAX_SOURCE_BYTES) throw new Error("Ảnh gốc vượt quá 20 MB. Vui lòng chọn ảnh nhỏ hơn.");
  const loaded=await loadEvidenceImage(file);
  let canvas=null;
  try{
    const sourceWidth=loaded.img.naturalWidth,sourceHeight=loaded.img.naturalHeight;
    if(!sourceWidth||!sourceHeight) throw new Error("Không đọc được kích thước ảnh.");
    let width=sourceWidth,height=sourceHeight;
    const scale=Math.min(1,maxDim/Math.max(width,height));
    width=Math.max(1,Math.round(width*scale));height=Math.max(1,Math.round(height*scale));

    canvas=document.createElement("canvas");
    canvas.width=width;canvas.height=height;
    let context=canvas.getContext("2d",{alpha:false});
    if(!context) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh bằng canvas.");
    context.fillStyle="#ffffff";context.fillRect(0,0,width,height);
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality="high";
    context.drawImage(loaded.img,0,0,width,height);

    let blob=await canvasToJpegBlob(canvas,quality);
    for(const nextQuality of [0.76,0.70]){
      if(blob.size<=EVIDENCE_IMAGE_TARGET_BYTES) break;
      blob=await canvasToJpegBlob(canvas,nextQuality);
    }
    if(blob.size>EVIDENCE_IMAGE_TARGET_BYTES&&Math.max(width,height)>1100){
      const shrink=Math.max(0.72,Math.min(0.92,Math.sqrt(EVIDENCE_IMAGE_TARGET_BYTES/blob.size)*0.96));
      const nextWidth=Math.max(1,Math.round(width*shrink)),nextHeight=Math.max(1,Math.round(height*shrink));
      const smaller=document.createElement("canvas");smaller.width=nextWidth;smaller.height=nextHeight;
      const smallerContext=smaller.getContext("2d",{alpha:false});
      if(!smallerContext) throw new Error("Trình duyệt không hỗ trợ thu nhỏ ảnh.");
      smallerContext.fillStyle="#ffffff";smallerContext.fillRect(0,0,nextWidth,nextHeight);
      smallerContext.imageSmoothingEnabled=true;smallerContext.imageSmoothingQuality="high";
      smallerContext.drawImage(canvas,0,0,nextWidth,nextHeight);
      canvas.width=1;canvas.height=1;canvas=smaller;width=nextWidth;height=nextHeight;
      blob=await canvasToJpegBlob(canvas,0.78);
    }
    const dataUrl=await blobToDataUrl(blob);
    return {blob,dataUrl,width,height,size:blob.size,contentType:"image/jpeg"};
  } finally {
    URL.revokeObjectURL(loaded.objectUrl);
    loaded.img.src="";
    if(canvas){canvas.width=1;canvas.height=1;}
  }
}

function formatImageBytes(bytes){
  const value=Number(bytes)||0;
  return value>=1024*1024?`${(value/1024/1024).toFixed(1)} MB`:`${Math.max(1,Math.round(value/1024))} KB`;
}

function renderImageSlot(container, evKey, slotLabel){
  const wrap = document.createElement("div");
  wrap.className = "evidence-img-slot";
  const existing = state.evidenceImages[evKey];

  if(existing){
    wrap.innerHTML = `
      <img src="${existing.dataUrl}" class="evidence-img-thumb" alt="minh chứng">
      <div class="evidence-img-info">
        <div class="evidence-img-name">${escapeHtml(slotLabel ? slotLabel + ": " : "")}${escapeHtml(existing.name)}${existing.size?` · ${formatImageBytes(existing.size)}`:""}</div>
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
      <input type="file" accept="image/jpeg,image/png,image/webp" id="${inputId}" style="display:none">
    `;
    const inputEl = wrap.querySelector("input[type=file]");
    inputEl.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
        await appAlert("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP. Vui lòng chuyển ảnh HEIC/HEIF sang JPG trước khi tải lên.","Định dạng ảnh không hỗ trợ");
        e.target.value="";
        return;
      }
      const label = wrap.querySelector(".evidence-img-upload-btn");
      const originalLabelText = label.textContent;
      label.textContent = "Đang xử lý ảnh...";
      inputEl.disabled=true;
      try{
        const compressed=await compressEvidenceImage(file);
        state.evidenceImages[evKey]={...compressed,name:file.name,localVersion:newStableId("img")};
        state.removedEvidenceImageKeys=(state.removedEvidenceImageKeys||[]).filter(key=>key!==evKey);
        markStateDirty();
        renderMinhChung();
      }catch(err){
        console.error("Không thể xử lý ảnh:",err);
        label.textContent=originalLabelText;inputEl.disabled=false;inputEl.value="";
        await appAlert(err?.message||"Không thể nén ảnh. Vui lòng thử ảnh JPG/PNG/WEBP khác.","Xử lý ảnh thất bại");
      }
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
    const source = groupStates?.[g.id];
    if(!source){ result.unanswered++; return; }
    const gs = source.notMet === true && source.yes == null ? {...source,yes:false} : source;
    if(gs.pending){ result.later++; return; }
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
    (t.hoanThanhDuGDTC === true || t.khongDiemF === true || t.khongDiemF === false) ? out.declared++ : out.unanswered++;
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
    if(hn.ngoaiNguPending || hn.ngoaiNguMethod==="courseB" || hn.ngoaiNguMethod==="exempt" || hn.ngoaiNguMethod==="notMet" || certOk) { hn.ngoaiNguPending ? out.later++ : out.declared++; } else out.unanswered++;
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
  if(reason.includes("link đơn")) return `${label} — link đơn đang trống hoặc không đúng định dạng HTTPS`;
  return `${label} — ${reason}`;
}

async function openSubmissionReviewDialog(){
  const outcome=await callApi('/api/submissions/review',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      fullName:state.personal.fullName,
      mssv:state.personal.mssv,
      className:state.personal.className,
      data:serializeStateForStorage({includeImageData:false}),
      evidenceImages:buildEvidenceImagesPayload(),
      removedEvidenceImageKeys:[...(state.removedEvidenceImageKeys||[])]
    })
  });
  if(!outcome.ok){ await reportApiFailure(outcome,'Kiểm tra hồ sơ trước khi gửi'); return false; }
  const review=outcome.body.review;
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
            const label=document.createElement("label"); label.textContent="Link đơn minh chứng";
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

function reviewMarked(key){ return Boolean(window._adminReviewSubmission && window._adminReviewFlags?.[key]); }
function reviewLine(text,key,extra){ return Object.assign({text,reviewKey:key,color:reviewMarked(key)?"red":undefined},extra||{}); }

function pickedGroupItemNames(groupsDef, groupsState, sectionKey){
  const entries = [];
  groupsDef.list.forEach(g => {
    const gs = groupsState[g.id];
    if(gs.pending){
      entries.push({text:`Bổ sung sau: ${g.label}`, color:"red"});
      return;
    }
    if(gs.notMet || gs.yes===false) return;
    if(g.type === "sheet" || g.type === "manualList"){
      const picked = Array.isArray(gs.items) ? gs.items : [];
      if(!picked.length && gs.yes === true && String(gs.detail || "").trim()){
        entries.push(reviewLine(String(gs.detail).trim(),`evidence:${sectionKey}::${g.id}`));
      }
      picked.forEach(it => { const key=`evidence:${sectionKey}::${g.id}:${it.id||it.name}`; entries.push(reviewLine(it.name,key,it.proposed&&!reviewMarked(key)?{color:"green"}:{})); });
    } else if(g.type === "manualRank"){
      if(gs.yes === true && gs.rank){
        const tpl = g.reportTemplate || g.label;
        entries.push(reviewLine(tpl.replace("{rank}", lowerFirst(gs.rank)),`evidence:${sectionKey}::${g.id}`));
      }
    } else {
      if(gs.yes === true){
        if(g.plainDetail){
          // Chỉ ghi đúng nội dung sinh viên tự điền, không lặp lại cả câu tiêu chí gốc
          entries.push(reviewLine(gs.detail ? gs.detail : g.label,`evidence:${sectionKey}::${g.id}`));
        } else {
          const base = g.label.replace(/\.$/, "");
          entries.push(reviewLine(gs.detail ? `${base} (${gs.detail}).` : g.label,`evidence:${sectionKey}::${g.id}`));
        }
      }
    }
  });
  return entries;
}

function getDaoDucLines(){
  const d=state.daoDuc; const lines=[];
  const avg=(d.renLuyenKy1!==""&&d.renLuyenKy2!=="")?((Number(d.renLuyenKy1)+Number(d.renLuyenKy2))/2).toFixed(1):"";
  lines.push(reviewLine("Điểm rèn luyện:","evidence:daoDuc::dd-rl"),reviewLine(`+ Kỳ 1: ${d.renLuyenKy1}`,"evidence:daoDuc::dd-rl",{plain:true}),reviewLine(`+ Kỳ 2: ${d.renLuyenKy2}`,"evidence:daoDuc::dd-rl",{plain:true}),reviewLine(`Trung bình: ${avg}`,"evidence:daoDuc::dd-rl",{plain:true}));
  if(d.khongViPham===true) lines.push({text:"Không vi phạm pháp luật và các quy chế, nội quy của Nhà trường, quy định của địa phương và cộng đồng."});
  pickedGroupItemNames(GROUPS.daoDuc,d.groups,"daoDuc").forEach(entry=>lines.push(entry)); return lines;
}
function getHocTapLines(){
  const h = state.hocTap;
  const dien = HOCTAP_DIEN[h.dien];
  const avg = calculateWeightedGpa(h) !== null ? calculateWeightedGpa(h).toFixed(2) : "";
  const lines = [];
  lines.push(reviewLine("Điểm học tập:","evidence:hocTap::ht-diem"));
  lines.push(reviewLine(`+ Kỳ 1: ${h.diemKy1}/${dien.scale} (${h.tinChiKy1} tín chỉ)`,"evidence:hocTap::ht-diem",{plain:true}));
  lines.push(reviewLine(`+ Kỳ 2: ${h.diemKy2}/${dien.scale} (${h.tinChiKy2} tín chỉ)`,"evidence:hocTap::ht-diem",{plain:true}));
  lines.push(reviewLine(`Trung bình: ${avg}`,"evidence:hocTap::ht-diem",{plain:true}));
  pickedGroupItemNames(GROUPS.hocTap, h.groups,"hocTap").forEach(entry => lines.push(entry));
  return lines;
}
function getTheLucLines(){
  const t = state.theLuc;
  const lines = [];
  if(t.hoanThanhDuGDTC){
    lines.push(reviewLine("Hoàn thành chương trình đào tạo giáo dục thể chất theo quy định tại Đại học Bách khoa Hà Nội.","evidence:theLuc::tl-gdtc"));
  } else if(t.khongDiemF === true) {
    lines.push(reviewLine("Không có điểm F nào trong tất cả các học phần giáo dục thể chất đã học trong 2 kỳ chính trong năm học.","evidence:theLuc::tl-gdtc"));
  }
  pickedGroupItemNames(GROUPS.theLuc, t.groups,"theLuc").forEach(entry => lines.push(entry));
  return lines;
}
function getTinhNguyenLines(){
  const tn = state.tinhNguyen;
  const lines = tn.items.map((it,i) => reviewLine(window.SV5TRules.formatVolunteerItem(it),`evidence:tinhNguyen::${it.id||`tn-${i}`}`));
  const total = tn.items.reduce((s,it)=>s+(Number(it.days)||0),0);
  lines.push({text:`Tổng số ngày tình nguyện: ${total} ngày.`, plain:true});
  if(total < 5 && tn.pending) lines.push({text:`Còn thiếu/cần bổ sung sau ${Math.max(0,5-total)} ngày.`, color:"red"});
  if(tn.khenThuong) lines.push(reviewLine("Được khen thưởng từ cấp đại học trở lên về hoạt động tình nguyện.","evidence:tinhNguyen::tn-khenthuong"));
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
      (Array.isArray(gs.items)?gs.items:[]).forEach(it => {const key=`evidence:hoiNhap::${g.id}:${it.id||it.name}`;lines.push(reviewLine(it.name,key,it.proposed&&!reviewMarked(key)?{color:"green"}:{}));});
    }
  });
  if(hn.ngoaiNguPending){
    lines.push({text:"Chuẩn ngoại ngữ: cần bổ sung sau.", color:"red"});
  } else if(hn.ngoaiNguMethod === "courseB"){
    lines.push(reviewLine("Không có học phần Tiếng Anh nào dưới loại B trong 2 kỳ chính.","evidence:hoiNhap::hn-ngoaingu"));
  } else if(hn.ngoaiNguMethod === "exempt"){
    lines.push(reviewLine("Được miễn các học phần ngoại ngữ theo chương trình đào tạo.","evidence:hoiNhap::hn-ngoaingu"));
  } else if(hn.ngoaiNguMethod === "certificate" && validateNgoaiNguCertificate(hn,validateMSSV(state.personal.mssv).khoaLabel).ok){
    lines.push(reviewLine(`${formatCertificateResult(hn)}.`,`evidence:hoiNhap::hn-ngoaingu`));
  }
  pickedGroupItemNames(GROUPS.hoiNhap, hn.groups,"hoiNhap").forEach(entry => lines.push(entry));
  return lines;
}
function getSimpleLines(items){
  return items.map((it,i) => reviewLine(it.text,`evidence:khac::${it.id||`khac-${i}`}`));
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
        <button class="btn btn-export" id="exportWordBtn">Tải file Word</button>
        <button class="btn btn-secondary" id="saveLocalBtn">Lưu local trên máy</button>
        <button class="btn btn-primary" id="submitSupabaseBtn">${getSubmissionButtonLabel()}</button>
      </div>
      <div id="lastSubmissionInfo" class="submission-sent-info">${getLastSubmissionInfoHtml()}</div>
      <div id="submitStatusMsg"></div>
    </div>
  `;

  document.getElementById("exportWordBtn").onclick = exportDocx;
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
    appAlert("Không tải được thư viện tạo file Word (cần kết nối mạng). Vui lòng kiểm tra lại kết nối mạng rồi thử lại.","Không thể xuất Word");
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
  const sampleItem=(key,index,fallback)=>CRITERIA[key]?.[index]
    ? {...CRITERIA[key][index]}
    : {id:newStableId("sample"),name:fallback,yeuCau:"Dữ liệu minh họa",minhchung:"Minh chứng minh họa",proposed:true};
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
      "DD-G1": {yes:true,pending:false,items:[
        sampleItem("daoDuc",0,"Hoạt động Đạo đức minh họa")
      ]},
      "DD-G2": {yes:false,pending:false,rank:""},
      "DD-G3": {yes:false,pending:false,rank:""},
      "DD-G4": {yes:false,pending:false,items:[]},
      "DD-G5": {yes:false,pending:false,detail:""}
    }
  };
  state.hocTap = {
    dien:"thuong", diemKy1:"3.38", tinChiKy1:"13", diemKy2:"3.37", tinChiKy2:"13",
    groups: {
      "HT-G1": {yes:false,pending:false,detail:""},
      "HT-G2": {yes:false,pending:false,detail:""},
      "HT-G3": {yes:true,pending:false,items:[sampleItem("hocTap",0,"Hoạt động Học tập minh họa")]},
      "HT-G4": {yes:false,pending:false,detail:""},
      "HT-G5": {yes:false,pending:false,detail:""},
      "HT-G6": {yes:false,pending:false,detail:""}
    }
  };
  state.theLuc = {
    hoanThanhDuGDTC:false, khongDiemF:true,
    groups: {
      "TL-G1": {yes:false,pending:false,detail:""},
      "TL-G2": {yes:true,pending:false,items:[
        sampleItem("theLuc",0,"Hoạt động Thể lực minh họa 1"),
        sampleItem("theLuc",1,"Hoạt động Thể lực minh họa 2")
      ]},
      "TL-G3": {yes:false,pending:false,detail:""},
      "TL-G4": {yes:false,pending:false,detail:""}
    }
  };
  state.tinhNguyen = {
    items:[{id:newStableId('tn'),text:"Hoạt động tình nguyện minh họa",days:5,dates:["2025-10-19","2025-10-24","2025-10-26","2025-10-31","2025-11-02"],proposed:true}],
    pending:false,khenThuong:false,proposeOpen:false
  };
  state.hoiNhap = {
    fixed: {
      "HN-KHOA-HOC": {yes:true,items:[sampleItem("hoiNhapKhoaHoc",0,"Khóa kỹ năng minh họa")],pending:false},
      "HN-CAP-DAI-HOC": {yes:true,items:[sampleItem("hoiNhapCapDaiHoc",0,"Hoạt động hội nhập minh họa")],pending:false}
    },
    ngoaiNguMethod: "certificate",
    ngoaiNguCertificateType:"TOEIC",
    ngoaiNguCertificateScore:"650",
    ngoaiNguPending:false,
    groups: {
      "HN-G1": {yes:false,pending:false,items:[]},
      "HN-G2": {yes:true,pending:false,items:[sampleItem("hoiNhapPhu",0,"Cuộc thi hội nhập minh họa")]}
    }
  };
  state.khac = { items:[{id:newStableId('khac'),text:"Đạt học bổng KKHT loại B kỳ 2024.1"}] };
  state.step = 0;
  render();
}
// (Sự kiện các nút được gắn tập trung trong main.js sau khi trang tải xong)

/* =========================================================
   8. NHẬP / XUẤT EXCEL DANH SÁCH HOẠT ĐỘNG
   Cấu trúc cột: Tiêu chí | Tiêu chí chính/phụ | Mô tả tiêu chí cụ thể | Mã hoạt động | Hoạt động | Yêu cầu | Cách thức Minh chứng
   ========================================================= */
function getActivityCatalogSnapshot(){
  return Object.fromEntries(ACTIVITY_CATALOG_KEYS.map(key=>[key,CRITERIA[key].map(x=>({...x}))]));
}

const ACTIVITY_CATALOG_KEYS = Object.freeze([
  "daoDuc","daoDucDangDoan",
  "hocTap","hocTapClb","hocTapNckh","hocTapNhomNckh","hocTapThamLuan","hocTapSangTao",
  "theLuc","tinhNguyen",
  "hoiNhapKhoaHoc","hoiNhapCapDaiHoc","hoiNhapGiaoLuu","hoiNhapPhu"
]);

const ACTIVITY_CATALOG_PREFIXES = Object.freeze({
  daoDuc:"DD-G1",daoDucDangDoan:"DD-G4",
  hocTap:"HT-G3",hocTapClb:"HT-G1",hocTapNckh:"HT-G2",hocTapNhomNckh:"HT-G4",hocTapThamLuan:"HT-G5",hocTapSangTao:"HT-G6",
  theLuc:"TL-G2",tinhNguyen:"TN",
  hoiNhapKhoaHoc:"HN-KH",hoiNhapCapDaiHoc:"HN-DH",hoiNhapGiaoLuu:"HN-G1",hoiNhapPhu:"HN-G2"
});
// Cùng một bộ lọc với backend (server.js, route PUT /api/admin/activity-catalog).
const CATALOG_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;

function stableCatalogFallbackId(prefix,name){
  let hash=2166136261;
  const text=`${prefix}:${normalizeVN(name).replace(/\s+/g," ")}`;
  for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return `${prefix}-${(hash>>>0).toString(36)}`;
}
function applyActivityCatalog(catalog){
  if(!catalog||typeof catalog!=="object") return false;
  // Catalog sáu nhóm của bản trước vẫn được đọc an toàn trong lúc chờ admin
  // nhập lại Excel; các nhóm mới sẽ tạm rỗng thay vì làm mất danh mục đang có.
  if(!ACTIVITY_CATALOG_KEYS.some(key=>Array.isArray(catalog[key]))) return false;
  const next={};
  for(const key of ACTIVITY_CATALOG_KEYS){
    const used=new Set();
    next[key]=(Array.isArray(catalog[key])?catalog[key]:[]).map(x=>{
      // Phải dùng đúng cùng công thức với parseActivityCatalogRows: cùng prefix và
      // cùng bộ lọc định dạng, nếu không một hoạt động sẽ có hai ID khác nhau tùy
      // theo nó đến từ lần import hay từ AppConfig.activityCatalog lúc tải trang.
      const name=String(x.name||""),rawId=String(x.id||"");
      let id=CATALOG_ID_PATTERN.test(rawId)?rawId:stableCatalogFallbackId(ACTIVITY_CATALOG_PREFIXES[key],name);
      if(used.has(id)){let suffix=2;while(used.has(`${id}-${suffix}`))suffix++;id=`${id}-${suffix}`;}used.add(id);
      return {id,name,yeuCau:String(x.yeuCau||""),minhchung:String(x.minhchung||"")};
    }).filter(x=>x.name);
  }
  for(const key of ACTIVITY_CATALOG_KEYS) CRITERIA[key].splice(0,CRITERIA[key].length,...next[key]);
  return true;
}

const EXCEL_CATEGORY_MAP = [
  {key:"daoDuc",  label:"Đạo đức Tốt",  match:"dao duc"},
  {key:"hocTap",  label:"Học tập Tốt",  match:"hoc tap"},
  {key:"theLuc",  label:"Thể lực Tốt",  match:"the luc"},
  {key:"tinhNguyen",label:"Tình nguyện Tốt",match:"tinh nguyen"},
  {key:"hoiNhap", label:"Hội nhập Tốt", match:"hoi nhap"}
];

function normalizeVN(s){
  return removeDiacritics(String(s||"")).toLowerCase().trim();
}

function normalizeCatalogText(value){
  return normalizeVN(value).replace(/\s+/g," ");
}

// Một đề xuất phải được đối chiếu trước khi thêm:
//  - trùng tên trong danh mục chính thức -> thêm như mục chính thức, KHÔNG gắn
//    cờ proposed (nếu không báo cáo sẽ tô xanh như đề xuất mới và Ban phải đi
//    thẩm định một hoạt động vốn đã có sẵn);
//  - trùng tên đã có trong danh sách -> từ chối, vì điều kiện đạt chỉ đếm
//    items.length nên hai dòng trùng tên sẽ thoả minCount một cách sai lệch.
function resolveProposedActivity(rawName,catalogItems,existingItems){
  const name=String(rawName||"").trim();
  if(!name) return {status:"empty"};
  const key=window.SV5TRules.normalizeActivityName(name);
  const catalog=Array.isArray(catalogItems)?catalogItems:[];
  const existing=Array.isArray(existingItems)?existingItems:[];
  const official=catalog.find(entry=>window.SV5TRules.normalizeActivityName(entry.name)===key);
  if(existing.some(item=>window.SV5TRules.normalizeActivityName(item.name)===key||(official&&item.id===official.id))){
    return {status:"duplicate",name:official?official.name:name};
  }
  if(official) return {status:"official",item:{id:official.id,name:official.name,yeuCau:official.yeuCau||"",minhchung:official.minhchung||""}};
  return {status:"proposed",item:{id:newStableId("proposed"),name,proposed:true}};
}

function resolveActivityCatalogKey(category,type,description){
  const desc=normalizeCatalogText(description);
  if(category==="daoDuc"){
    if(desc.includes("dang")&&desc.includes("doan")&&desc.includes("hoi")&&!desc.includes("mac")) return "daoDucDangDoan";
    if(desc.includes("mac")||desc.includes("ho chi minh")) return "daoDuc";
  }
  if(category==="hocTap"){
    if(desc.includes("mang/ban")||desc.includes("clb hoc thuat")) return "hocTapClb";
    if(desc.includes("nhom nghien cuu khoa hoc")) return "hocTapNhomNckh";
    if(desc.includes("de tai nghien cuu khoa hoc")) return "hocTapNckh";
    if(desc.includes("bai tham luan")) return "hocTapThamLuan";
    if(desc.includes("san pham sang tao")) return "hocTapSangTao";
    if(desc.includes("ky thi")||desc.includes("cuoc thi hoc thuat")) return "hocTap";
  }
  if(category==="theLuc") return "theLuc";
  if(category==="tinhNguyen") return "tinhNguyen";
  if(category==="hoiNhap"){
    if(type==="chinh"&&desc.includes("khoa trang bi ky nang thuc hanh xa hoi")) return "hoiNhapKhoaHoc";
    if(type==="chinh"&&desc.includes("hoat dong hoi nhap")&&desc.includes("dai hoc")) return "hoiNhapCapDaiHoc";
    if(type==="phu"&&desc.includes("giao luu quoc te")) return "hoiNhapGiaoLuu";
    if(type==="phu"&&(desc.includes("kien thuc hoi nhap")||desc.includes("ngoai ngu"))) return "hoiNhapPhu";
  }
  return "";
}

// Lỗi đọc file danh mục: gom TOÀN BỘ dòng hỏng rồi báo một lượt, kèm số dòng và
// tên cột, để quản trị sửa hết trong một lần thay vì sửa từng dòng rồi import lại.
class ActivityCatalogParseError extends Error {
  constructor(message,issues){
    super(message);
    this.name="ActivityCatalogParseError";
    this.issues=Array.isArray(issues)?issues:[];
  }
}
const CATALOG_MAX_REPORTED_ISSUES=200;

function parseActivityCatalogRows(rows){
  if(!Array.isArray(rows)||!rows.length) throw new ActivityCatalogParseError("File Excel không có dữ liệu. Hãy kiểm tra xem sheet đầu tiên có phải danh sách hoạt động không.",[]);
  const headerIndex=rows.findIndex(row=>{
    const headers=(Array.isArray(row)?row:[]).map(normalizeCatalogText);
    return headers.some(h=>h==="hoat dong")&&headers.some(h=>h.includes("tieu chi"));
  });
  if(headerIndex<0) throw new ActivityCatalogParseError("Không tìm thấy hàng tiêu đề của danh sách hoạt động. Hàng tiêu đề phải có đồng thời cột “Tiêu chí” và cột “Hoạt động”.",[]);
  const header=rows[headerIndex].map(normalizeCatalogText);
  const findCol=pred=>header.findIndex(pred);
  const columns={
    category:findCol(h=>h==="tieu chi"),
    type:findCol(h=>h.includes("tieu chi")&&h.includes("chinh")&&h.includes("phu")),
    description:findCol(h=>h.includes("mo ta")&&h.includes("tieu chi")),
    id:findCol(h=>h.includes("ma hoat dong")),
    activity:findCol(h=>h==="hoat dong"),
    requirement:findCol(h=>h.includes("yeu cau")),
    evidence:findCol(h=>h.includes("minh chung"))
  };
  const missing=[];
  if(columns.category<0)missing.push("Tiêu chí");
  if(columns.type<0)missing.push("Tiêu chí chính/phụ");
  if(columns.description<0)missing.push("Mô tả tiêu chí cụ thể");
  if(columns.activity<0)missing.push("Hoạt động");
  if(columns.requirement<0)missing.push("Yêu cầu");
  if(columns.evidence<0)missing.push("Cách thức minh chứng");
  if(missing.length) throw new ActivityCatalogParseError(
    `File thiếu ${missing.length} cột bắt buộc ở hàng tiêu đề (dòng ${headerIndex+1}).`,
    missing.map(name=>({row:headerIndex+1,column:name,reason:"Không tìm thấy cột này ở hàng tiêu đề."}))
  );

  const collected=Object.fromEntries(ACTIVITY_CATALOG_KEYS.map(key=>[key,[]]));
  const seenNames=Object.fromEntries(ACTIVITY_CATALOG_KEYS.map(key=>[key,new Map()]));
  const issues=[];
  const addIssue=(row,column,reason,value)=>{ if(issues.length<CATALOG_MAX_REPORTED_ISSUES) issues.push({row,column,reason,value:value||""}); };
  let currentCategory="",currentType="",sourceCount=0,badCategoryLine=0;

  for(let index=headerIndex+1;index<rows.length;index++){
    const row=Array.isArray(rows[index])?rows[index]:[];
    const lineNo=index+1;
    const rawCategory=String(row[columns.category]??"").trim();
    const rawType=String(row[columns.type]??"").trim();
    const activity=String(row[columns.activity]??"").trim();
    if(rawCategory){
      const normalized=normalizeCatalogText(rawCategory);
      const matched=(EXCEL_CATEGORY_MAP.find(item=>normalized.includes(item.match))||{}).key||"";
      if(matched) currentCategory=matched;
      else {
        currentCategory="";
        badCategoryLine=lineNo;
        addIssue(lineNo,"Tiêu chí",`Không nhận diện được tiêu chí. Chỉ chấp nhận: ${EXCEL_CATEGORY_MAP.map(item=>item.label).join(", ")}.`,rawCategory);
      }
    }
    if(rawType){
      const normalized=normalizeCatalogText(rawType);
      currentType=normalized.includes("phu")?"phu":(normalized.includes("chinh")?"chinh":"");
      if(!currentType) addIssue(lineNo,"Tiêu chí chính/phụ",'Chỉ chấp nhận "Tiêu chí chính" hoặc "Tiêu chí phụ".',rawType);
    }
    if(!activity||activity.startsWith("(")) continue;
    sourceCount++;

    const description=String(row[columns.description]??"").trim();
    if(!currentCategory){ if(badCategoryLine!==lineNo) addIssue(lineNo,"Tiêu chí","Dòng này không có tiêu chí và cũng không kế thừa được tiêu chí của dòng trên.",activity); continue; }
    if(!currentType){ addIssue(lineNo,"Tiêu chí chính/phụ","Dòng này không có loại tiêu chí và cũng không kế thừa được từ dòng trên.",activity); continue; }

    const key=resolveActivityCatalogKey(currentCategory,currentType,description);
    if(!key){ addIssue(lineNo,"Mô tả tiêu chí cụ thể","Mô tả không khớp nhóm nào nên không biết xếp hoạt động vào dropdown nào. Hãy dùng lại đúng mô tả chuẩn của tiêu chí.",description||"(trống)"); continue; }

    const normalizedName=normalizeCatalogText(activity);
    const duplicatedAt=seenNames[key].get(normalizedName);
    if(duplicatedAt){ addIssue(lineNo,"Hoạt động",`Trùng tên với hoạt động ở dòng ${duplicatedAt} trong cùng nhóm.`,activity); continue; }
    seenNames[key].set(normalizedName,lineNo);

    const rawId=columns.id>=0?String(row[columns.id]??"").trim():"";
    if(rawId&&!CATALOG_ID_PATTERN.test(rawId)){ addIssue(lineNo,"Mã hoạt động","Mã chỉ được dùng chữ, số và các ký tự . _ : - (tối đa 100 ký tự). Để trống ô này nếu muốn hệ thống tự sinh mã.",rawId); continue; }

    const entry={id:rawId,name:activity,yeuCau:String(row[columns.requirement]??"").trim(),minhchung:String(row[columns.evidence]??"").trim()};
    const tooLong=[["Hoạt động",entry.name,500],["Yêu cầu",entry.yeuCau,500],["Cách thức minh chứng",entry.minhchung,1000]]
      .find(([,value,limit])=>value.length>limit);
    if(tooLong){ addIssue(lineNo,tooLong[0],`Nội dung dài ${tooLong[1].length} ký tự, vượt giới hạn ${tooLong[2]} ký tự.`,tooLong[1].slice(0,80)+"..."); continue; }
    const unsafe=[["Hoạt động",entry.name],["Yêu cầu",entry.yeuCau],["Cách thức minh chứng",entry.minhchung]]
      .find(([,value])=>/[<>]/.test(value));
    if(unsafe){ addIssue(lineNo,unsafe[0],"Nội dung chứa ký tự < hoặc > nên bị chặn để tránh lỗi hiển thị. Hãy thay bằng ≤ / ≥ hoặc bỏ ký tự đó.",unsafe[1]); continue; }

    collected[key].push(entry);
  }

  if(!sourceCount) throw new ActivityCatalogParseError("Không tìm thấy hoạt động nào bên dưới hàng tiêu đề. Kiểm tra lại cột “Hoạt động”.",[]);
  const mappedCount=ACTIVITY_CATALOG_KEYS.reduce((sum,key)=>sum+collected[key].length,0);
  if(issues.length) throw new ActivityCatalogParseError(
    `Đọc được ${sourceCount} dòng hoạt động nhưng ${sourceCount-mappedCount} dòng bị lỗi. Danh mục cũ chưa bị thay đổi.`,
    issues
  );

  for(const key of ACTIVITY_CATALOG_KEYS){
    const usedIds=new Set();
    collected[key]=collected[key].map(entry=>{
      let id=CATALOG_ID_PATTERN.test(entry.id)?entry.id:stableCatalogFallbackId(ACTIVITY_CATALOG_PREFIXES[key],entry.name);
      if(usedIds.has(id)){let suffix=2;while(usedIds.has(`${id}-${suffix}`))suffix++;id=`${id}-${suffix}`;}
      usedIds.add(id);
      return {...entry,id};
    });
  }
  return {catalog:collected,sourceCount,mappedCount};
}

function exportCriteriaExcel(){
  if(typeof XLSX === "undefined"){
    appAlert("Không tải được thư viện Excel (cần kết nối mạng).","Không thể dùng Excel");
    return;
  }
  const rows = [["Tiêu chí", "Tiêu chí chính/phụ", "Mô tả tiêu chí cụ thể", "Mã hoạt động", "Hoạt động", "Yêu cầu", "Cách thức Minh chứng"]];

  function addRows(tieuChi, loai, moTa, items){
    if(!items.length) return;
    items.forEach(it => rows.push([tieuChi, loai, moTa||"", it.id||"", it.name, it.yeuCau||"", it.minhchung||""]));
  }

  const ddPhuDesc = (GROUPS.daoDuc.list.find(g=>g.id==="DD-G1")||{}).label || "";
  const ddDangDoanDesc = (GROUPS.daoDuc.list.find(g=>g.id==="DD-G4")||{}).label || "";
  const htNckhDesc = (GROUPS.hocTap.list.find(g=>g.id==="HT-G2")||{}).label || "";
  const htPhuDesc = (GROUPS.hocTap.list.find(g=>g.id==="HT-G3")||{}).label || "";
  const htClbDesc = (GROUPS.hocTap.list.find(g=>g.id==="HT-G1")||{}).label || "";
  const htNhomDesc = (GROUPS.hocTap.list.find(g=>g.id==="HT-G4")||{}).label || "";
  const htThamLuanDesc = (GROUPS.hocTap.list.find(g=>g.id==="HT-G5")||{}).label || "";
  const htSangTaoDesc = (GROUPS.hocTap.list.find(g=>g.id==="HT-G6")||{}).label || "";
  const tlPhuDesc = (GROUPS.theLuc.list.find(g=>g.id==="TL-G2")||{}).label || "";
  const hnKhoaHocDesc = (HOINHAP_FIXED[0]||{}).label || "";
  const hnCapDaiHocDesc = (HOINHAP_FIXED[1]||{}).label || "";
  const hnGiaoLuuDesc = (GROUPS.hoiNhap.list.find(g=>g.id==="HN-G1")||{}).label || "";
  const hnPhuDesc = (GROUPS.hoiNhap.list.find(g=>g.id==="HN-G2")||{}).label || "";

  addRows("Đạo đức Tốt", "Tiêu chí phụ", ddPhuDesc, CRITERIA.daoDuc);
  addRows("Đạo đức Tốt", "Tiêu chí phụ", ddDangDoanDesc, CRITERIA.daoDucDangDoan);
  addRows("Học tập Tốt", "Tiêu chí phụ", htClbDesc, CRITERIA.hocTapClb);
  addRows("Học tập Tốt", "Tiêu chí phụ", htNckhDesc, CRITERIA.hocTapNckh);
  addRows("Học tập Tốt", "Tiêu chí phụ", htPhuDesc, CRITERIA.hocTap);
  addRows("Học tập Tốt", "Tiêu chí phụ", htNhomDesc, CRITERIA.hocTapNhomNckh);
  addRows("Học tập Tốt", "Tiêu chí phụ", htThamLuanDesc, CRITERIA.hocTapThamLuan);
  addRows("Học tập Tốt", "Tiêu chí phụ", htSangTaoDesc, CRITERIA.hocTapSangTao);
  addRows("Thể lực Tốt", "Tiêu chí phụ", tlPhuDesc, CRITERIA.theLuc);
  addRows("Tình nguyện Tốt", "Tiêu chí chính", "Tham gia ít nhất 05 ngày tình nguyện", CRITERIA.tinhNguyen);
  addRows("Hội nhập Tốt", "Tiêu chí chính", hnKhoaHocDesc, CRITERIA.hoiNhapKhoaHoc);
  addRows("Hội nhập Tốt", "Tiêu chí chính", hnCapDaiHocDesc, CRITERIA.hoiNhapCapDaiHoc);
  addRows("Hội nhập Tốt", "Tiêu chí phụ", hnGiaoLuuDesc, CRITERIA.hoiNhapGiaoLuu);
  addRows("Hội nhập Tốt", "Tiêu chí phụ", hnPhuDesc, CRITERIA.hoiNhapPhu);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{wch:14},{wch:14},{wch:40},{wch:18},{wch:42},{wch:24},{wch:34}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Danh sách hoạt động");
  XLSX.writeFile(wb, "danh_sach_hoat_dong_sv5tot.xlsx");
}

let _activityCatalogImportRunning=false;
function importCriteriaExcel(file){
  if(typeof XLSX === "undefined"){
    appAlertDetailed({
      title:"Không dùng được chức năng Excel",
      message:"Trình duyệt chưa tải được thư viện đọc file Excel (SheetJS).",
      hint:"Thư viện này tải từ cdnjs.cloudflare.com. Hãy kiểm tra kết nối mạng hoặc tường lửa/chặn quảng cáo của máy, rồi tải lại trang."
    });
    return;
  }
  if(_activityCatalogImportRunning){appAlert("Một file danh mục đang được xử lý. Vui lòng chờ thao tác hiện tại hoàn tất.","Đang nhập Excel");return;}
  _activityCatalogImportRunning=true;
  const importButton=document.getElementById("importExcelBtn");
  const previousButtonText=importButton?.textContent||"Nhập Excel hoạt động";
  if(importButton){importButton.disabled=true;importButton.textContent="Đang nhập Excel...";}
  const finishImport=()=>{_activityCatalogImportRunning=false;if(importButton){importButton.disabled=false;importButton.textContent=previousButtonText;}};

  const reader = new FileReader();
  reader.onload = async (e) => {
    let parsed;
    // --- Bước 1: đọc file. Lỗi ở đây là lỗi định dạng/nội dung file. ---
    try{
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, {type:"array"});
      if(!wb.SheetNames.length) throw new ActivityCatalogParseError("File Excel không có sheet nào.",[]);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:""});
      parsed = parseActivityCatalogRows(rows);
    }catch(err){
      finishImport();
      const isParseError = err instanceof ActivityCatalogParseError;
      await appAlertDetailed({
        title:"Không đọc được file danh mục",
        message: err?.message || "Không đọc được nội dung file Excel.",
        hint: isParseError
          ? "Danh mục cũ trên hệ thống KHÔNG bị thay đổi. Sửa các dòng bên dưới trong file Excel rồi nhập lại - bảng ghi rõ số dòng đúng như trong Excel."
          : "Danh mục cũ trên hệ thống KHÔNG bị thay đổi. File có thể không phải .xlsx/.xls hợp lệ hoặc đang bị hỏng. Hãy mở lại bằng Excel, dùng “Save As” sang .xlsx rồi thử lại.",
        issues: isParseError ? err.issues : []
      });
      return;
    }

    // --- Bước 2: lưu lên máy chủ. Lỗi ở đây là lỗi mạng/máy chủ, không phải lỗi file. ---
    let saveResult;
    try{
      if(typeof isAdminUnlocked!=="function" || !isAdminUnlocked()){
        finishImport();
        await appAlertDetailed({title:"Phiên quản trị đã kết thúc",message:"Bạn cần đăng nhập quản trị lại trước khi thay danh mục hoạt động.",hint:"Danh mục cũ chưa bị thay đổi. Bấm “Quản trị” để đăng nhập lại rồi nhập file."});
        return;
      }
      saveResult = await callApi("/api/admin/activity-catalog",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({catalog:parsed.catalog})},{admin:true});
    }catch(err){
      finishImport();
      await appAlertDetailed({title:"Không lưu được danh mục",message:err?.message||"Lỗi không xác định khi gửi danh mục lên máy chủ.",hint:"Danh mục cũ chưa bị thay đổi."});
      return;
    }
    if(!saveResult.ok){
      finishImport();
      const label=API_SCOPE_LABEL[saveResult.scope]||API_SCOPE_LABEL.unknown;
      await appAlertDetailed({
        title:label.title,
        message:`Lưu danh mục hoạt động: ${saveResult.message}`,
        hint:`${label.hint} Danh mục cũ trên hệ thống KHÔNG bị thay đổi.`,
        issues:saveResult.body?.issues
      });
      return;
    }

    // --- Bước 3: chỉ đổi giao diện sau khi máy chủ đã xác nhận lưu xong. ---
    try{
      APP_CONFIG.activityCatalog=JSON.parse(JSON.stringify(parsed.catalog));
      if(!applyActivityCatalog(parsed.catalog)) throw new Error("Danh mục đã lưu trên máy chủ nhưng không áp dụng được lên giao diện.");
      render();
    }catch(err){
      finishImport();
      await appAlertDetailed({title:"Cần tải lại trang",message:err?.message||"Không áp dụng được danh mục mới.",hint:"Danh mục MỚI đã được lưu thành công trên máy chủ. Hãy nhấn F5 để tải lại trang, danh mục sẽ hiện đúng."});
      return;
    }

    finishImport();
    await appAlert(
      `Đã đọc ${parsed.sourceCount} dòng hoạt động và nhập đủ ${parsed.mappedCount} hoạt động vào danh mục.\n\n`+
      `Danh mục dropdown mới:\n`+
      `- Đạo đức: ${CRITERIA.daoDuc.length+CRITERIA.daoDucDangDoan.length}\n`+
      `- Học tập: ${CRITERIA.hocTapClb.length+CRITERIA.hocTap.length+CRITERIA.hocTapNckh.length+CRITERIA.hocTapNhomNckh.length+CRITERIA.hocTapThamLuan.length+CRITERIA.hocTapSangTao.length}\n`+
      `- Thể lực: ${CRITERIA.theLuc.length}\n`+
      `- Tình nguyện: ${CRITERIA.tinhNguyen.length}\n`+
      `- Hội nhập: ${CRITERIA.hoiNhapKhoaHoc.length+CRITERIA.hoiNhapCapDaiHoc.length+CRITERIA.hoiNhapGiaoLuu.length+CRITERIA.hoiNhapPhu.length}`,
      "Đã thay danh mục hoạt động"
    );
  };
  reader.onerror=async()=>{
    finishImport();
    await appAlertDetailed({title:"Trình duyệt không đọc được file",message:"Không đọc được file bạn vừa chọn.",hint:"Lỗi xảy ra ngay trên máy bạn. File có thể đang mở trong Excel, nằm trên ổ mạng bị ngắt, hoặc không còn quyền đọc. Hãy đóng Excel, copy file về Desktop rồi chọn lại. Danh mục cũ chưa bị thay đổi."});
  };
  try{reader.readAsArrayBuffer(file);}
  catch(err){finishImport();appAlertDetailed({title:"Không mở được file",message:err?.message||"Không đọc được file đã chọn.",hint:"Danh mục cũ chưa bị thay đổi."});}
}

// (Sự kiện các nút + lệnh render() khởi động được gắn tập trung trong main.js)
