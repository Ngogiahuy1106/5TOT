// server.js - sv5tot-hoso
require('dotenv').config();

const path = require('path');
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ALLOWED_STATUSES = new Set(['Chưa kiểm tra', 'Đã duyệt', 'Cần bổ sung']);
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || '';
const STORAGE_SIGNED_URL_TTL = 60 * 60;

if (!ADMIN_PASSWORD) {
  console.warn('[WARN] ADMIN_PASSWORD is not set in .env - admin actions will always be rejected until it is set.');
}

app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob: https://*.supabase.co; script-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co; font-src 'self' data:;");
  next();
});


function storageIsConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && SUPABASE_STORAGE_BUCKET);
}

function storageHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

function encodeStoragePath(objectPath) {
  return String(objectPath).split('/').map(encodeURIComponent).join('/');
}

function sanitizeFilePart(value) {
  return String(value || 'file').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'file';
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!match) throw new Error('Ảnh minh chứng không đúng định dạng base64.');
  const contentType = match[1].toLowerCase();
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!allowedTypes.has(contentType)) {
    throw new Error('Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.');
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) throw new Error('Tệp ảnh rỗng.');
  if (buffer.length > 8 * 1024 * 1024) throw new Error('Mỗi ảnh sau khi nén không được vượt quá 8 MB.');
  return { contentType, buffer };
}

function storageExtension(contentType) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

function evidenceFolder(key) {
  const category = String(key || '').split('::')[0];
  const allowed = new Set(['daoDuc', 'hocTap', 'theLuc', 'tinhNguyen', 'hoiNhap', 'khac']);
  return allowed.has(category) ? category : 'khac';
}

async function verifyStorageBucket() {
  if (!storageIsConfigured()) {
    throw new Error('Thiếu SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY hoặc SUPABASE_STORAGE_BUCKET trong .env.');
  }
  const bucketUrl = `${SUPABASE_URL}/storage/v1/bucket/${encodeURIComponent(SUPABASE_STORAGE_BUCKET)}`;
  const check = await fetch(bucketUrl, { headers: storageHeaders() });
  if (!check.ok) {
    const detail = await check.text();
    if (check.status === 404 || check.status === 400) {
      throw new Error(`Bucket "${SUPABASE_STORAGE_BUCKET}" chưa tồn tại. Hãy tạo bucket private này trước trong Supabase Storage.`);
    }
    throw new Error(`Không kiểm tra được bucket "${SUPABASE_STORAGE_BUCKET}": ${detail || check.status}`);
  }
  const bucket = await check.json().catch(() => ({}));
  if (bucket.public === true) {
    console.warn(`[WARN] Bucket ${SUPABASE_STORAGE_BUCKET} đang là public. Nên chuyển sang private để bảo vệ minh chứng.`);
  }
  console.log(`[storage] Đã kết nối bucket: ${SUPABASE_STORAGE_BUCKET}`);
}

async function uploadEvidenceImages(mssv, evidenceImages, protectedPaths = new Set()) {
  if (!storageIsConfigured()) throw new Error('Supabase Storage chưa được cấu hình đầy đủ trên máy chủ.');
  const result = {};
  const uploadedPaths = [];
  try {
    for (const [key, image] of Object.entries(evidenceImages || {})) {
      if (!image?.dataBase64) continue;
      const { contentType, buffer } = parseDataUrl(image.dataBase64);
      const originalName = sanitizeFilePart(image.name || 'anh.jpg');
      const folder = evidenceFolder(key);
      const extension = storageExtension(contentType);
      const objectName = `${sanitizeFilePart(key)}.${extension}`;
      const objectPath = `${sanitizeFilePart(mssv)}/${folder}/${objectName}`;
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(SUPABASE_STORAGE_BUCKET)}/${encodeStoragePath(objectPath)}`, {
        method: 'POST',
        headers: storageHeaders({ 'Content-Type': contentType, 'x-upsert': 'true', 'Cache-Control': '3600' }),
        body: buffer,
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Không upload được ảnh ${originalName}: ${detail || response.status}`);
      }
      uploadedPaths.push(objectPath);
      result[key] = {
        bucket: SUPABASE_STORAGE_BUCKET,
        name: image.name || originalName,
        path: objectPath,
        size: buffer.length,
        mime: contentType,
        contentType,
        uploadedAt: new Date().toISOString(),
      };
    }
    return result;
  } catch (err) {
    await deleteStorageObjects(uploadedPaths.filter(path => !protectedPaths.has(path)));
    throw err;
  }
}

