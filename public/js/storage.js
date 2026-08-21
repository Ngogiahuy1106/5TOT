/* =========================================================
   LƯU NHÁP + GỬI HỒ SƠ
   ========================================================= */
const LOCAL_STORAGE_KEY = "sv5tot_draft_v1";
const SUBMISSION_META_KEY = "sv5tot_submission_meta_v1";
const DRAFT_IMAGE_DB_NAME = "sv5tot_draft_images_v1";
const DRAFT_IMAGE_STORE = "images";
const MAX_EVIDENCE_IMAGE_BYTES = 8*1024*1024;
const MAX_TOTAL_EVIDENCE_BYTES = 16*1024*1024;
const _persistedDraftImageVersions = new Map();
let _hasUnsavedChanges = false;
let _lastAutoSaveAt = null;
let _lastAutoSaveError = "";

function openDraftImageDb(){
  return new Promise((resolve,reject) => {
    const request=indexedDB.open(DRAFT_IMAGE_DB_NAME,1);
    request.onupgradeneeded=() => {
      const db=request.result;
      if(!db.objectStoreNames.contains(DRAFT_IMAGE_STORE)) db.createObjectStore(DRAFT_IMAGE_STORE,{keyPath:"key"});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error || new Error("Không mở được IndexedDB."));
  });
}

async function putDraftImage(record){
  const db=await openDraftImageDb();
  try{
    await new Promise((resolve,reject) => {
      const tx=db.transaction(DRAFT_IMAGE_STORE,"readwrite");
      tx.objectStore(DRAFT_IMAGE_STORE).put(record);
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error || new Error("Không lưu được ảnh vào IndexedDB."));
      tx.onabort=()=>reject(tx.error || new Error("Giao dịch lưu ảnh bị hủy."));
    });
  } finally { db.close(); }
}

async function getAllDraftImages(){
  const db=await openDraftImageDb();
  try{
    return await new Promise((resolve,reject) => {
      const tx=db.transaction(DRAFT_IMAGE_STORE,"readonly");
      const req=tx.objectStore(DRAFT_IMAGE_STORE).getAll();
      req.onsuccess=()=>resolve(req.result || []);
      req.onerror=()=>reject(req.error || new Error("Không đọc được ảnh bản nháp."));
    });
  } finally { db.close(); }
}

async function deleteDraftImage(key){
  const db=await openDraftImageDb();
  try{
    await new Promise((resolve,reject) => {
      const tx=db.transaction(DRAFT_IMAGE_STORE,"readwrite");
      tx.objectStore(DRAFT_IMAGE_STORE).delete(key);
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error || new Error("Không xóa được ảnh bản nháp."));
    });
  } finally { db.close(); }
}

async function clearDraftImages(){
  const db=await openDraftImageDb();
  try{
    await new Promise((resolve,reject) => {
      const tx=db.transaction(DRAFT_IMAGE_STORE,"readwrite");
      tx.objectStore(DRAFT_IMAGE_STORE).clear();
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error || new Error("Không xóa được ảnh bản nháp."));
    });
    _persistedDraftImageVersions.clear();
  } finally { db.close(); }
}

function dataUrlToBlob(dataUrl){
  const [header,payload]=String(dataUrl||"").split(",");
  if(!header || payload===undefined) throw new Error("Dữ liệu ảnh không hợp lệ.");
  const mime=(header.match(/data:([^;]+)/)||[])[1] || "application/octet-stream";
  const binary=atob(payload);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:mime});
}

function blobToDataUrl(blob){
  return new Promise((resolve,reject) => {
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(reader.error || new Error("Không đọc được ảnh bản nháp."));
    reader.readAsDataURL(blob);
  });
}

