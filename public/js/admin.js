/* =========================================================
   QUẢN TRỊ
   ========================================================= */
let _adminPasswordMemory = null;
let _dialogResolver = null;
let _adminSubmissions = [];
let _adminPage = 1;
let _adminTotalPages = 1;
let _adminTotal = 0;
let _adminSearchTimer = null;
let _pendingDeleteSubmission = null;

function isAdminUnlocked(){ return _adminPasswordMemory !== null; }

function setAdminButtonsVisible(visible){
  ["fillSampleBtn","importExcelBtn","exportExcelBtn","adminConfigBtn","adminSubmissionsBtn"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = visible ? "" : "none";
  });
}

function closeAllModalPanels(){
  ["passwordModal","adminConfigPanel","adminSubmissionsPanel","imagePreviewModal","deletePasswordModal","submissionReviewModal","lookupSubmissionModal","appDialog"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = "none";
  });
}

function hideOverlayIfEmpty(){
  const anyOpen = ["passwordModal","adminConfigPanel","adminSubmissionsPanel","imagePreviewModal","deletePasswordModal","submissionReviewModal","lookupSubmissionModal","appDialog"].some(id => {
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
    _adminPasswordMemory = null;
    window._adminReviewSubmission = null;
    document.body.classList.remove("admin-review-mode");
    renderAdminReviewBanner();
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
    const res = await fetch("/api/auth", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pass})});
    const result = await res.json();
    if(!res.ok || !result.success){ showPasswordModalError("Mật khẩu không đúng. Vui lòng thử lại."); return; }
    _adminPasswordMemory = pass;
    setAdminButtonsVisible(true);
    document.getElementById("adminLoginBtn").textContent = "Thoát quản trị";
    closePasswordModal();
  } catch(err){
    console.error(err);
    showPasswordModalError("Không thể kết nối máy chủ. Vui lòng thử lại.");
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
}

function fillAdminConfigForm(){
  document.getElementById("cfgLinkDeXuat").value = APP_CONFIG.linkDeXuatHoatDong || "";
  document.getElementById("cfgLinkClb").value = APP_CONFIG.linkXacNhanCLB || "";
  document.getElementById("cfgLinkNgoaiKhoa").value = APP_CONFIG.linkXacNhanNgoaiKhoa || "";
  document.getElementById("cfgLinkChung").value = APP_CONFIG.linkXacNhanChung || "";
  document.getElementById("cfgSubmissionsOpen").checked = APP_CONFIG.submissionsOpen !== false;
  const toLocal=v=>v?new Date(v).toISOString().slice(0,16):"";
  document.getElementById("cfgSubmissionStart").value=toLocal(APP_CONFIG.submissionStartAt);
  document.getElementById("cfgSubmissionEnd").value=toLocal(APP_CONFIG.submissionEndAt);
  document.getElementById("cfgSubmissionClosedMessage").value=APP_CONFIG.submissionClosedMessage||"Hiện không trong thời gian nhận hồ sơ.";
}

async function handleSaveAdminConfig(){
  if(!isAdminUnlocked()){ closeAdminConfigPanel(); await appAlert("Phiên quản trị đã kết thúc."); return; }
  const newLinks = {
    linkDeXuatHoatDong:document.getElementById("cfgLinkDeXuat").value.trim(),
    linkXacNhanCLB:document.getElementById("cfgLinkClb").value.trim(),
    linkXacNhanNgoaiKhoa:document.getElementById("cfgLinkNgoaiKhoa").value.trim(),
    linkXacNhanChung:document.getElementById("cfgLinkChung").value.trim(),
    submissionsOpen:document.getElementById("cfgSubmissionsOpen").checked,
    submissionStartAt:document.getElementById("cfgSubmissionStart").value||"",
    submissionEndAt:document.getElementById("cfgSubmissionEnd").value||"",
    submissionClosedMessage:document.getElementById("cfgSubmissionClosedMessage").value.trim()
  };
  const btn = document.getElementById("saveAdminConfigBtn");
  btn.disabled = true;
  btn.textContent = "Đang lưu...";
  try{
    const res = await fetch("/api/config", {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:_adminPasswordMemory,config:newLinks})});
    const result = await res.json();
    if(!res.ok || !result.success) throw new Error(result.message || "Không thể lưu thay đổi.");
    Object.assign(APP_CONFIG,newLinks);
    closeAdminConfigPanel();
    render();
  } catch(err){ await appAlert(err.message,"Lưu thất bại"); }
  finally { btn.disabled = false; btn.textContent = "Lưu"; }
}

