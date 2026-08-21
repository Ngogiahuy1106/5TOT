/* =========================================================
   QUẢN TRỊ
   ========================================================= */
let _adminSessionActive = false;
let _dialogResolver = null;
let _adminSubmissions = [];
let _adminPage = 1;
let _adminTotalPages = 1;
let _adminTotal = 0;
let _adminSearchTimer = null;
let _pendingDeleteSubmission = null;
let _adminReviewers = [];
let _adminFormSnapshot = null;

function cloneCurrentAppState(){
  if(typeof structuredClone==='function') return structuredClone(state);
  return JSON.parse(JSON.stringify(state));
}
function captureAdminFormSnapshot(){
  if(_adminFormSnapshot) return;
  _adminFormSnapshot={state:cloneCurrentAppState(),hasUnsavedChanges:_hasUnsavedChanges,persistedImageVersions:new Map(_persistedDraftImageVersions)};
}
function exitAdminReviewMode({rerender=true}={}){
  window._adminReviewSubmission=null;
  window._adminReviewFlags={};
  document.body.classList.remove("admin-review-mode");
  if(_adminFormSnapshot){
    Object.keys(state).forEach(key=>delete state[key]);
    Object.assign(state,_adminFormSnapshot.state);
    _hasUnsavedChanges=_adminFormSnapshot.hasUnsavedChanges;
    _persistedDraftImageVersions.clear();
    _adminFormSnapshot.persistedImageVersions.forEach((value,key)=>_persistedDraftImageVersions.set(key,value));
    _adminFormSnapshot=null;
  }
  renderAdminReviewBanner();
  if(rerender){render();updateAutoSaveIndicator(_hasUnsavedChanges?'pending':'saved');}
}

/* =========================================================
   PHÂN LOẠI NGUỒN LỖI
   Mục tiêu: người dùng đọc thông báo là biết ngay lỗi nằm ở đâu - mạng của họ,
   máy chủ, kho ảnh, hay dữ liệu họ vừa nhập - thay vì một câu chung chung.
   ========================================================= */
const API_SCOPE_LABEL = Object.freeze({
  offline:      {title:"Máy bạn đang mất mạng",        hint:"Thiết bị đang không có kết nối Internet. Dữ liệu bạn đã nhập vẫn còn nguyên trên máy. Hãy bật lại mạng rồi thử lại."},
  network:      {title:"Không gọi được máy chủ",       hint:"Trình duyệt không kết nối được tới máy chủ. Có thể do mạng chập chờn hoặc máy chủ đang khởi động lại. Dữ liệu bạn đã nhập vẫn còn nguyên trên máy."},
  ratelimit:    {title:"Bạn thao tác quá nhanh",       hint:"Hệ thống giới hạn số lần thao tác trong một khoảng thời gian để tránh quá tải. Hãy chờ rồi thử lại."},
  permission:   {title:"Phiên đăng nhập không hợp lệ", hint:"Phiên quản trị đã hết hạn hoặc bạn chưa đăng nhập. Hãy đăng nhập lại rồi thao tác tiếp."},
  input:        {title:"Dữ liệu chưa hợp lệ",          hint:"Máy chủ từ chối vì nội dung gửi lên chưa đúng. Hãy sửa theo mô tả bên trên rồi gửi lại; không có dữ liệu nào bị thay đổi."},
  conflict:     {title:"Dữ liệu đã thay đổi",          hint:"Có người khác vừa cập nhật cùng dữ liệu này. Hãy tải lại rồi thao tác trên bản mới nhất."},
  notfound:     {title:"Không tìm thấy dữ liệu",       hint:"Mục bạn thao tác không còn tồn tại, có thể vừa bị xóa. Hãy tải lại danh sách."},
  storage:      {title:"Kho ảnh minh chứng gián đoạn", hint:"Máy chủ ảnh (Supabase Storage) đang không truy cập được. Dữ liệu cũ KHÔNG bị thay đổi. Hãy báo Ban quản trị và thử lại sau ít phút."},
  database:     {title:"Cơ sở dữ liệu gián đoạn",      hint:"Máy chủ không đọc/ghi được cơ sở dữ liệu. Hãy thử lại sau ít phút và báo Ban quản trị nếu vẫn lỗi."},
  unavailable:  {title:"Máy chủ đang bận",             hint:"Một dịch vụ phụ trợ đang tạm gián đoạn. Dữ liệu chưa bị thay đổi. Hãy thử lại sau ít phút."},
  server:       {title:"Máy chủ gặp lỗi",              hint:"Lỗi nằm ở phía máy chủ, không phải do dữ liệu bạn nhập. Hãy thử lại; nếu vẫn lỗi, báo Ban quản trị kèm thời điểm gặp lỗi."},
  browser:      {title:"Trình duyệt gặp lỗi",          hint:"Thao tác thất bại ngay trên máy bạn. Hãy thử tải lại trang hoặc dùng trình duyệt khác."},
  unknown:      {title:"Đã xảy ra lỗi",                hint:"Chưa xác định được nguyên nhân. Hãy thử lại; nếu lặp lại, báo Ban quản trị."}
});

function scopeFromStatus(status){
  if(status===401||status===403) return "permission";
  if(status===404) return "notfound";
  if(status===409) return "conflict";
  if(status===413||status===400||status===422) return "input";
  if(status===429) return "ratelimit";
  if(status===503) return "unavailable";
  if(status>=500) return "server";
  if(status>=400) return "input";
  return "unknown";
}