function serializeStateForStorage(options){
  const includeImageData = options?.includeImageData === true;
  const cloned = JSON.parse(JSON.stringify(state, (key, value) => (key === "file" || key === "blob") ? undefined : value));
  cloned.personal = cloned.personal || {};
  cloned.personal.khoaTruong = "Điện - Điện tử";
  // Xóa khóa tiêu chí Hội nhập cũ để bản nháp/hồ sơ không bị backend tính thêm một mục "ma".
  if(cloned.hoiNhap?.fixed) delete cloned.hoiNhap.fixed["HN-F"];
  const metadata={};
  Object.entries(state.evidenceImages||{}).forEach(([key,img]) => {
    if(!img) return;
    metadata[key]={name:img.name||"anh.jpg",contentType:img.contentType||"",size:Number(img.size)||0,localKey:key,localVersion:String(img.localVersion||"")};
    if(includeImageData && img.dataUrl) metadata[key].dataUrl=img.dataUrl;
  });
  cloned.evidenceImages=metadata;
  return cloned;
}

function getStateFingerprint(){
  const data = serializeStateForStorage({includeImageData:false});
  delete data.step;
  delete data.evidenceExpanded;
  return JSON.stringify(data);
}

function markStateDirty(event){
  if(window._adminReviewSubmission) return;
  if(event && event.target && !event.target.closest("#stepContent")) return;
  _hasUnsavedChanges = true;
  updateAutoSaveIndicator("pending");
}

function markStateSaved(){ _hasUnsavedChanges = false; }

async function persistDraftImagesToIndexedDb(){
  // Đồng bộ theo key trong một transaction: key cũ bị xóa, key thay đổi bị ghi đè,
  // ảnh không đổi không bị chuyển/ghi lại mỗi 10 giây.
  const records=[];
  for(const [key,img] of Object.entries(state.evidenceImages||{})){
    if(!img?.dataUrl) continue;
    const blob=img.blob instanceof Blob?img.blob:dataUrlToBlob(img.dataUrl);
    const localVersion=img.localVersion||newStableId("img");
    img.blob=blob;img.size=blob.size;img.contentType=img.contentType||blob.type||"image/jpeg";img.localVersion=localVersion;
    records.push({
      key,
      name:img.name||"anh.jpg",
      contentType:img.contentType||blob.type||"image/jpeg",
      blob,
      size:blob.size,
      localVersion,
      updatedAt:new Date().toISOString()
    });
  }
  const db=await openDraftImageDb();
  try{
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(DRAFT_IMAGE_STORE,"readwrite");
      const store=tx.objectStore(DRAFT_IMAGE_STORE);
      // Chỉ đọc danh sách key, không kéo toàn bộ Blob cũ từ IndexedDB vào RAM.
      const request=store.getAllKeys();
      request.onsuccess=()=>{
        const existingKeys=new Set((request.result||[]).map(String));
        const currentKeys=new Set(records.map(record=>record.key));
        for(const key of existingKeys) if(!currentKeys.has(key)) store.delete(key);
        for(const record of records){
          if(!existingKeys.has(record.key)||_persistedDraftImageVersions.get(record.key)!==record.localVersion) store.put(record);
        }
      };
      request.onerror=()=>tx.abort();
      tx.oncomplete=()=>{
        _persistedDraftImageVersions.clear();
        records.forEach(record=>_persistedDraftImageVersions.set(record.key,record.localVersion));
        resolve();
      };
      tx.onerror=()=>reject(tx.error||new Error("Không đồng bộ được ảnh bản nháp vào IndexedDB."));
      tx.onabort=()=>reject(tx.error||new Error("Giao dịch đồng bộ ảnh bản nháp bị hủy."));
    });
  } finally { db.close(); }
}

async function saveDraftSilently(){
  if(window._adminReviewSubmission) return false;
  try{
    await persistDraftImagesToIndexedDb();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serializeStateForStorage({includeImageData:false})));
    _lastAutoSaveAt = new Date();
    _lastAutoSaveError = "";
    markStateSaved();
    updateAutoSaveIndicator("success");
    return true;
  } catch(err){
    console.error("Không thể tự lưu bản nháp:", err);
    _lastAutoSaveError = err?.message || "Không thể lưu bản nháp trên thiết bị.";
    updateAutoSaveIndicator("error");
    return false;
  }
}