function openAppDialog(options){
  const opts = options || {};
  closeAllModalPanels();
  document.getElementById("appDialogTitle").textContent = opts.title || "Thông báo";
  document.getElementById("appDialogMessage").textContent = String(opts.message || "");
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
  try{
    const res = await fetch(`/api/submissions?${params.toString()}`,{headers:{"X-Admin-Password":_adminPasswordMemory}});
    const result = await res.json();
    if(!res.ok || !result.success) throw new Error(result.message || "Không tải được danh sách hồ sơ.");
    _adminSubmissions = result.submissions || [];
    _adminPage = result.page || 1;
    _adminTotalPages = result.totalPages || 1;
    _adminTotal = result.total || 0;
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
}

function updateAdminPagination(){
  document.getElementById("submissionPageInfo").textContent = `Trang ${_adminPage}/${_adminTotalPages}`;
  document.getElementById("submissionPrevPage").disabled = _adminPage <= 1;
  document.getElementById("submissionNextPage").disabled = _adminPage >= _adminTotalPages;
}

async function updateSubmissionReview(item,row){
  const button = row.querySelector(".save-submission");
  button.disabled = true;
  button.textContent = "Đang lưu...";
  try{
    const res = await fetch(`/api/submissions/${encodeURIComponent(item.id)}`,{
      method:"PATCH",
      headers:{"Content-Type":"application/json","X-Admin-Password":_adminPasswordMemory},
      body:JSON.stringify({status:row.querySelector(".submission-status").value,note:row.querySelector(".submission-note").value})
    });
    const result = await res.json();
    if(!res.ok || !result.success) throw new Error(result.message || "Không cập nhật được hồ sơ.");
    Object.assign(item,result.submission);
    button.textContent = "Đã lưu";
    setTimeout(() => { button.textContent = "Lưu"; button.disabled = false; },800);
  } catch(err){ button.disabled = false; button.textContent = "Lưu"; await appAlert(err.message,"Cập nhật thất bại"); }
}

async function reviewSubmission(item){
  try{
    const res = await fetch(`/api/submissions/${encodeURIComponent(item.id)}`,{headers:{"X-Admin-Password":_adminPasswordMemory}});
    const result = await res.json();
    if(!res.ok || !result.success) throw new Error(result.message || "Không tải được chi tiết hồ sơ.");
    const full = result.submission;
    closeAdminSubmissionsPanel();
    restoreStateFromDraft(full.data);
    if(full.evidenceImages && typeof full.evidenceImages === "object"){
      state.evidenceImages = {};
      Object.entries(full.evidenceImages).forEach(([key,img]) => {
        state.evidenceImages[key] = {name:img.name || "Ảnh minh chứng",dataUrl:img.url || img.dataUrl || "",path:img.path || "",contentType:img.contentType || ""};
      });
    }
    state.step = 0;
    window._adminReviewSubmission = full;
    document.body.classList.add("admin-review-mode");
    renderAdminReviewBanner();
    render();
  } catch(err){ await appAlert(err.message,"Không mở được hồ sơ"); }
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
  banner.innerHTML = `<div><strong>Đang xem hồ sơ đã gửi</strong><span></span></div><button type="button" class="btn btn-secondary btn-small">Quay lại danh sách</button>`;
  banner.querySelector("span").textContent = `${item.fullName || ""} | ${item.mssv || ""} | ${item.status || "Chưa kiểm tra"} | ${formatSubmissionDate(item.updatedAt || item.createdAt)}`;
  banner.querySelector("button").onclick = async () => {
    window._adminReviewSubmission = null;
    document.body.classList.remove("admin-review-mode");
    renderAdminReviewBanner();
    await openAdminSubmissionsPanel();
  };
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
    const res = await fetch(`/api/submissions/${encodeURIComponent(_pendingDeleteSubmission.id)}`,{method:"DELETE",headers:{"X-Admin-Password":password}});
    const result = await res.json();
    if(!res.ok || !result.success) throw new Error(result.message || "Không xóa được hồ sơ.");
    closeDeletePasswordModal();
    if(_adminSubmissions.length === 1 && _adminPage > 1) _adminPage--;
    await openAdminSubmissionsPanel();
  } catch(err){ errBox.textContent = err.message || "Xóa hồ sơ thất bại."; errBox.style.display = "block"; }
  finally { button.disabled = false; button.textContent = "Xóa hồ sơ"; }
}