async function deleteStorageObjects(paths) {
  const prefixes = [...new Set((paths || []).filter(Boolean))];
  if (!prefixes.length || !storageIsConfigured()) return;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(SUPABASE_STORAGE_BUCKET)}`, {
    method: 'DELETE',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes }),
  });
  if (!response.ok) console.error('[storage] DELETE failed:', await response.text());
}

async function createSignedUrl(objectPath) {
  if (!objectPath || !storageIsConfigured()) return '';
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${encodeURIComponent(SUPABASE_STORAGE_BUCKET)}/${encodeStoragePath(objectPath)}`, {
    method: 'POST',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn: STORAGE_SIGNED_URL_TTL }),
  });
  if (!response.ok) return '';
  const payload = await response.json();
  const signed = payload.signedURL || payload.signedUrl || '';
  if (!signed) return '';
  if (/^https?:\/\//i.test(signed)) return signed;
  return `${SUPABASE_URL}/storage/v1${signed.startsWith('/') ? signed : `/${signed}`}`;
}

async function hydrateEvidenceImageUrls(evidenceImages) {
  const output = {};
  await Promise.all(Object.entries(evidenceImages || {}).map(async ([key, image]) => {
    output[key] = { ...image, url: await createSignedUrl(image?.path) };
  }));
  return output;
}

function checkAdminPassword(password) {
  return Boolean(ADMIN_PASSWORD) && password === ADMIN_PASSWORD;
}

function getAdminPassword(req) {
  return req.get('X-Admin-Password') || req.body?.password || '';
}