async function saveDraftToLocalStorage(){
  if(await saveDraftSilently()) await appAlert("Đã lưu bản nháp vào máy này.","Đã lưu");
  else await appAlert("Không lưu được bản nháp trên thiết bị. Vui lòng kiểm tra dung lượng trình duyệt hoặc thử lại.","Lưu thất bại");
}

function updateAutoSaveIndicator(status){
  const el = document.getElementById("autoSaveIndicator");
  if(!el) return;
  el.classList.remove("autosave-ok","autosave-error","autosave-pending");
  if(status==="error"){
    el.classList.add("autosave-error");
    el.textContent=`Tự lưu thất bại: ${_lastAutoSaveError}`;
  } else if(status==="pending"){
    el.classList.add("autosave-pending");
    el.textContent="Có thay đổi chưa được tự lưu";
  } else if(_lastAutoSaveAt){
    el.classList.add("autosave-ok");
    el.textContent=`Đã tự động lưu lúc ${_lastAutoSaveAt.toLocaleTimeString("vi-VN", {hour:"2-digit", minute:"2-digit"})}`;
  } else el.textContent="";
}

function loadDraftFromLocalStorage(){
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if(!raw) return null;
  try{ return JSON.parse(raw); } catch(e){ return null; }
}

async function clearLocalDraft(){
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  try{ await clearDraftImages(); } catch(err){ console.error("Không xóa được ảnh bản nháp:",err); }
}

function restoreStateDataOnly(draft){
  if(!draft) return;
  if(draft.personal){ const restoredPersonal={...draft.personal}; delete restoredPersonal.khoaNgoaiNgu; Object.assign(state.personal,restoredPersonal,{khoaTruong:"Điện - Điện tử"}); }
  if(draft.reportDate) Object.assign(state.reportDate,draft.reportDate);
  ["daoDuc","hocTap","theLuc","tinhNguyen","hoiNhap","khac"].forEach(k=>{ if(draft[k]) Object.assign(state[k],draft[k]); });
  if(state.hoiNhap?.fixed) delete state.hoiNhap.fixed["HN-F"];
  if(state.hoiNhap?.ngoaiNguDat === true && !state.hoiNhap.ngoaiNguMethod) state.hoiNhap.ngoaiNguMethod="certificate";
  state.hoiNhap.ngoaiNguCertificateType ||= "";
  state.hoiNhap.ngoaiNguCertificateScore ||= "";
  if(state.hoiNhap?.ngoaiNguDat === false && !state.hoiNhap.ngoaiNguMethod) state.hoiNhap.ngoaiNguMethod="notMet";
  state.evidence=draft.evidence||{};
  state.evidenceForms=draft.evidenceForms||{};
  state.removedEvidenceImageKeys=Array.isArray(draft.removedEvidenceImageKeys)?[...new Set(draft.removedEvidenceImageKeys.map(String))]:[];
  state.evidenceImages={};
}

async function restoreStateFromDraft(draft){
  restoreStateDataOnly(draft);
  const records=await getAllDraftImages();
  _persistedDraftImageVersions.clear();
  for(const record of records){
    try{
      const dataUrl=await blobToDataUrl(record.blob);
      const localVersion=record.localVersion||`legacy-${record.updatedAt||record.key}-${record.blob?.size||0}`;
      state.evidenceImages[record.key]={name:record.name||"anh.jpg",contentType:record.contentType||record.blob?.type||"image/jpeg",dataUrl,blob:record.blob,size:Number(record.size)||record.blob?.size||0,localVersion};
      _persistedDraftImageVersions.set(record.key,localVersion);
    }catch(err){console.error("Không khôi phục được ảnh",record.key,err);}
  }
  markStateSaved();
}

