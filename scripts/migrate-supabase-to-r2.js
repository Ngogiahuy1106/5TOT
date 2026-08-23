'use strict';
// Copy ảnh minh chứng từ Supabase Storage sang Cloudflare R2, GIỮ NGUYÊN đường
// dẫn object nên không phải sửa một dòng nào trong database.
//
// Chạy bằng: npm run migrate:r2
// Thêm --dry để chỉ xem sẽ copy những gì mà không ghi gì lên R2.
//
// Script này chỉ ĐỌC từ Supabase và GHI sang R2; không xóa gì ở cả hai bên, nên
// chạy lại nhiều lần vẫn an toàn (ảnh đã có trên R2 sẽ được bỏ qua).
//
// Danh sách ảnh lấy từ chính cột evidenceImages của bảng Submission chứ không
// liệt kê cả bucket, để chỉ chuyển đúng những ảnh còn có hồ sơ tham chiếu tới.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });
const { PrismaClient } = require('@prisma/client');

const DRY = process.argv.includes('--dry');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || '';

// Dùng lại đúng khối ký SigV4 trong server.js để không có bản sao thứ hai.
const SRC = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
const sandbox = {
  crypto,
  R2_REGION: 'auto',
  R2_HOST: `${(process.env.R2_ACCOUNT_ID || '').trim()}.r2.cloudflarestorage.com`,
  R2_BUCKET: (process.env.R2_BUCKET || '').trim(),
  R2_ACCESS_KEY_ID: (process.env.R2_ACCESS_KEY_ID || '').trim(),
  R2_SECRET_ACCESS_KEY: (process.env.R2_SECRET_ACCESS_KEY || '').trim(),
  exported: null,
};
vm.createContext(sandbox);
vm.runInContext(
  SRC.slice(SRC.indexOf('// RFC 3986:'), SRC.indexOf('function sanitizeFilePart(')) +
    '\nexported = { signR2Request };',
  sandbox,
);
const { signR2Request } = sandbox.exported;

function thieuCauHinh() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_STORAGE_BUCKET) missing.push('SUPABASE_STORAGE_BUCKET');
  for (const key of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET']) {
    if (!String(process.env[key] || '').trim()) missing.push(key);
  }
  return missing;
}

const encodePath = p => String(p).split('/').map(encodeURIComponent).join('/');

async function taiTuSupabase(objectPath) {
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(SUPABASE_STORAGE_BUCKET)}/${encodePath(objectPath)}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    throw new Error(`Supabase trả HTTP ${res.status}${detail ? ' - ' + detail : ''}`);
  }
  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get('content-type') || '',
  };
}

async function daCoTrenR2(objectPath) {
  const signed = signR2Request({ method: 'HEAD', objectPath });
  const res = await fetch(signed.url, { method: 'HEAD', headers: signed.headers });
  return res.status === 200 ? Number(res.headers.get('content-length') || 0) : null;
}

async function dayLenR2(objectPath, buffer, contentType) {
  const signed = signR2Request({
    method: 'PUT',
    objectPath,
    headers: { 'Content-Type': contentType || 'application/octet-stream', 'Cache-Control': 'private, max-age=3600' },
    body: buffer,
  });
  const res = await fetch(signed.url, { method: 'PUT', headers: signed.headers, body: buffer });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    throw new Error(`R2 trả HTTP ${res.status}${detail ? ' - ' + detail : ''}`);
  }
}

(async () => {
  const missing = thieuCauHinh();
  if (missing.length) {
    console.error('Thiếu biến trong .env: ' + missing.join(', '));
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const rows = await prisma.submission.findMany({
    select: { mssv: true, fullName: true, evidenceImages: true },
    orderBy: { createdAt: 'asc' },
  });

  // Gom theo đường dẫn để không copy trùng nếu hai hồ sơ cùng trỏ một object.
  const canhCopy = new Map();
  for (const row of rows) {
    for (const image of Object.values(row.evidenceImages || {})) {
      if (image?.path) canhCopy.set(image.path, { mssv: row.mssv, mime: image.mime || image.contentType || '' });
    }
  }

  console.log(`${rows.length} hồ sơ, ${canhCopy.size} ảnh cần chuyển${DRY ? '  (CHẾ ĐỘ THỬ - không ghi gì)' : ''}\n`);

  let daCo = 0, chuyenXong = 0, tongByte = 0;
  const loi = [];

  for (const [objectPath, info] of canhCopy) {
    const nhan = `${objectPath}`;
    try {
      const co = await daCoTrenR2(objectPath);
      if (co !== null) {
        daCo++;
        console.log(`  bo qua (da co tren R2)  ${nhan}`);
        continue;
      }
      const { buffer, contentType } = await taiTuSupabase(objectPath);
      if (DRY) {
        console.log(`  se copy  ${(buffer.length / 1024).toFixed(0).padStart(5)} KB  ${nhan}`);
      } else {
        await dayLenR2(objectPath, buffer, info.mime || contentType);
        const kiemTra = await daCoTrenR2(objectPath);
        if (kiemTra !== buffer.length) throw new Error(`kích thước trên R2 (${kiemTra}) khác nguồn (${buffer.length})`);
        console.log(`  xong     ${(buffer.length / 1024).toFixed(0).padStart(5)} KB  ${nhan}`);
      }
      chuyenXong++;
      tongByte += buffer.length;
    } catch (err) {
      loi.push({ objectPath, mssv: info.mssv, message: err.message });
      console.log(`  LOI      ${nhan}  -> ${err.message}`);
    }
  }

  console.log('\n--- Tổng kết ---');
  console.log(`Đã có sẵn trên R2 : ${daCo}`);
  console.log(`${DRY ? 'Sẽ chuyển' : 'Chuyển xong'}        : ${chuyenXong} (${(tongByte / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`Lỗi               : ${loi.length}`);
  for (const e of loi) console.log(`   ${e.mssv}  ${e.objectPath}  ${e.message}`);

  await prisma.$disconnect();
  process.exit(loi.length ? 1 : 0);
})().catch(err => {
  console.error('LOI:', err.message);
  process.exit(1);
});