function isNumberInRange(value, min, max) {
  if (value === '' || value === null || value === undefined) return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
}
function isSafeText(value){ return !/[<>]/.test(String(value ?? '')); }
function isValidPublicUrl(value){
  try { const u=new URL(String(value||'')); return u.protocol==='https:' && Boolean(u.hostname); }
  catch { return false; }
}
function walkStrings(value, visit){
  if(typeof value==='string') visit(value);
  else if(Array.isArray(value)) value.forEach(v=>walkStrings(v,visit));
  else if(value && typeof value==='object') Object.values(value).forEach(v=>walkStrings(v,visit));
}
const GROUP_VALIDATION_RULES = Object.freeze({
  'DD-G1':{kind:'list',min:1}, 'DD-G2':{kind:'rank'}, 'DD-G3':{kind:'rank'}, 'DD-G4':{kind:'list',min:1}, 'DD-G5':{kind:'yesno'},
  'HT-G1':{kind:'detail'}, 'HT-G2':{kind:'detail'}, 'HT-G3':{kind:'list',min:1}, 'HT-G4':{kind:'detail'}, 'HT-G5':{kind:'detail'}, 'HT-G6':{kind:'detail'},
  'TL-G1':{kind:'yesno'}, 'TL-G2':{kind:'list',min:2}, 'TL-G3':{kind:'yesno'}, 'TL-G4':{kind:'yesno'},
  'HN-KHOA-HOC':{kind:'list',min:1}, 'HN-CAP-DAI-HOC':{kind:'list',min:1},
  'HN-G1':{kind:'list',min:1}, 'HN-G2':{kind:'list',min:1}
});
function groupStateComplete(gs, groupId){
  if(!gs || typeof gs!=='object') return false;
  if(gs.pending===true || gs.yes===false) return true;
  if(gs.yes!==true) return false;
  const rule=GROUP_VALIDATION_RULES[String(groupId||'')] || null;
  if(rule?.kind==='list') return Array.isArray(gs.items) && gs.items.length >= rule.min;
  if(rule?.kind==='rank') return Boolean(String(gs.rank||'').trim());
  if(rule?.kind==='detail') return Boolean(String(gs.detail||'').trim());
  if(rule?.kind==='yesno') return true;
  if(Array.isArray(gs.items)) return gs.items.length>0;
  if(Object.prototype.hasOwnProperty.call(gs,'rank')) return Boolean(String(gs.rank||'').trim());
  if(Object.prototype.hasOwnProperty.call(gs,'detail')) return Boolean(String(gs.detail||'').trim());
  return true;
}
function collectGroupEvidence(category, groups, expected){
  for(const [groupId,gs] of Object.entries(groups||{})){
    if(groupId==='HN-F') continue;
    if(gs?.yes!==true || gs?.pending===true) continue;
    if(Array.isArray(gs.items)) gs.items.forEach(it=>expected.push({key:`${category}::${groupId}:${it?.id||it?.name||''}`,dual:false}));
    else expected.push({key:`${category}::${groupId}`,dual:false});
  }
}
function buildExpectedEvidence(data){
  const expected=[];
  const d=data.daoDuc||{}, h=data.hocTap||{}, t=data.theLuc||{}, tn=data.tinhNguyen||{}, hn=data.hoiNhap||{};
  if(d.renLuyenKy1!==''&&d.renLuyenKy2!=='') expected.push({key:'daoDuc::dd-rl',dual:true});
  collectGroupEvidence('daoDuc',d.groups,expected);
  if(h.diemKy1!==''&&h.diemKy2!=='') expected.push({key:'hocTap::ht-diem',dual:true});
  collectGroupEvidence('hocTap',h.groups,expected);
  if(t.hoanThanhDuGDTC===true||t.khongDiemF===true) expected.push({key:'theLuc::tl-gdtc',dual:false});
  collectGroupEvidence('theLuc',t.groups,expected);
  (tn.items||[]).forEach((_,i)=>expected.push({key:`tinhNguyen::tn-${i}`,dual:false}));
  if(tn.khenThuong) expected.push({key:'tinhNguyen::tn-khenthuong',dual:false});
  collectGroupEvidence('hoiNhap',hn.fixed,expected); collectGroupEvidence('hoiNhap',hn.groups,expected);
  if(hn.ngoaiNguMethod==='exempt'||(hn.ngoaiNguMethod==='certificate'&&isValidNgoaiNguCertificate(data))) expected.push({key:'hoiNhap::hn-ngoaingu',dual:false});
  (data.khac?.items||[]).forEach((_,i)=>expected.push({key:`khac::khac-${i}`,dual:false}));
  return expected;
}
function createReviewRows(){
  return {
    daoDuc:{key:'daoDuc',title:'Đạo đức Tốt',criteria:{declared:0,later:0,unanswered:0},evidence:{ready:0,later:0,missing:0,total:0}},
    hocTap:{key:'hocTap',title:'Học tập Tốt',criteria:{declared:0,later:0,unanswered:0},evidence:{ready:0,later:0,missing:0,total:0}},
    theLuc:{key:'theLuc',title:'Thể lực Tốt',criteria:{declared:0,later:0,unanswered:0},evidence:{ready:0,later:0,missing:0,total:0}},
    tinhNguyen:{key:'tinhNguyen',title:'Tình nguyện Tốt',criteria:{declared:0,later:0,unanswered:0},evidence:{ready:0,later:0,missing:0,total:0}},
    hoiNhap:{key:'hoiNhap',title:'Hội nhập Tốt',criteria:{declared:0,later:0,unanswered:0},evidence:{ready:0,later:0,missing:0,total:0}},
    khac:{key:'khac',title:'Các thành tích khác',criteria:{declared:1,later:0,unanswered:0},evidence:{ready:0,later:0,missing:0,total:0}},
  };
}
function countServerGroupDeclarations(row,groups,details){
  for(const [groupId,gs] of Object.entries(groups||{})){
    if(groupId==='HN-F') continue;
    if(gs?.pending===true){ row.criteria.later++; continue; }
    const normalized = gs && gs.notMet===true && (gs.yes===null||gs.yes===undefined) ? {...gs,yes:false} : gs;
    if(groupStateComplete(normalized,groupId)) row.criteria.declared++;
    else { row.criteria.unanswered++; details.push(groupId); }
  }
}
function computeServerReview(data,evidenceImages){
  const rows=createReviewRows();
  const missingCriteria=[];
  const missingEvidence=[];
  const d=data.daoDuc||{},h=data.hocTap||{},t=data.theLuc||{},tn=data.tinhNguyen||{},hn=data.hoiNhap||{};
  // Hồ sơ/bản nháp cũ từng dùng HN-F. Khóa này đã được tách thành hai mục mới
  // và tuyệt đối không được tính như một tiêu chí thứ ba.
  // HN-F cũ được bỏ qua ở các vòng lặp, không sửa trực tiếp payload request.

  if(d.renLuyenKy1!==''&&d.renLuyenKy2!=='') rows.daoDuc.criteria.declared++;
  else { rows.daoDuc.criteria.unanswered++; missingCriteria.push('Đạo đức: điểm rèn luyện kỳ 1 và kỳ 2'); }
  if(d.khongViPham!==null&&d.khongViPham!==undefined) rows.daoDuc.criteria.declared++;
  else { rows.daoDuc.criteria.unanswered++; missingCriteria.push('Đạo đức: xác nhận không vi phạm'); }
  countServerGroupDeclarations(rows.daoDuc,d.groups,missingCriteria);

  if(h.diemKy1!==''&&h.diemKy2!==''&&h.tinChiKy1!==''&&h.tinChiKy2!=='') rows.hocTap.criteria.declared++;
  else { rows.hocTap.criteria.unanswered++; missingCriteria.push('Học tập: GPA và tín chỉ của hai kỳ'); }
  countServerGroupDeclarations(rows.hocTap,h.groups,missingCriteria);

  if(t.hoanThanhDuGDTC===true||t.khongDiemF===true||t.khongDiemF===false) rows.theLuc.criteria.declared++;
  else { rows.theLuc.criteria.unanswered++; missingCriteria.push('Thể lực: tình trạng giáo dục thể chất'); }
  countServerGroupDeclarations(rows.theLuc,t.groups,missingCriteria);

  const totalDays=(tn.items||[]).reduce((sum,it)=>sum+(Number(it?.days)||0),0);
  if(totalDays>=5) rows.tinhNguyen.criteria.declared++;
  else if(tn.pending===true) rows.tinhNguyen.criteria.later++;
  else { rows.tinhNguyen.criteria.unanswered++; missingCriteria.push('Tình nguyện: chưa đủ 5 ngày và chưa đánh dấu bổ sung sau'); }

  countServerGroupDeclarations(rows.hoiNhap,hn.fixed,missingCriteria);
  if(hn.ngoaiNguPending===true) rows.hoiNhap.criteria.later++;
  else if(hn.ngoaiNguMethod==='exempt'||hn.ngoaiNguMethod==='notMet'||(hn.ngoaiNguMethod==='certificate'&&isValidNgoaiNguCertificate(data))) rows.hoiNhap.criteria.declared++;
  else { rows.hoiNhap.criteria.unanswered++; missingCriteria.push('Hội nhập: tình trạng ngoại ngữ'); }
  countServerGroupDeclarations(rows.hoiNhap,hn.groups,missingCriteria);

  const statuses=data.evidence||{}, formLinks=data.evidenceForms||{};
  for(const item of buildExpectedEvidence(data)){
    const category=String(item.key).split('::')[0];
    const row=rows[category]||rows.khac;
    row.evidence.total++;
    const hasImage=item.dual
      ? Boolean(evidenceImages?.[`${item.key}::ky1`]?.dataBase64 && evidenceImages?.[`${item.key}::ky2`]?.dataBase64)
      : Boolean(evidenceImages?.[item.key]?.dataBase64);
    const status=statuses[item.key];
    if(hasImage){ row.evidence.ready++; continue; }
    if(status==='later'){ row.evidence.later++; continue; }
    if(status==='form'&&isValidPublicUrl(formLinks[item.key])){ row.evidence.ready++; continue; }
    row.evidence.missing++;
    if(status==='form') missingEvidence.push(`${item.key}: link đơn đang trống hoặc không đúng định dạng HTTPS`);
    else missingEvidence.push(item.key);
  }
  const rowList=Object.values(rows);
  const criteriaMissing=rowList.reduce((sum,row)=>sum+row.criteria.unanswered,0);
  const evidenceMissing=rowList.reduce((sum,row)=>sum+row.evidence.missing,0);
  return {rows:rowList,criteriaMissing,evidenceMissing,blockers:criteriaMissing+evidenceMissing,missingCriteria,missingEvidence};
}