function maybeOfferRestoreDraft(){
  const draft = loadDraftFromLocalStorage();
  if(!draft) return;
  const name = draft.personal?.fullName ? ` (${draft.personal.fullName})` : "";
  appConfirm(`Tìm thấy bản nháp đã lưu trên máy này${name}. Bạn có muốn khôi phục không?`, {
    title:"Khôi phục bản nháp", confirmText:"Khôi phục", cancelText:"Xóa bản nháp"
  }).then(async ok => {
    if(ok){
      try{ await restoreStateFromDraft(draft); render(); updateAutoSaveIndicator("success"); }
      catch(err){ console.error(err); await appAlert("Không thể khôi phục đầy đủ bản nháp trên thiết bị.","Khôi phục thất bại"); }
    } else await clearLocalDraft();
  });
}

function buildEvidenceImagesPayload(){
  const payload = {};
  Object.entries(state.evidenceImages).forEach(([key, img]) => {
    if(img?.dataUrl) payload[key] = {name:img.name || "anh.jpg", dataBase64:img.dataUrl};
  });
  return payload;
}

function estimateDataUrlBytes(dataUrl){
  const value=String(dataUrl||""),comma=value.indexOf(",");
  if(comma<0) return 0;
  const payload=value.slice(comma+1).replace(/\s/g,"");
  if(!payload) return 0;
  const padding=payload.endsWith("==")?2:payload.endsWith("=")?1:0;
  return Math.max(0,Math.floor(payload.length*3/4)-padding);
}

function validateEvidenceImageBudget(){
  let total=0;
  for(const image of Object.values(state.evidenceImages||{})){
    if(!image?.dataUrl) continue;
    const bytes=Number(image.size)||image.blob?.size||estimateDataUrlBytes(image.dataUrl);
    if(bytes>MAX_EVIDENCE_IMAGE_BYTES) return "Có ảnh sau khi nén vẫn vượt quá 8 MB. Vui lòng xóa ảnh đó và tải lại.";
    total+=bytes;
  }
  if(total>MAX_TOTAL_EVIDENCE_BYTES) return `Tổng dung lượng ảnh là ${(total/1024/1024).toFixed(1)} MB, vượt giới hạn 16 MB. Vui lòng giảm số ảnh hoặc dùng link đơn cho một số minh chứng.`;
  return null;
}

function loadSubmissionMetaMap(){
  try{ return JSON.parse(localStorage.getItem(SUBMISSION_META_KEY) || "{}"); }
  catch(e){ return {}; }
}

function getCurrentSubmissionMeta(){
  const mssv = String(state.personal.mssv || "").trim();
  if(!mssv) return null;
  return loadSubmissionMetaMap()[mssv] || null;
}

function saveCurrentSubmissionMeta(submittedAt){
  const mssv = String(state.personal.mssv || "").trim();
  if(!mssv) return;
  const map = loadSubmissionMetaMap();
  map[mssv] = {submittedAt:submittedAt || new Date().toISOString(), fingerprint:getStateFingerprint()};
  localStorage.setItem(SUBMISSION_META_KEY, JSON.stringify(map));
}

function hasChangesAfterSubmission(){
  const meta = getCurrentSubmissionMeta();
  return Boolean(meta && meta.fingerprint !== getStateFingerprint());
}

function getSubmissionButtonLabel(){
  return getCurrentSubmissionMeta() ? "Gửi bản cập nhật" : "Gửi cho Ban PTSV5T SEEE";
}

function getLastSubmissionInfoHtml(){
  const meta = getCurrentSubmissionMeta();
  if(!meta) return '<span id="autoSaveIndicator"></span>';
  const date = new Date(meta.submittedAt);
  const text = Number.isNaN(date.getTime()) ? "Hồ sơ đã được gửi." : `Hồ sơ đã gửi lúc ${date.toLocaleTimeString("vi-VN", {hour:"2-digit", minute:"2-digit"})} ngày ${date.toLocaleDateString("vi-VN")}.`;
  const suffix = hasChangesAfterSubmission() ? " Những thay đổi hiện tại chưa được gửi lại." : " Dữ liệu hiện tại trùng với bản đã gửi.";
  return `${text}${suffix}<br><span id="autoSaveIndicator"></span>`;
}