async function loadAdminDashboard(){
  try{const res=await fetch('/api/admin/dashboard',{headers:{'X-Admin-Password':_adminPasswordMemory}});const r=await res.json();if(!res.ok||!r.success)return;
    document.getElementById('dashTotal').textContent=r.summary.total;document.getElementById('dashUnchecked').textContent=r.summary.unchecked;document.getElementById('dashNeedMore').textContent=r.summary.needMore;document.getElementById('dashApproved').textContent=r.summary.approved;
  }catch(err){console.error(err);}
}
async function exportReviewExcel(){
  try{const res=await fetch('/api/submissions-export',{headers:{'X-Admin-Password':_adminPasswordMemory}});const r=await res.json();if(!res.ok||!r.success)throw new Error(r.message||'Không xuất được dữ liệu.');
    if(typeof XLSX==='undefined') throw new Error('Không tải được thư viện Excel.');
    const rows=(r.submissions||[]).map(x=>({'Họ và tên':x.fullName,'MSSV':x.mssv,'Lớp':x.className,'GPA':x.gpa,'Ngày tình nguyện':x.volunteerDays,'Trạng thái':x.status,'Ghi chú':x.note,'Cập nhật':new Date(x.updatedAt).toLocaleString('vi-VN')}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Danh sách xét duyệt');XLSX.writeFile(wb,'danh_sach_xet_duyet_sv5t.xlsx');
  }catch(err){await appAlert(err.message,'Xuất Excel thất bại');}
}
function closeLookupModal(){document.getElementById('lookupSubmissionModal').style.display='none';hideOverlayIfEmpty();}
async function lookupSubmission(){
  const mssv=document.getElementById('lookupMssv').value.trim(),phone=document.getElementById('lookupPhone').value.trim(),box=document.getElementById('lookupResult');
  box.textContent='Đang tra cứu...';
  try{const q=new URLSearchParams({mssv,phone});const res=await fetch('/api/submission-status?'+q);const r=await res.json();if(!res.ok||!r.success)throw new Error(r.message||'Không tìm thấy hồ sơ.');
    box.innerHTML='';const div=document.createElement('div');div.className='lookup-status-box';const st=document.createElement('strong');st.textContent='Trạng thái: '+r.status;const note=document.createElement('div');note.textContent='Ghi chú: '+(r.note||'Chưa có ghi chú.');const time=document.createElement('div');time.textContent='Cập nhật: '+new Date(r.updatedAt).toLocaleString('vi-VN');div.append(st,note,time);box.appendChild(div);
  }catch(err){box.textContent=err.message;box.className='err-msg';}
}
function initAdminUI(){
  setAdminButtonsVisible(isAdminUnlocked());
  document.getElementById("adminLoginBtn").onclick = handleAdminLoginClick;
  document.getElementById("adminConfigBtn").onclick = toggleAdminConfigPanel;
  document.getElementById("saveAdminConfigBtn").onclick = handleSaveAdminConfig;
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
  window.alert = message => { appAlert(message); };
  document.getElementById("modalOverlay").addEventListener("click",e => {
    if(e.target !== e.currentTarget) return;
    closeAllModalPanels();
    e.currentTarget.style.display = "none";
    if(_dialogResolver){ const r = _dialogResolver; _dialogResolver = null; r(false); }
  });
}