async function getSubmissionWindow(){
  const row=await prisma.appConfig.findUnique({where:{key:'main'}});
  return {
    submissionsOpen: row?.submissionsOpen ?? true,
    submissionStartAt: row?.submissionStartAt || null,
    submissionEndAt: row?.submissionEndAt || null,
    submissionClosedMessage: row?.submissionClosedMessage || 'Hiện không trong thời gian nhận hồ sơ.'
  };
}
function windowIsOpen(config){
  const now=Date.now();
  if(config.submissionsOpen===false) return false;
  if(config.submissionStartAt && now<new Date(config.submissionStartAt).getTime()) return false;
  if(config.submissionEndAt && now>new Date(config.submissionEndAt).getTime()) return false;
  return true;
}

function isValidNgoaiNguCertificate(data){
  const hn=data?.hoiNhap||{};
  if(hn.ngoaiNguMethod!=="certificate") return false;
  const type=String(hn.ngoaiNguCertificateType||"");
  const raw=String(hn.ngoaiNguCertificateScore??"").trim();
  if(!["IELTS","TOEIC"].includes(type)||raw===""||!Number.isFinite(Number(raw))) return false;
  const score=Number(raw);
  if(type==="IELTS") return score>=0&&score<=9&&Math.abs(score*2-Math.round(score*2))<1e-9;
  const mssv=String(data?.personal?.mssv||"");
  const khoa=mssv.slice(0,4);
  const minimum=khoa==="2024"?350:khoa==="2023"?400:khoa==="2022"?450:500;
  return Number.isInteger(score)&&score>=minimum&&score<=990;
}