// Gọi API và luôn trả về một object mô tả rõ ràng thay vì ném lỗi trần.
// { ok, status, scope, code, message, body, retryAfter }
async function callApi(url,options,{admin=false}={}){
  if(typeof navigator!=="undefined" && navigator.onLine===false){
    return {ok:false,status:0,scope:"offline",code:"OFFLINE",message:"Thiết bị đang không có kết nối Internet.",body:null};
  }
  let res;
  try{
    res = admin ? await adminFetch(url,options) : await fetch(url,options);
  }catch(err){
    return {ok:false,status:0,scope:"network",code:"FETCH_FAILED",message:err?.message||"Không gửi được yêu cầu tới máy chủ.",body:null};
  }
  let body=null;
  try{ body = await res.json(); }
  catch{
    if(res.ok) return {ok:false,status:res.status,scope:"server",code:"BAD_JSON",message:"Máy chủ trả về dữ liệu không đọc được.",body:null};
  }
  if(res.ok && body?.success!==false) return {ok:true,status:res.status,scope:"",code:"",message:"",body};
  const retryAfter=Number(res.headers.get("Retry-After"))||0;
  const scope=String(body?.scope||"")||scopeFromStatus(res.status);
  let message=String(body?.message||"")||`Máy chủ trả về mã lỗi ${res.status}.`;
  if(scope==="ratelimit"&&retryAfter) message=`${message} (thử lại sau khoảng ${retryAfter} giây)`;
  return {ok:false,status:res.status,scope,code:String(body?.code||""),message,body,retryAfter};
}

// Hiện hộp thoại lỗi đã phân loại. Trả về chính `result` để nơi gọi dùng tiếp.
function reportApiFailure(result,context){
  const label=API_SCOPE_LABEL[result?.scope]||API_SCOPE_LABEL.unknown;
  const where=context?`${context}: `:"";
  return appAlertDetailed({
    title:label.title,
    message:`${where}${result?.message||"Không rõ nguyên nhân."}`,
    hint:label.hint,
    issues:result?.body?.issues
  });
}

function isAdminUnlocked(){ return _adminSessionActive === true; }
async function adminFetch(url,options){
  const res=await fetch(url,options);
  if(res.status===401){
    _adminSessionActive=false;
    exitAdminReviewMode();
    setAdminButtonsVisible(false);
    const btn=document.getElementById("adminLoginBtn"); if(btn) btn.textContent="Quản trị";
  }
  return res;
}

function setAdminButtonsVisible(visible){
  ["fillSampleBtn","importExcelBtn","exportExcelBtn","adminConfigBtn","adminSubmissionsBtn"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = visible ? "" : "none";
  });
}

function closeAllModalPanels(){
  ["passwordModal","adminConfigPanel","adminSubmissionsPanel","imagePreviewModal","deletePasswordModal","submissionReviewModal","adminCheckModal","lookupSubmissionModal","appDialog"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = "none";
  });
}

function hideOverlayIfEmpty(){
  const anyOpen = ["passwordModal","adminConfigPanel","adminSubmissionsPanel","imagePreviewModal","deletePasswordModal","submissionReviewModal","adminCheckModal","lookupSubmissionModal","appDialog"].some(id => {
    const el = document.getElementById(id);
    return el && el.style.display === "block";
  });
  if(!anyOpen) document.getElementById("modalOverlay").style.display = "none";
}

function showOnlyModal(id){
  closeAllModalPanels();
  const panel = document.getElementById(id);
  if(panel){
    panel.style.display = "block";
    document.getElementById("modalOverlay").style.display = "flex";
  }
}

function closeAllModals(){
  closeAllModalPanels();
  document.getElementById("modalOverlay").style.display = "none";
}

function openPasswordModal(){
  closeAllModalPanels();
  document.getElementById("modalOverlay").style.display = "flex";
  document.getElementById("passwordModal").style.display = "block";
  const input = document.getElementById("adminPasswordInput");
  input.value = "";
  document.getElementById("passwordModalError").style.display = "none";
  setTimeout(() => input.focus(), 50);
}

function closePasswordModal(){
  document.getElementById("passwordModal").style.display = "none";
  hideOverlayIfEmpty();
}

function showPasswordModalError(msg){
  const box = document.getElementById("passwordModalError");
  box.textContent = msg;
  box.style.display = "block";
}

async function handleAdminLoginClick(){
  if(isAdminUnlocked()){
    try{ await fetch("/api/auth/logout",{method:"POST"}); }catch(err){ console.error(err); }
    _adminSessionActive = false;
    exitAdminReviewMode();
    setAdminButtonsVisible(false);
    closeAllModalPanels();
    document.getElementById("modalOverlay").style.display = "none";
    document.getElementById("adminLoginBtn").textContent = "Quản trị";
    return;
  }
  openPasswordModal();
}

async function submitPasswordModal(){
  const input = document.getElementById("adminPasswordInput");
  const pass = input.value;
  if(!pass){ showPasswordModalError("Vui lòng nhập mật khẩu."); return; }
  const btn = document.getElementById("passwordModalConfirm");
  btn.disabled = true;
  btn.textContent = "Đang kiểm tra...";
  try{
    const result = await callApi("/api/auth", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pass})});
    if(!result.ok){
      // Phân biệt rõ "sai mật khẩu" với "không gọi được máy chủ" / "bị khoá tạm thời".
      if(result.scope==="permission") showPasswordModalError(result.message||"Mật khẩu không đúng. Vui lòng thử lại.");
      else showPasswordModalError(`${(API_SCOPE_LABEL[result.scope]||API_SCOPE_LABEL.unknown).title}: ${result.message}`);
      return;
    }
    _adminSessionActive = true;
    setAdminButtonsVisible(true);
    document.getElementById("adminLoginBtn").textContent = "Thoát quản trị";
    closePasswordModal();
  } finally {
    btn.disabled = false;
    btn.textContent = "Đăng nhập";
  }
}

function closeAdminConfigPanel(){
  document.getElementById("adminConfigPanel").style.display = "none";
  hideOverlayIfEmpty();
}

function toggleAdminConfigPanel(){
  closeAllModalPanels();
  document.getElementById("modalOverlay").style.display = "flex";
  document.getElementById("adminConfigPanel").style.display = "block";
  fillAdminConfigForm();
  loadAdminReviewers();
}

function hasActiveReviewers(){ return _adminReviewers.length>0; }