function validateSubmissionBeforeSend(){
  state.personal.khoaTruong = "Điện - Điện tử";
  const h = state.hocTap || {};
  const d = state.daoDuc || {};
  if(!state.personal.fullName?.trim()) return "Vui lòng nhập họ và tên.";
  if(!state.personal.mssv?.trim()) return "Vui lòng nhập MSSV.";
  const mssvCheck=validateMSSV(state.personal.mssv.trim());if(!mssvCheck.ok)return mssvCheck.msg;
  if(!state.personal.className?.trim()) return "Vui lòng nhập lớp.";
  if(!Number.isInteger(Number(state.personal.birthYear)) || Number(state.personal.birthYear)<2000 || Number(state.personal.birthYear)>2010) return "Năm sinh phải từ 2000 đến 2010.";
  if(![d.renLuyenKy1,d.renLuyenKy2].every(v => v !== "" && Number(v) >= 0 && Number(v) <= 100)) return "Điểm rèn luyện phải nằm trong khoảng từ 0 đến 100.";
  if(![h.diemKy1,h.diemKy2].every(v => v !== "" && Number(v) >= 0 && Number(v) <= 4)) return "Điểm học tập phải nằm trong khoảng từ 0 đến 4.";
  if(![h.tinChiKy1,h.tinChiKy2].every(v => v !== "" && Number(v) >= 1 && Number(v) <= 30)) return "Số tín chỉ mỗi kỳ phải nằm trong khoảng từ 1 đến 30.";
  if(![h.tinChiKy1,h.tinChiKy2].every(v=>Number.isInteger(Number(v)))) return "Số tín chỉ mỗi kỳ phải là số nguyên.";
  const imageBudgetError=validateEvidenceImageBudget();
  if(imageBudgetError) return imageBudgetError;
  const hardEligibility=window.SV5TRules.evaluateHardEligibility(state);
  if(!hardEligibility.drlMet) return `Điểm rèn luyện trung bình phải từ ${hardEligibility.drlRequired} trở lên.`;
  if(!hardEligibility.gpaMet) return `GPA trung bình có trọng số của diện xét phải từ ${hardEligibility.gpaThreshold} trở lên.`;
  if(!hardEligibility.noViolationMet) return "Chỉ có thể gửi hồ sơ khi bạn xác nhận không vi phạm pháp luật, quy chế và nội quy.";
  if(!hardEligibility.physicalMet) return "Chỉ có thể gửi hồ sơ khi đã hoàn thành đủ 05 học phần GDTC hoặc không có điểm F trong các học phần GDTC đã học.";
  const missingDeclarations=window.SV5TRules.missingRequiredDeclarations(state);
  if(missingDeclarations.length) return `Hồ sơ còn ${missingDeclarations.length} tiêu chí chưa khai báo đầy đủ.`;
  if((state.tinhNguyen?.items || []).some(it => !Number.isFinite(Number(it.days)) || Number(it.days) < 0)) return "Số ngày tình nguyện không được âm.";
  // Bắt buộc mỗi hoạt động tình nguyện phải có số ngày quy đổi và danh sách ngày
  // tham gia, vì báo cáo thành tích in ra theo dạng "(2 ngày: 19/10, 24/10/2025)".
  const volunteerNoDays=(state.tinhNguyen?.items || []).filter(it => !(Number(it.days) > 0)).map(it => it.text);
  if(volunteerNoDays.length) return `Chưa nhập số ngày quy đổi cho hoạt động tình nguyện: ${volunteerNoDays.slice(0,3).join("; ")}${volunteerNoDays.length>3?`; và ${volunteerNoDays.length-3} hoạt động khác`:""}.`;
  const volunteerNoDates=window.SV5TRules.volunteerItemsMissingDates(state.tinhNguyen?.items);
  if(volunteerNoDates.length) return `Chưa liệt kê ngày tham gia cho hoạt động tình nguyện: ${volunteerNoDates.slice(0,3).join("; ")}${volunteerNoDates.length>3?`; và ${volunteerNoDates.length-3} hoạt động khác`:""}.`;
  return null;
}