function normalizeRemovedEvidenceKeys(value){
  if(!Array.isArray(value)) return [];
  return [...new Set(value.map(v=>String(v||'').trim()).filter(v=>v && v.length<=300))];
}
function currentExpectedImageKeys(data){
  const keys=new Set();
  for(const item of buildExpectedEvidence(data||{})){
    if(item.dual){ keys.add(`${item.key}::ky1`); keys.add(`${item.key}::ky2`); }
    else keys.add(item.key);
  }
  return keys;
}
function validateSubmissionPayload(body) {
  const { fullName, mssv, className, data, evidenceImages } = body || {};
  if (!data || typeof data !== 'object') return 'Thiếu dữ liệu hồ sơ.';
  let unsafe=false; walkStrings({fullName,mssv,className,data},v=>{if(!isSafeText(v)) unsafe=true;});
  if(unsafe) return 'Dữ liệu chứa ký tự HTML không được phép.';
  if (!String(fullName || '').trim()) return 'Thiếu họ và tên.';
  if (!/^20\d{6,7}$/.test(String(mssv || ''))) return 'MSSV không hợp lệ.';
  if (!String(className || '').trim()) return 'Thiếu thông tin lớp.';
  const personal = data.personal || {};
  if (String(personal.khoaTruong || '') !== 'Điện - Điện tử') return 'Khoa/Trường không hợp lệ.';
  if(!Number.isInteger(Number(personal.birthYear))||Number(personal.birthYear)<2000||Number(personal.birthYear)>2010) return 'Năm sinh phải là số nguyên từ 2000 đến 2010.';
  const daoDuc = data.daoDuc || {};
  if (!isNumberInRange(daoDuc.renLuyenKy1, 0, 100) || !isNumberInRange(daoDuc.renLuyenKy2, 0, 100)) return 'Điểm rèn luyện phải nằm trong khoảng từ 0 đến 100.';
  const hocTap = data.hocTap || {};
  if (!isNumberInRange(hocTap.diemKy1, 0, 4) || !isNumberInRange(hocTap.diemKy2, 0, 4)) return 'Điểm học tập phải nằm trong khoảng từ 0 đến 4.';
  if (!isNumberInRange(hocTap.tinChiKy1, 1, 30) || !isNumberInRange(hocTap.tinChiKy2, 1, 30)) return 'Số tín chỉ mỗi kỳ phải nằm trong khoảng từ 1 đến 30.';
  const hn=data.hoiNhap||{};
  if(hn.ngoaiNguMethod==='certificate'&&!isValidNgoaiNguCertificate(data)) return 'Thông tin IELTS/TOEIC không hợp lệ hoặc chưa đạt mức TOEIC tối thiểu theo khóa.';
  const volunteerItems = Array.isArray(data.tinhNguyen?.items) ? data.tinhNguyen.items : [];
  if (volunteerItems.some(item => !isNumberInRange(item?.days, 0, Number.MAX_SAFE_INTEGER))) return 'Số ngày tình nguyện không được âm.';
  return null;
}

app.get('/api/config', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  try {
    const row = await prisma.appConfig.findUnique({ where: { key: 'main' } });
    res.json({
      success: true,
      config: {
        linkDeXuatHoatDong: row?.linkDeXuatHoatDong || '',
        linkXacNhanCLB: row?.linkXacNhanClb || '',
        linkXacNhanNgoaiKhoa: row?.linkXacNhanNgoaiKhoa || '',
        linkXacNhanChung: row?.linkXacNhanChung || '',
        submissionsOpen: row?.submissionsOpen ?? true,
        submissionStartAt: row?.submissionStartAt || '',
        submissionEndAt: row?.submissionEndAt || '',
        submissionClosedMessage: row?.submissionClosedMessage || 'Hiện không trong thời gian nhận hồ sơ.',
      },
    });
  } catch (err) {
    console.error('[config] GET failed:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi khi đọc cấu hình từ máy chủ.' });
  }
});

