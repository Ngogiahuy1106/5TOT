// Chặn ký tự có thể tạo HTML/script trước khi các listener của form nhận dữ liệu.
document.addEventListener("input", function(e){
  const el=e.target;
  if(!el || !(el.matches("input[type=text], input[type=url], textarea"))) return;
  const clean=el.value.replace(/[<>]/g, "");
  if(clean!==el.value) el.value=clean;
}, true);

/* =========================================================
   BOOTSTRAP
   ========================================================= */

window.addEventListener("beforeunload", function(e){
  if(!_hasUnsavedChanges || window._adminReviewSubmission) return;
  e.preventDefault();
  e.returnValue = "";
});

// Mọi thay đổi trong form được đánh dấu để chỉ cảnh báo khi thật sự chưa lưu.
document.addEventListener("input", markStateDirty, true);
document.addEventListener("change", markStateDirty, true);
document.addEventListener("click", event => {
  const button = event.target.closest("#stepContent button");
  if(!button || button.closest(".nav-buttons") || ["saveLocalBtn","submitSupabaseBtn"].includes(button.id)) return;
  markStateDirty(event);
}, true);

document.getElementById("fillSampleBtn").addEventListener("click", () => { fillSampleData(); markStateDirty(); });
document.getElementById("exportExcelBtn").addEventListener("click", exportCriteriaExcel);
document.getElementById("importExcelBtn").addEventListener("click", () => document.getElementById("importExcelInput").click());
document.getElementById("importExcelInput").addEventListener("change", (e) => {
  if(e.target.files && e.target.files[0]){
    importCriteriaExcel(e.target.files[0]);
    markStateDirty();
  }
  e.target.value = "";
});

initAdminUI();
state.personal.khoaTruong = "Điện - Điện tử";
render();
maybeOfferRestoreDraft();

// Tự lưu mỗi 10 giây, nhưng chỉ khi dữ liệu đã thay đổi.
let _autoSaveRunning=false;
setInterval(async () => {
  if(_autoSaveRunning || !_hasUnsavedChanges || window._adminReviewSubmission) return;
  _autoSaveRunning=true;
  try{ await saveDraftSilently(); } finally { _autoSaveRunning=false; }
}, 10000);

fetch("/api/config")
  .then(res => res.json())
  .then(result => {
    if(result.success && result.config){
      Object.assign(APP_CONFIG, result.config);
      render();
    }
  })
  .catch(err => console.error("Không tải được cấu hình từ server:", err));