async function handleSubmitToBanSV5T(){
  // Chế độ quản trị xem hồ sơ là CHỈ ĐỌC. Nút gửi đã bị ẩn bằng CSS, nhưng vẫn
  // chặn ở đây để không bao giờ ghi đè hồ sơ sinh viên bằng bản đang xem.
  if(window._adminReviewSubmission){
    await appAlert("Bạn đang xem hồ sơ của sinh viên ở chế độ chỉ đọc nên không thể gửi. Hãy bấm “Quay lại danh sách” trước.","Không thể gửi ở chế độ quản trị");
    return;
  }
  const statusEl = document.getElementById("submitStatusMsg");
  const validationError = validateSubmissionBeforeSend();
  if(validationError){ await appAlert(validationError, "Dữ liệu chưa hợp lệ"); return; }
  if(APP_CONFIG.submissionsOpen === false){ await appAlert(APP_CONFIG.submissionClosedMessage || "Hiện không trong thời gian nhận hồ sơ.","Chưa mở nhận hồ sơ"); return; }
  const now=Date.now();
  if(APP_CONFIG.submissionStartAt && now < new Date(APP_CONFIG.submissionStartAt).getTime()){ await appAlert("Chưa đến thời gian nhận hồ sơ.","Chưa mở nhận hồ sơ"); return; }
  if(APP_CONFIG.submissionEndAt && now > new Date(APP_CONFIG.submissionEndAt).getTime()){ await appAlert(APP_CONFIG.submissionClosedMessage || "Đã hết thời gian nhận hồ sơ.","Đã đóng nhận hồ sơ"); return; }
  const confirmed = await openSubmissionReviewDialog();
  if(!confirmed) return;
  if(statusEl) statusEl.innerHTML = '<p class="hint">Đang gửi hồ sơ cho Ban PTSV5T SEEE...</p>';
  {
    const outcome = await callApi("/api/submissions", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        fullName:state.personal.fullName,
        mssv:state.personal.mssv,
        className:state.personal.className,
        data:serializeStateForStorage({includeImageData:false}),
        evidenceImages:buildEvidenceImagesPayload(),
        removedEvidenceImageKeys:[...(state.removedEvidenceImageKeys || [])]
      })
    });
    if(!outcome.ok){
      const label = API_SCOPE_LABEL[outcome.scope] || API_SCOPE_LABEL.unknown;
      if(statusEl){
        statusEl.innerHTML='';
        const title=document.createElement('p');title.className='err-msg';title.textContent=`Gửi thất bại - ${label.title}: ${outcome.message}`;
        const hint=document.createElement('p');hint.className='hint';hint.textContent=label.hint;
        statusEl.append(title,hint);
      }
      await reportApiFailure(outcome,"Gửi hồ sơ");
      return;
    }
    const result = outcome.body;
    saveCurrentSubmissionMeta(result.submittedAt);
    state.removedEvidenceImageKeys = [];
    await clearLocalDraft();
    markStateSaved();
    if(statusEl) statusEl.innerHTML = '<p class="ok-msg">Đã gửi hồ sơ cho Ban PTSV5T SEEE thành công!</p>';
    const btn = document.getElementById("submitSupabaseBtn");
    if(btn) btn.textContent = "Gửi bản cập nhật";
    const info = document.getElementById("lastSubmissionInfo");
    if(info) info.innerHTML = getLastSubmissionInfoHtml();
  }
}