app.patch('/api/config', async (req, res) => {
  const { password, config } = req.body || {};
  if (!checkAdminPassword(password)) return res.status(403).json({ success: false, message: 'Sai mật khẩu.' });
  if (!config || typeof config !== 'object') return res.status(400).json({ success: false, message: 'Thiếu dữ liệu cấu hình.' });
  try {
    const payload = {
      linkDeXuatHoatDong: config.linkDeXuatHoatDong || '',
      linkXacNhanClb: config.linkXacNhanCLB || '',
      linkXacNhanNgoaiKhoa: config.linkXacNhanNgoaiKhoa || '',
      linkXacNhanChung: config.linkXacNhanChung || '',
      submissionsOpen: config.submissionsOpen !== false,
      submissionStartAt: config.submissionStartAt ? new Date(config.submissionStartAt) : null,
      submissionEndAt: config.submissionEndAt ? new Date(config.submissionEndAt) : null,
      submissionClosedMessage: String(config.submissionClosedMessage || 'Hiện không trong thời gian nhận hồ sơ.').slice(0,300),
    };
    await prisma.appConfig.upsert({ where: { key: 'main' }, update: payload, create: { key: 'main', ...payload } });
    res.json({ success: true });
  } catch (err) {
    console.error('[config] PATCH failed:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi khi lưu cấu hình lên máy chủ.' });
  }
});

app.post('/api/auth', (req, res) => {
  if (checkAdminPassword(req.body?.password)) res.json({ success: true });
  else res.status(401).json({ success: false, message: 'Sai mật khẩu.' });
});

// Kiểm tra trước khi gửi bằng đúng thuật toán backend dùng khi lưu hồ sơ.
app.post('/api/submissions/review', async (req,res)=>{
  const validationError=validateSubmissionPayload(req.body);
  if(validationError) return res.status(400).json({success:false,message:validationError});
  const {mssv,data,evidenceImages,removedEvidenceImageKeys}=req.body;
    const removedKeys=new Set(normalizeRemovedEvidenceKeys(removedEvidenceImageKeys));
  try{
    const existing=await prisma.submission.findUnique({where:{mssv:String(mssv).trim()},select:{evidenceImages:true}});
    const reviewEvidence={};
    for(const [key,img] of Object.entries(existing?.evidenceImages||{})) if(img?.path && !removedKeys.has(key)) reviewEvidence[key]={dataBase64:'existing'};
    Object.assign(reviewEvidence,evidenceImages||{});
    const review=computeServerReview(data,reviewEvidence);
    res.json({success:true,review});
  }catch(err){
    console.error('[submissions] REVIEW failed:',err.message);
    res.status(500).json({success:false,message:'Không kiểm tra được hồ sơ trên máy chủ.'});
  }
});