// Tên đã bị "Bỏ khỏi danh sách" (active=false) vẫn hiện để biết ai từng kiểm tra,
// nhưng phải disable: backend sẽ từ chối nếu lưu lại bằng chính tên đó.
function reviewerOptions(selected){
  const current=String(selected||"");
  const names=_adminReviewers.map(item=>item.name);
  const retired=current&&!names.includes(current);
  const head=`<option value="">Chọn người kiểm tra</option>`;
  const retiredOption=retired
    ? `<option value="${escapeHtmlAttr(current)}" selected disabled class="reviewer-option-inactive">${escapeHtml(current)} (đã bỏ khỏi danh sách)</option>`
    : "";
  const rest=names.map(name=>`<option value="${escapeHtmlAttr(name)}" ${!retired&&name===current?'selected':''}>${escapeHtml(name)}</option>`).join("");
  return head+retiredOption+rest;
}

// Khoá mọi nút lưu bản kiểm tra khi chưa có thành viên nào, kèm lời nhắc rõ ràng
// thay vì để người dùng bấm Lưu rồi nhận lỗi 400 khó hiểu.
function applyReviewerAvailabilityUI(){
  const ready=hasActiveReviewers();
  const banner=document.getElementById("reviewerMissingWarning");
  if(banner){
    banner.textContent=ready?"":"Chưa có thành viên kiểm tra hồ sơ nào. Vào Cấu hình → “Thành viên kiểm tra hồ sơ” để thêm tên trước, nếu không sẽ không lưu được bản kiểm tra.";
    banner.style.display=ready?"none":"";
  }
  document.querySelectorAll(".save-submission").forEach(button=>{
    button.disabled=!ready;
    button.title=ready?"":"Chưa có thành viên kiểm tra hồ sơ. Vào Cấu hình để thêm tên trước.";
  });
  const checkSave=document.getElementById("adminCheckSave");
  const checkHint=document.getElementById("adminCheckReviewerHint");
  if(checkSave){
    checkSave.disabled=!ready;
    checkSave.title=ready?"":"Chưa có thành viên kiểm tra hồ sơ. Vào Cấu hình để thêm tên trước.";
  }
  if(checkHint){
    checkHint.textContent=ready?"":"Chưa có thành viên nào trong danh sách. Vào Cấu hình → “Thành viên kiểm tra hồ sơ” để thêm.";
    checkHint.style.display=ready?"none":"";
  }
}
function renderReviewerConfigList(){
  const host=document.getElementById("reviewerConfigList");if(!host)return;
  host.innerHTML="";
  if(!_adminReviewers.length){host.innerHTML='<div class="hint">Chưa có thành viên. Hãy thêm tên trước khi lưu bản kiểm tra.</div>';return;}
  _adminReviewers.forEach(item=>{
    const row=document.createElement("div");row.className="reviewer-config-row";
    const name=document.createElement("span");name.textContent=item.name;
    const remove=document.createElement("button");remove.type="button";remove.className="btn btn-secondary btn-small";remove.textContent="Bỏ khỏi danh sách";
    remove.onclick=()=>removeAdminReviewer(item);
    row.append(name,remove);host.appendChild(row);
  });
}
async function loadAdminReviewers(){
  if(!isAdminUnlocked())return;
  try{
    const res=await adminFetch('/api/admin/reviewers');const result=await res.json();
    if(!res.ok||!result.success)throw new Error(result.message||'Không tải được danh sách người kiểm tra.');
    _adminReviewers=result.reviewers||[];renderReviewerConfigList();applyReviewerAvailabilityUI();
  }catch(err){console.error(err);const host=document.getElementById('reviewerConfigList');if(host)host.textContent=err.message;}
}
async function addAdminReviewer(){
  const input=document.getElementById('newReviewerName'),name=input.value.trim();if(!name)return;
  const button=document.getElementById('addReviewerBtn');button.disabled=true;
  try{
    const res=await adminFetch('/api/admin/reviewers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});const result=await res.json();
    if(!res.ok||!result.success)throw new Error(result.message||'Không thêm được thành viên.');
    input.value='';await loadAdminReviewers();
  }catch(err){await appAlert(err.message,'Không thêm được thành viên');showOnlyModal('adminConfigPanel');fillAdminConfigForm();renderReviewerConfigList();}
  finally{button.disabled=false;}
}
async function removeAdminReviewer(item){
  const confirmed=await appConfirm(`Bỏ “${item.name}” khỏi danh sách chọn? Các lịch sử kiểm tra cũ vẫn giữ nguyên tên này.`,{title:'Xác nhận',confirmText:'Bỏ khỏi danh sách'});
  showOnlyModal('adminConfigPanel');fillAdminConfigForm();renderReviewerConfigList();if(!confirmed)return;
  try{
    const res=await adminFetch(`/api/admin/reviewers/${encodeURIComponent(item.id)}`,{method:'DELETE'});const result=await res.json();
    if(!res.ok||!result.success)throw new Error(result.message||'Không xóa được thành viên.');
    await loadAdminReviewers();
  }catch(err){await appAlert(err.message,'Thao tác thất bại');showOnlyModal('adminConfigPanel');fillAdminConfigForm();renderReviewerConfigList();}
}

function fillAdminConfigForm(){
  document.getElementById("cfgLinkDeXuat").value = APP_CONFIG.linkDeXuatHoatDong || "";
  document.getElementById("cfgLinkClb").value = APP_CONFIG.linkXacNhanCLB || "";
  document.getElementById("cfgLinkNgoaiKhoa").value = APP_CONFIG.linkXacNhanNgoaiKhoa || "";
  document.getElementById("cfgLinkChung").value = APP_CONFIG.linkXacNhanChung || "";
  document.getElementById("cfgSubmissionsOpen").checked = APP_CONFIG.submissionsOpen !== false;
  const toLocalInput=v=>{ if(!v)return ""; const d=new Date(v); if(Number.isNaN(d.getTime()))return ""; const pad=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  document.getElementById("cfgSubmissionStart").value=toLocalInput(APP_CONFIG.submissionStartAt);
  document.getElementById("cfgSubmissionEnd").value=toLocalInput(APP_CONFIG.submissionEndAt);
  document.getElementById("cfgSubmissionClosedMessage").value=APP_CONFIG.submissionClosedMessage||"Hiện không trong thời gian nhận hồ sơ.";
  const yearEl=document.getElementById("cfgReportYear"); if(yearEl) yearEl.value=APP_CONFIG.reportYear||2025;
}

async function handleSaveAdminConfig(){
  if(!isAdminUnlocked()){ closeAdminConfigPanel(); await appAlert("Phiên quản trị đã kết thúc."); return; }
  const newLinks = {
    linkDeXuatHoatDong:document.getElementById("cfgLinkDeXuat").value.trim(),
    linkXacNhanCLB:document.getElementById("cfgLinkClb").value.trim(),
    linkXacNhanNgoaiKhoa:document.getElementById("cfgLinkNgoaiKhoa").value.trim(),
    linkXacNhanChung:document.getElementById("cfgLinkChung").value.trim(),
    submissionsOpen:document.getElementById("cfgSubmissionsOpen").checked,
    submissionStartAt:document.getElementById("cfgSubmissionStart").value ? new Date(document.getElementById("cfgSubmissionStart").value).toISOString() : "",
    submissionEndAt:document.getElementById("cfgSubmissionEnd").value ? new Date(document.getElementById("cfgSubmissionEnd").value).toISOString() : "",
    submissionClosedMessage:document.getElementById("cfgSubmissionClosedMessage").value.trim(),
    reportYear:Number(document.getElementById("cfgReportYear")?.value||2025)
  };
  const btn = document.getElementById("saveAdminConfigBtn");
  btn.disabled = true;
  btn.textContent = "Đang lưu...";
  try{
    const result = await callApi("/api/config", {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({config:newLinks})},{admin:true});
    if(!result.ok){ await reportApiFailure(result,"Lưu cấu hình"); return; }
    Object.assign(APP_CONFIG,newLinks);
    REPORT_YEAR=Number(APP_CONFIG.reportYear)||2025;
    closeAdminConfigPanel();
    render();
  }
  finally { btn.disabled = false; btn.textContent = "Lưu"; }
}

function renderDialogIssues(issues){
  const host = document.getElementById("appDialogDetails");
  const downloadBtn = document.getElementById("appDialogDownload");
  host.innerHTML = "";
  host.style.display = "none";
  downloadBtn.style.display = "none";
  downloadBtn.onclick = null;
  const list = Array.isArray(issues) ? issues : [];
  if(!list.length) return;

  const table = document.createElement("table");
  table.className = "dialog-issue-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Dòng","Cột","Lý do","Nội dung đang có"].forEach(label => {
    const th = document.createElement("th"); th.textContent = label; headRow.appendChild(th);
  });
  thead.appendChild(headRow); table.appendChild(thead);
  const tbody = document.createElement("tbody");
  const shown = list.slice(0,50);
  shown.forEach(issue => {
    const tr = document.createElement("tr");
    const cells = [
      {text: issue.row ? String(issue.row) : "-", cls: "issue-row"},
      {text: issue.column || "-"},
      {text: issue.reason || ""},
      {text: issue.value || "", cls: "issue-value"}
    ];
    cells.forEach(cell => {
      const td = document.createElement("td");
      if(cell.cls) td.className = cell.cls;
      td.textContent = cell.text;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  host.appendChild(table);
  if(list.length > shown.length){
    const more = document.createElement("div");
    more.className = "dialog-issue-more";
    more.textContent = `... và ${list.length - shown.length} lỗi nữa. Bấm “Tải file lỗi (.txt)” để xem đầy đủ.`;
    host.appendChild(more);
  }
  host.style.display = "";

  // Tải toàn bộ danh sách lỗi ra file text để đối chiếu với Excel cho nhanh.
  downloadBtn.style.display = "";
  downloadBtn.onclick = () => {
    const TAB = "\t", CRLF = "\r\n";
    const header = ["Dòng","Cột","Lý do","Nội dung đang có"].join(TAB);
    const body = list.map(issue => [issue.row||"",issue.column||"",issue.reason||"",issue.value||""].join(TAB)).join(CRLF);
    const blob = new Blob(["\ufeff" + header + CRLF + body], {type:"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "loi_nhap_danh_muc_hoat_dong.txt";
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
}

function openAppDialog(options){
  const opts = options || {};
  closeAllModalPanels();
  document.getElementById("appDialogTitle").textContent = opts.title || "Thông báo";
  document.getElementById("appDialogMessage").textContent = String(opts.message || "");
  const hint = document.getElementById("appDialogHint");
  hint.textContent = String(opts.hint || "");
  hint.style.display = opts.hint ? "" : "none";
  renderDialogIssues(opts.issues);
  const confirmBtn = document.getElementById("appDialogConfirm");
  const cancelBtn = document.getElementById("appDialogCancel");
  confirmBtn.textContent = opts.confirmText || "Đồng ý";
  cancelBtn.textContent = opts.cancelText || "Hủy";
  cancelBtn.style.display = opts.showCancel ? "" : "none";
  document.getElementById("appDialog").style.display = "block";
  document.getElementById("modalOverlay").style.display = "flex";
  return new Promise(resolve => { _dialogResolver = resolve; });
}

function finishAppDialog(result){
  document.getElementById("appDialog").style.display = "none";
  document.getElementById("modalOverlay").style.display = "none";
  if(_dialogResolver){ const r = _dialogResolver; _dialogResolver = null; r(result); }
}

function appAlert(message,title){ return openAppDialog({title:title || "Thông báo",message,confirmText:"Đóng"}); }
// Báo lỗi kèm gợi ý nguồn lỗi và (nếu có) bảng dòng lỗi chi tiết.
function appAlertDetailed({title,message,hint,issues}){ return openAppDialog({title:title||"Đã xảy ra lỗi",message,hint,issues,confirmText:"Đóng"}); }
function appConfirm(message,options){
  const opts = options || {};
  return openAppDialog({title:opts.title || "Xác nhận",message,confirmText:opts.confirmText || "Xác nhận",cancelText:opts.cancelText || "Hủy",showCancel:true});
}

function openImagePreview(dataUrl,title){
  if(!dataUrl) return;
  closeAllModalPanels();
  document.getElementById("imagePreviewTitle").textContent = title || "Ảnh minh chứng";
  document.getElementById("imagePreviewFull").src = dataUrl;
  document.getElementById("imagePreviewModal").style.display = "block";
  document.getElementById("modalOverlay").style.display = "flex";
}

function closeImagePreview(){
  document.getElementById("imagePreviewModal").style.display = "none";
  document.getElementById("imagePreviewFull").removeAttribute("src");
  hideOverlayIfEmpty();
}

function formatSubmissionDate(value){
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return "Không rõ";
  return new Intl.DateTimeFormat("vi-VN",{dateStyle:"short",timeStyle:"short"}).format(date);
}

function closeAdminSubmissionsPanel(){
  document.getElementById("adminSubmissionsPanel").style.display = "none";
  hideOverlayIfEmpty();
}

async function openAdminSubmissionsPanel(){
  if(!isAdminUnlocked()){ await appAlert("Phiên quản trị đã kết thúc. Vui lòng đăng nhập lại."); return; }
  closeAllModalPanels();
  document.getElementById("modalOverlay").style.display = "flex";
  document.getElementById("adminSubmissionsPanel").style.display = "block";
  await loadAdminReviewers();
  await Promise.all([loadAdminDashboard(),loadAdminSubmissions()]);
}

async function loadAdminSubmissions(){
  const status = document.getElementById("submissionListStatus");
  const list = document.getElementById("submissionList");
  status.textContent = "Đang tải dữ liệu...";
  list.innerHTML = "";
  const search = document.getElementById("submissionSearchInput").value.trim();
  const params = new URLSearchParams({page:String(_adminPage),pageSize:"10"});
  if(search) params.set("search",search);
  const statusFilter=document.getElementById("submissionStatusFilter")?.value||"";
  if(statusFilter) params.set("status",statusFilter);
  try{
    const result = await callApi(`/api/submissions?${params.toString()}`,undefined,{admin:true});
    if(!result.ok){
      const label=API_SCOPE_LABEL[result.scope]||API_SCOPE_LABEL.unknown;
      status.textContent = "";
      list.textContent = `${label.title}: ${result.message}`;
      list.className = "submission-list empty-state";
      return;
    }
    const data = result.body;
    _adminSubmissions = data.submissions || [];
    _adminPage = data.page || 1;
    _adminTotalPages = data.totalPages || 1;
    _adminTotal = data.total || 0;
    status.textContent = `${_adminTotal} hồ sơ`;
    renderAdminSubmissionList();
    updateAdminPagination();
  } catch(err){
    console.error(err);
    status.textContent = "";
    list.textContent = err.message || "Không tải được dữ liệu."; list.className = "submission-list empty-state";
  }
}

function statusOptions(current){
  return ["Chưa kiểm tra","Đã duyệt","Cần bổ sung"].map(v => `<option value="${v}" ${v===current?"selected":""}>${v}</option>`).join("");
}

function renderAdminSubmissionList(){
  const list = document.getElementById("submissionList");
  list.innerHTML = "";
  if(!_adminSubmissions.length){ list.innerHTML = '<div class="empty-state">Không có hồ sơ phù hợp.</div>'; return; }
  _adminSubmissions.forEach(item => {
    const row = document.createElement("div");
    row.className = "submission-row";
    row.innerHTML = `
      <div><div class="submission-name"></div></div>
      <div class="submission-mssv"></div>
      <div class="submission-class"></div>
      <div><select class="submission-status">${statusOptions(item.status || "Chưa kiểm tra")}</select></div>
      <div><select class="submission-reviewer">${reviewerOptions(item.reviewer || "")}</select></div>
      <div><textarea class="submission-note" rows="2" maxlength="2000" placeholder="Ghi chú cho hồ sơ"></textarea></div>
      <div class="submission-date"></div>
      <div class="submission-actions">
        <button type="button" class="btn btn-secondary btn-small save-submission">Lưu</button>
        <button type="button" class="btn btn-secondary btn-small view-submission">Xem</button>
        <button type="button" class="btn btn-danger btn-small delete-submission">Xóa</button>
      </div>`;
    row.querySelector(".submission-name").textContent = item.fullName || "Chưa có họ tên";
    row.querySelector(".submission-mssv").textContent = item.mssv || "";
    row.querySelector(".submission-class").textContent = item.className || "";
    row.querySelector(".submission-note").value = item.note || "";
    row.querySelector(".submission-date").textContent = formatSubmissionDate(item.updatedAt || item.createdAt);
    row.querySelector(".save-submission").onclick = () => updateSubmissionReview(item,row);
    row.querySelector(".view-submission").onclick = () => reviewSubmission(item);
    row.querySelector(".delete-submission").onclick = () => openDeletePasswordModal(item);
    list.appendChild(row);
  });
  applyReviewerAvailabilityUI();
}

function updateAdminPagination(){
  document.getElementById("submissionPageInfo").textContent = `Trang ${_adminPage}/${_adminTotalPages}`;
  document.getElementById("submissionPrevPage").disabled = _adminPage <= 1;
  document.getElementById("submissionNextPage").disabled = _adminPage >= _adminTotalPages;
}

async function updateSubmissionReview(item,row){
  const button = row.querySelector(".save-submission");
  const reviewer = row.querySelector(".submission-reviewer").value;
  if(!reviewer){
    await appAlertDetailed({
      title:"Chưa chọn người kiểm tra",
      message: hasActiveReviewers()
        ? "Hãy chọn tên người kiểm tra ở cột “Người kiểm tra” của dòng này trước khi lưu."
        : "Danh sách thành viên kiểm tra đang trống nên không thể lưu bản kiểm tra.",
      hint: hasActiveReviewers()
        ? "Mỗi bản kiểm tra phải gắn với một thành viên trong danh sách chuẩn để tên không bị viết tắt/viết hoa khác nhau."
        : "Vào Cấu hình → “Thành viên kiểm tra hồ sơ”, thêm tên các thành viên trong Ban, rồi quay lại đây."
    });
    await openAdminSubmissionsPanel();
    return;
  }
  button.disabled = true;
  button.textContent = "Đang lưu...";
  const result = await callApi(`/api/submissions/${encodeURIComponent(item.id)}`,{
    method:"PATCH",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({status:row.querySelector(".submission-status").value,reviewer,note:row.querySelector(".submission-note").value,submissionUpdatedAt:item.updatedAt})
  },{admin:true});
  if(!result.ok){
    button.disabled = false; button.textContent = "Lưu";
    await reportApiFailure(result,"Lưu bản kiểm tra");
    await openAdminSubmissionsPanel();
    return;
  }
  const saved = result.body.submission;
  Object.assign(item,{status:saved.status,note:saved.note,reviewer:saved.reviewer,checkedAt:saved.checkedAt});
  button.textContent = "Đã lưu";
  setTimeout(() => { button.textContent = "Lưu"; button.disabled = false; },800);
}

async function reviewSubmission(item){
  const loaded = await callApi(`/api/submissions/${encodeURIComponent(item.id)}`,{},{admin:true});
  if(!loaded.ok){ await reportApiFailure(loaded,"Mở hồ sơ"); return; }
  const result = loaded.body;
  try{
    const full = result.submission;
    closeAdminSubmissionsPanel();
    captureAdminFormSnapshot();
    restoreStateDataOnly(full.data);
    if(full.evidenceImages && typeof full.evidenceImages === "object"){
      state.evidenceImages = {};
      Object.entries(full.evidenceImages).forEach(([key,img]) => {
        state.evidenceImages[key] = {name:img.name || "Ảnh minh chứng",dataUrl:img.url || img.dataUrl || "",path:img.path || "",contentType:img.contentType || ""};
      });
    }
    state.step = 0;
    window._adminReviewSubmission = full;
    window._adminReviewFlags = full.review?.flags || {};
    document.body.classList.add("admin-review-mode");
    renderAdminReviewBanner();
    render();
    if(result.storageAvailable===false) await appAlert('Kho ảnh đang tạm thời gián đoạn. Bạn vẫn có thể xem nội dung hồ sơ, nhưng cần tải lại sau trước khi đối chiếu ảnh minh chứng.','Chưa tải được ảnh');
  } catch(err){ if(_adminFormSnapshot)exitAdminReviewMode();await appAlert(err.message,"Không mở được hồ sơ"); }
}

function renderAdminReviewBanner(){
  let banner = document.getElementById("adminReviewBanner");
  if(!window._adminReviewSubmission){ if(banner) banner.remove(); return; }
  if(!banner){
    banner = document.createElement("div");
    banner.id = "adminReviewBanner";
    banner.className = "admin-review-banner no-print";
    document.querySelector("header.app-header").insertAdjacentElement("afterend",banner);
  }
  const item = window._adminReviewSubmission;
  banner.innerHTML = `<div><strong>Đang xem hồ sơ đã gửi (chỉ đọc)</strong><span></span></div><div class="banner-actions"><button type="button" class="btn btn-primary btn-small open-admin-check">Mở bảng kiểm</button><button type="button" class="btn btn-secondary btn-small back-admin-list">Quay lại danh sách</button></div>`;
  banner.querySelector("span").textContent = `${item.fullName || ""} | ${item.mssv || ""} | ${item.status || "Chưa kiểm tra"} | ${formatSubmissionDate(item.updatedAt || item.createdAt)}`;
  banner.querySelector(".open-admin-check").onclick = openAdminCheckModal;
  banner.querySelector(".back-admin-list").onclick = async () => {
    exitAdminReviewMode();
    await openAdminSubmissionsPanel();
  };
}

function buildAdminCheckTargets(){
  const sections=[];
  const groupSources=[
    {title:'Đạo đức - nội dung báo cáo',section:'daoDuc',defs:GROUPS.daoDuc.list,states:state.daoDuc.groups},
    {title:'Học tập - nội dung báo cáo',section:'hocTap',defs:GROUPS.hocTap.list,states:state.hocTap.groups},
    {title:'Thể lực - nội dung báo cáo',section:'theLuc',defs:GROUPS.theLuc.list,states:state.theLuc.groups},
    {title:'Hội nhập - nội dung báo cáo',section:'hoiNhap',defs:[...HOINHAP_FIXED,...GROUPS.hoiNhap.list],states:{...(state.hoiNhap.fixed||{}),...(state.hoiNhap.groups||{})}}
  ];
  groupSources.forEach(source=>{
    const items=[];
    source.defs.forEach(def=>{
      const gs=source.states?.[def.id]; if(!gs) return;
      if(gs.yes===false||gs.notMet===true){items.push({key:`locked:${source.section}:${def.id}`,label:`Không đạt — ${def.label}`,disabled:true});return;}
      if(gs.yes!==true) return;
      if(def.type==='sheet'||def.type==='manualList') (gs.items||[]).forEach(it=>items.push({key:`evidence:${source.section}::${def.id}:${it.id||it.name}`,label:it.name}));
      else items.push({key:`evidence:${source.section}::${def.id}`,label:gs.detail||def.label});
    });
    if(items.length) sections.push({title:source.title,items});
  });
  EVIDENCE_CARDS.forEach(card=>{
    const items=card.getItems();
    if(!items.length) return;
    sections.push({title:card.title,items:items.map(it=>({key:`evidence:${card.key}::${it.key}`,label:`Minh chứng: ${it.label}`}))});
  });
  return sections;
}

function openAdminCheckModal(){
  const submission=window._adminReviewSubmission;
  if(!submission) return;
  const saved=submission.review?.flags||{};
  const host=document.getElementById('adminCheckTargets'); host.innerHTML='';
  buildAdminCheckTargets().forEach(section=>{
    const box=document.createElement('section'); box.className='admin-check-section';
    const title=document.createElement('h4'); title.textContent=section.title; box.appendChild(title);
    section.items.forEach(item=>{
      const label=document.createElement('label'); label.className='admin-check-item';
      const input=document.createElement('input'); input.type='checkbox'; input.dataset.reviewKey=item.key; input.checked=Boolean(saved[item.key]); input.disabled=item.disabled===true;
      if(!input.disabled) input.onchange=()=>document.querySelectorAll('#adminCheckTargets input[data-review-key]').forEach(other=>{if(other!==input&&other.dataset.reviewKey===input.dataset.reviewKey)other.checked=input.checked;});
      const text=document.createElement('span'); text.textContent=item.label;
      label.append(input,text); box.appendChild(label);
    }); host.appendChild(box);
  });
  if(!host.children.length) host.innerHTML='<div class="empty-state">Hồ sơ không có hoạt động cần đối chiếu minh chứng.</div>';
  document.getElementById('adminCheckStatus').value=submission.review?.status||submission.status||'Chưa kiểm tra';
  document.getElementById('adminCheckReviewer').innerHTML=reviewerOptions(submission.review?.reviewer||submission.reviewer||'');
  document.getElementById('adminCheckNote').value=submission.review?.note||submission.note||'';
  document.getElementById('adminCheckMessage').textContent='';
  applyReviewerAvailabilityUI();
  showOnlyModal('adminCheckModal');
}

async function saveAdminCheck(){
  const submission=window._adminReviewSubmission; if(!submission) return;
  const flags={}; document.querySelectorAll('#adminCheckTargets input[data-review-key]:checked').forEach(el=>flags[el.dataset.reviewKey]=el.closest('label')?.querySelector('span')?.textContent||el.dataset.reviewKey);
  let status=document.getElementById('adminCheckStatus').value;
  if(Object.keys(flags).length && status==='Đã duyệt') status='Cần bổ sung';
  const reviewer=document.getElementById('adminCheckReviewer').value;
  const message=document.getElementById('adminCheckMessage');
  if(!reviewer){
    message.className='err-msg';
    message.textContent=hasActiveReviewers()
      ? 'Hãy chọn tên người kiểm tra ở ô “Người kiểm tra” trước khi lưu.'
      : 'Danh sách thành viên kiểm tra đang trống. Vào Cấu hình → “Thành viên kiểm tra hồ sơ” để thêm tên trước.';
    return;
  }
  const btn=document.getElementById('adminCheckSave'); btn.disabled=true; btn.textContent='Đang lưu...';
  try{
    const result=await callApi(`/api/submissions/${encodeURIComponent(submission.id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,reviewer,note:document.getElementById('adminCheckNote').value,flags,submissionUpdatedAt:submission.updatedAt})},{admin:true});
    if(!result.ok){
      const label=API_SCOPE_LABEL[result.scope]||API_SCOPE_LABEL.unknown;
      message.className='err-msg';
      message.textContent=`${label.title}: ${result.message}`;
      if(result.scope==='conflict') setTimeout(async()=>{closeAllModals();exitAdminReviewMode();await openAdminSubmissionsPanel();},1200);
      return;
    }
    const saved=result.body.submission;
    submission.review={...(submission.review||{}),...saved}; submission.status=saved.status; submission.note=saved.note;
    window._adminReviewFlags=flags; closeAllModals(); renderAdminReviewBanner(); render();
    await appAlert('Đã lưu bản kiểm tra riêng. Hồ sơ gốc của sinh viên không bị thay đổi.','Đã lưu');
  }
  finally{btn.disabled=false;btn.textContent='Lưu bản kiểm tra';}
}

function openDeletePasswordModal(item){
  _pendingDeleteSubmission = item;
  closeAllModalPanels();
  const input = document.getElementById("deletePasswordInput");
  input.value = "";
  document.getElementById("deletePasswordError").style.display = "none";
  document.getElementById("deletePasswordModal").style.display = "block";
  document.getElementById("modalOverlay").style.display = "flex";
  setTimeout(() => input.focus(),50);
}

function closeDeletePasswordModal(){
  _pendingDeleteSubmission = null;
  document.getElementById("deletePasswordModal").style.display = "none";
  hideOverlayIfEmpty();
}

async function confirmDeleteSubmission(){
  if(!_pendingDeleteSubmission) return;
  const password = document.getElementById("deletePasswordInput").value;
  const errBox = document.getElementById("deletePasswordError");
  if(!password){ errBox.textContent = "Vui lòng nhập mật khẩu."; errBox.style.display = "block"; return; }
  const button = document.getElementById("deletePasswordConfirm");
  button.disabled = true;
  button.textContent = "Đang xóa...";
  try{
    const result = await callApi(`/api/submissions/${encodeURIComponent(_pendingDeleteSubmission.id)}`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})},{admin:true});
    if(!result.ok){
      const label=API_SCOPE_LABEL[result.scope]||API_SCOPE_LABEL.unknown;
      errBox.textContent = result.scope==="permission" ? result.message : `${label.title}: ${result.message}`;
      errBox.style.display = "block";
      return;
    }
    closeDeletePasswordModal();
    if(_adminSubmissions.length === 1 && _adminPage > 1) _adminPage--;
    await openAdminSubmissionsPanel();
  }
  finally { button.disabled = false; button.textContent = "Xóa hồ sơ"; }
}

async function loadAdminDashboard(){
  try{const res=await adminFetch('/api/admin/dashboard');const r=await res.json();if(!res.ok||!r.success)return;
    document.getElementById('dashTotal').textContent=r.summary.total;document.getElementById('dashUnchecked').textContent=r.summary.unchecked;document.getElementById('dashNeedMore').textContent=r.summary.needMore;document.getElementById('dashApproved').textContent=r.summary.approved;
  }catch(err){console.error(err);}
}
async function exportReviewExcel(){
  try{const res=await adminFetch('/api/submissions-export');const r=await res.json();if(!res.ok||!r.success)throw new Error(r.message||'Không xuất được dữ liệu.');
    if(typeof XLSX==='undefined') throw new Error('Không tải được thư viện Excel.');
    const rows=(r.submissions||[]).map(x=>({'Họ và tên':x.fullName,'MSSV':x.mssv,'Lớp':x.className,'GPA':x.gpa,'Số ngày tình nguyện':x.volunteerDays,'Chi tiết ngày tình nguyện':x.volunteerDetail||'','Trạng thái':x.status,'Người kiểm tra':x.reviewer||'','Nội dung bị đánh dấu':x.reviewIssues||'','Ghi chú của Ban':x.note,'Thời điểm Ban kiểm tra':x.checkedAt?new Date(x.checkedAt).toLocaleString('vi-VN'):'','Cập nhật hồ sơ':new Date(x.updatedAt).toLocaleString('vi-VN')}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Danh sách xét duyệt');XLSX.writeFile(wb,'danh_sach_xet_duyet_sv5t.xlsx');
  }catch(err){await appAlert(err.message,'Xuất Excel thất bại');}
}
function closeLookupModal(){document.getElementById('lookupSubmissionModal').style.display='none';hideOverlayIfEmpty();}
async function lookupSubmission(){
  const mssv=document.getElementById('lookupMssv').value.trim(),box=document.getElementById('lookupResult');
  if(!mssv){box.textContent='Vui lòng nhập MSSV.';box.className='err-msg';return;}
  box.textContent='Đang tra cứu...'; box.className='';
  const q=new URLSearchParams({mssv});
  const result=await callApi('/api/submission-status?'+q);
  if(!result.ok){
    const label=API_SCOPE_LABEL[result.scope]||API_SCOPE_LABEL.unknown;
    box.textContent=result.scope==='notfound'?result.message:`${label.title}: ${result.message}`;
    box.className='err-msg';
    return;
  }
  const r=result.body;
  box.innerHTML='';const div=document.createElement('div');div.className='lookup-status-box';const st=document.createElement('strong');st.textContent='Trạng thái: '+r.status;const time=document.createElement('div');time.textContent='Cập nhật: '+new Date(r.updatedAt).toLocaleString('vi-VN');div.append(st,time);box.appendChild(div);
}
async function refreshAdminSession(){
  try{
    const res=await fetch("/api/auth/session"); const r=await res.json();
    _adminSessionActive=Boolean(res.ok&&r.authenticated);
  }catch(err){_adminSessionActive=false;}
  setAdminButtonsVisible(_adminSessionActive);
  const btn=document.getElementById("adminLoginBtn"); if(btn) btn.textContent=_adminSessionActive?"Thoát quản trị":"Quản trị";
}

function initAdminUI(){
  setAdminButtonsVisible(false);
  refreshAdminSession();
  document.getElementById("adminLoginBtn").onclick = handleAdminLoginClick;
  document.getElementById("adminConfigBtn").onclick = toggleAdminConfigPanel;
  document.getElementById("saveAdminConfigBtn").onclick = handleSaveAdminConfig;
  document.getElementById("addReviewerBtn").onclick = addAdminReviewer;
  document.getElementById("newReviewerName").addEventListener("keydown",e=>{if(e.key==='Enter'){e.preventDefault();addAdminReviewer();}});
  document.getElementById("closeAdminConfigBtn").onclick = closeAdminConfigPanel;
  document.getElementById("passwordModalConfirm").onclick = submitPasswordModal;
  document.getElementById("passwordModalCancel").onclick = closePasswordModal;
  document.getElementById("adminPasswordInput").addEventListener("keydown",e => { if(e.key === "Enter") submitPasswordModal(); });
  document.getElementById("adminSubmissionsBtn").onclick = () => { _adminPage = 1; openAdminSubmissionsPanel(); };
  document.getElementById("closeAdminSubmissionsBtn").onclick = closeAdminSubmissionsPanel;
  document.getElementById("refreshSubmissionsBtn").onclick = loadAdminSubmissions;
  document.getElementById("submissionSearchInput").addEventListener("input",() => {
    clearTimeout(_adminSearchTimer);
    _adminSearchTimer = setTimeout(() => { _adminPage = 1; loadAdminSubmissions(); },300);
  });
  document.getElementById("submissionStatusFilter").addEventListener("change",()=>{_adminPage=1;loadAdminSubmissions();});
  document.getElementById("exportReviewExcelBtn").onclick=exportReviewExcel;
  document.getElementById("lookupSubmissionBtn").onclick=()=>showOnlyModal("lookupSubmissionModal");
  document.getElementById("lookupCancel").onclick=closeLookupModal;
  document.getElementById("lookupConfirm").onclick=lookupSubmission;
  document.getElementById("submissionPrevPage").onclick = () => { if(_adminPage > 1){ _adminPage--; loadAdminSubmissions(); } };
  document.getElementById("submissionNextPage").onclick = () => { if(_adminPage < _adminTotalPages){ _adminPage++; loadAdminSubmissions(); } };
  document.getElementById("closeImagePreviewBtn").onclick = closeImagePreview;
  document.getElementById("appDialogConfirm").onclick = () => finishAppDialog(true);
  document.getElementById("appDialogCancel").onclick = () => finishAppDialog(false);
  document.getElementById("deletePasswordCancel").onclick = closeDeletePasswordModal;
  document.getElementById("deletePasswordConfirm").onclick = confirmDeleteSubmission;
  document.getElementById("deletePasswordInput").addEventListener("keydown",e => { if(e.key === "Enter") confirmDeleteSubmission(); });
  document.getElementById('adminCheckCancel').onclick=()=>{document.getElementById('adminCheckModal').style.display='none';hideOverlayIfEmpty();};
  document.getElementById('adminCheckSave').onclick=saveAdminCheck;
  window.alert = message => { appAlert(message); };
  document.getElementById("modalOverlay").addEventListener("click",e => {
    if(e.target !== e.currentTarget) return;
    closeAllModalPanels();
    e.currentTarget.style.display = "none";
    if(_dialogResolver){ const r = _dialogResolver; _dialogResolver = null; r(false); }
  });
}