// Một MSSV chỉ có một hồ sơ. Gửi lại sẽ thay dữ liệu cũ và đưa về trạng thái Chưa kiểm tra.
app.post('/api/submissions', async (req, res) => {
  try{
    const win=await getSubmissionWindow();
    if(!windowIsOpen(win)) return res.status(403).json({success:false,message:win.submissionClosedMessage});
  }catch(err){ return res.status(500).json({success:false,message:'Không kiểm tra được thời gian nhận hồ sơ.'}); }
  const validationError = validateSubmissionPayload(req.body);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  const { fullName, mssv, className, data, evidenceImages, removedEvidenceImageKeys } = req.body;
  const normalizedMssv = String(mssv).trim();
  const removedKeys = new Set(normalizeRemovedEvidenceKeys(removedEvidenceImageKeys));
  let newlyUploaded = {};
  let existingImagesForRollback = {};
  try {
    const existing = await prisma.submission.findUnique({
      where: { mssv: normalizedMssv },
      select: { id: true, evidenceImages: true, note: true },
    });
    const reviewEvidence={};
    for(const [key,img] of Object.entries(existing?.evidenceImages||{})) if(img?.path && !removedKeys.has(key)) reviewEvidence[key]={dataBase64:'existing'};
    Object.assign(reviewEvidence,evidenceImages||{});
    const serverReview=computeServerReview(data,reviewEvidence);
    if(serverReview.blockers>0) return res.status(400).json({success:false,message:`Hồ sơ còn ${serverReview.criteriaMissing} tiêu chí và ${serverReview.evidenceMissing} minh chứng chưa được khai báo đầy đủ.`,review:serverReview});
    const protectedPaths=new Set(Object.values(existing?.evidenceImages||{}).map(item=>item?.path).filter(Boolean));
    newlyUploaded = await uploadEvidenceImages(normalizedMssv, evidenceImages || {}, protectedPaths);
    const oldImages = existing?.evidenceImages && typeof existing.evidenceImages==='object' ? existing.evidenceImages : {};
    existingImagesForRollback = oldImages;
    const allowedKeys=currentExpectedImageKeys(data);
    const retainedOldImages={};
    for(const [key,image] of Object.entries(oldImages)){
      if(allowedKeys.has(key) && !removedKeys.has(key)) retainedOldImages[key]=image;
    }
    const mergedImages = {...retainedOldImages,...newlyUploaded};
    const cleanData = JSON.parse(JSON.stringify(data));
    cleanData.evidenceImages = {};
    const payload = {
      fullName: String(fullName).trim(),
      className: String(className).trim(),
      data: cleanData,
      evidenceImages: mergedImages,
      status: 'Chưa kiểm tra',
      note: existing?.note || '',
    };
    const row = await prisma.submission.upsert({
      where: { mssv: normalizedMssv },
      update: payload,
      create: { mssv: normalizedMssv, ...payload },
    });
    const newPaths=new Set(Object.values(newlyUploaded).map(item=>item?.path).filter(Boolean));
    const removedPaths = Object.entries(oldImages)
      .filter(([key]) => !Object.prototype.hasOwnProperty.call(mergedImages,key) || Object.prototype.hasOwnProperty.call(newlyUploaded,key))
      .map(([,image]) => image?.path)
      .filter(oldPath => oldPath && !newPaths.has(oldPath));
    await deleteStorageObjects(removedPaths);
    res.json({ success: true, id: row.id, updated: Boolean(existing), submittedAt: row.updatedAt });
  } catch (err) {
    const protectedPaths=new Set(Object.values(existingImagesForRollback||{}).map(item=>item?.path).filter(Boolean));
    await deleteStorageObjects(Object.values(newlyUploaded).map(item => item?.path).filter(path=>path && !protectedPaths.has(path)));
    console.error('[submissions] POST failed:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi khi gửi hồ sơ lên máy chủ.' });
  }
});

// Danh sách nhẹ, phân trang 10 hồ sơ; không trả JSON form và ảnh.
app.get('/api/submissions', async (req, res) => {
  if (!checkAdminPassword(getAdminPassword(req))) return res.status(403).json({ success: false, message: 'Sai mật khẩu.' });
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 10));
  const search = String(req.query.search || '').trim();
  const statusFilter=String(req.query.status||'').trim();
  const where = search ? {
    OR: [
      { fullName: { contains: search, mode: 'insensitive' } },
      { mssv: { contains: search } },
      { className: { contains: search, mode: 'insensitive' } },
    ],
  } : {};
  if(statusFilter && ALLOWED_STATUSES.has(statusFilter)) where.status=statusFilter;
  try {
    const [total, rows] = await prisma.$transaction([
      prisma.submission.count({ where }),
      prisma.submission.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, fullName: true, mssv: true, className: true, status: true, note: true, createdAt: true, updatedAt: true },
      }),
    ]);
    res.json({ success: true, submissions: rows, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (err) {
    console.error('[submissions] GET failed:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi khi đọc danh sách hồ sơ.' });
  }
});

app.get('/api/admin/dashboard', async (req,res)=>{
  if(!checkAdminPassword(getAdminPassword(req))) return res.status(403).json({success:false,message:'Sai mật khẩu.'});
  try{
    const [total,unchecked,approved,needMore]=await prisma.$transaction([
      prisma.submission.count(), prisma.submission.count({where:{status:'Chưa kiểm tra'}}), prisma.submission.count({where:{status:'Đã duyệt'}}), prisma.submission.count({where:{status:'Cần bổ sung'}})
    ]);
    res.json({success:true,summary:{total,unchecked,approved,needMore}});
  }catch(err){res.status(500).json({success:false,message:'Không tải được tổng quan.'});}
});
app.get('/api/submissions-export', async (req,res)=>{
  if(!checkAdminPassword(getAdminPassword(req))) return res.status(403).json({success:false,message:'Sai mật khẩu.'});
  try{
    const rows=await prisma.submission.findMany({orderBy:{updatedAt:'desc'}});
    const output=rows.map(row=>{
      const d=row.data||{}, h=d.hocTap||{}, tn=d.tinhNguyen||{};
      const tc1=Number(h.tinChiKy1)||0,tc2=Number(h.tinChiKy2)||0;
      const gpa=tc1+tc2>0?((Number(h.diemKy1)||0)*tc1+(Number(h.diemKy2)||0)*tc2)/(tc1+tc2):'';
      return {fullName:row.fullName,mssv:row.mssv,className:row.className,gpa:gpa===''?'':Number(gpa.toFixed(2)),volunteerDays:(tn.items||[]).reduce((a,it)=>a+(Number(it?.days)||0),0),status:row.status,note:row.note,updatedAt:row.updatedAt};
    });
    res.json({success:true,submissions:output});
  }catch(err){res.status(500).json({success:false,message:'Không xuất được danh sách.'});}
});
app.get('/api/submission-status', async (req,res)=>{
  const mssv=String(req.query.mssv||'').trim(), phone=String(req.query.phone||'').trim();
  if(!mssv||!phone) return res.status(400).json({success:false,message:'Thiếu MSSV hoặc số điện thoại.'});
  try{
    const row=await prisma.submission.findUnique({where:{mssv},select:{status:true,note:true,updatedAt:true,data:true}});
    if(!row||String(row.data?.personal?.phone||'').trim()!==phone) return res.status(404).json({success:false,message:'Không tìm thấy hồ sơ phù hợp.'});
    res.json({success:true,status:row.status,note:row.note,updatedAt:row.updatedAt});
  }catch(err){res.status(500).json({success:false,message:'Không tra cứu được hồ sơ.'});}
});

app.get('/api/submissions/:id', async (req, res) => {
  if (!checkAdminPassword(getAdminPassword(req))) return res.status(403).json({ success: false, message: 'Sai mật khẩu.' });
  try {
    const row = await prisma.submission.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ success: false, message: 'Hồ sơ không còn tồn tại.' });
    const evidenceImages = await hydrateEvidenceImageUrls(row.evidenceImages);
    res.json({ success: true, submission: { ...row, evidenceImages } });
  } catch (err) {
    console.error('[submissions] DETAIL failed:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi khi đọc chi tiết hồ sơ.' });
  }
});

app.patch('/api/submissions/:id', async (req, res) => {
  if (!checkAdminPassword(getAdminPassword(req))) return res.status(403).json({ success: false, message: 'Sai mật khẩu.' });
  const status = String(req.body?.status || '');
  const note = String(req.body?.note || '').trim().slice(0, 2000);
  if (!ALLOWED_STATUSES.has(status)) return res.status(400).json({ success: false, message: 'Trạng thái hồ sơ không hợp lệ.' });
  try {
    const row = await prisma.submission.update({ where: { id: req.params.id }, data: { status, note } });
    res.json({ success: true, submission: { id: row.id, status: row.status, note: row.note, updatedAt: row.updatedAt } });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Hồ sơ không còn tồn tại.' });
    console.error('[submissions] PATCH failed:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật hồ sơ.' });
  }
});

app.delete('/api/submissions/:id', async (req, res) => {
  if (!checkAdminPassword(getAdminPassword(req))) return res.status(403).json({ success: false, message: 'Sai mật khẩu.' });
  try {
    const row = await prisma.submission.findUnique({ where: { id: req.params.id }, select: { evidenceImages: true } });
    if (!row) return res.status(404).json({ success: false, message: 'Hồ sơ không còn tồn tại.' });
    await prisma.submission.delete({ where: { id: req.params.id } });
    await deleteStorageObjects(Object.values(row.evidenceImages || {}).map(item => item?.path));
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Hồ sơ không còn tồn tại.' });
    console.error('[submissions] DELETE failed:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa hồ sơ.' });
  }
});

verifyStorageBucket()
  .then(() => app.listen(PORT, () => console.log(`SV5T Ho So server running at http://localhost:${PORT}`)))
  .catch(err => {
    console.error('[storage] Không thể khởi động:', err.message);
    process.exitCode = 1;
  });
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });
