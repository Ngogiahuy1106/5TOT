'use strict';
// Đối chiếu từng ảnh minh chứng ghi trong database với file THẬT trên R2.
//
// Chạy bằng: npm run verify:storage
//
// Vì sao cần: bucket Supabase cũ và bucket R2 trùng tên (`sv5tot-evidence`), nên
// trường `bucket` lưu trong cột evidenceImages KHÔNG cho biết ảnh đang nằm ở đâu.
// Chỉ có cách hỏi thẳng R2 từng đường dẫn mới biết chắc.
//
// Chỉ gửi HEAD, không tải nội dung ảnh về, không ghi và không xóa gì.
//
// Dùng trước khi xóa bucket Supabase cũ: chừng nào còn dòng "THIẾU" thì tuyệt đối
// chưa được xóa, vì đó là ảnh chỉ còn tồn tại ở Supabase.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });
const { PrismaClient } = require('@prisma/client');

// Trích nguyên văn khối ký SigV4 từ server.js để kiểm đúng đoạn mã đang chạy
// thật, không phải một bản chép lại có thể lệch.
const SRC = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
const block = SRC.slice(SRC.indexOf('// RFC 3986:'), SRC.indexOf('function sanitizeFilePart('));
const R2_ACCOUNT_ID = (process.env.R2_ACCOUNT_ID || '').trim();
const sandbox = {
  crypto,
  R2_REGION: 'auto',
  R2_HOST: `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  R2_BUCKET: (process.env.R2_BUCKET || '').trim(),
  R2_ACCESS_KEY_ID: (process.env.R2_ACCESS_KEY_ID || '').trim(),
  R2_SECRET_ACCESS_KEY: (process.env.R2_SECRET_ACCESS_KEY || '').trim(),
};
vm.createContext(sandbox);
vm.runInContext(block + '\nglobalThis.sign = signR2Request;', sandbox);

const maskMssv = value => `${String(value).slice(0, 4)}****${String(value).slice(-2)}`;

async function existsOnR2(objectPath) {
  const signed = sandbox.sign({ method: 'HEAD', objectPath, headers: {} });
  const res = await fetch(signed.url, { method: 'HEAD', headers: signed.headers });
  return res.ok;
}

(async () => {
  for (const key of ['R2_ACCOUNT_ID', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) {
    if (!process.env[key]) { console.error(`Thiếu biến môi trường ${key} trong .env`); process.exit(1); }
  }
  const prisma = new PrismaClient();
  const rows = await prisma.submission.findMany({
    select: { mssv: true, evidenceImages: true, review: { select: { status: true } } },
  });

  let tong = 0, con = 0, thieu = 0;
  const hoSoThieu = [];

  for (const row of rows) {
    let coCuaHoSo = 0, thieuCuaHoSo = 0;
    for (const img of Object.values(row.evidenceImages || {})) {
      if (!img || !img.path) continue;
      tong++;
      if (await existsOnR2(img.path)) { con++; coCuaHoSo++; }
      else { thieu++; thieuCuaHoSo++; }
    }
    if (thieuCuaHoSo) {
      hoSoThieu.push({ mssv: maskMssv(row.mssv), status: row.review?.status || 'Chưa kiểm tra', con: coCuaHoSo, thieu: thieuCuaHoSo });
    }
  }

  console.log(`Ảnh ghi trong database : ${tong}`);
  console.log(`Có thật trên R2        : ${con}`);
  console.log(`THIẾU trên R2          : ${thieu}`);

  if (thieu) {
    console.log('\nHồ sơ có ảnh thiếu:');
    console.log('MSSV        Trạng thái        Còn  Thiếu');
    for (const h of hoSoThieu) {
      console.log(`${h.mssv.padEnd(11)} ${h.status.padEnd(17)} ${String(h.con).padStart(3)}  ${String(h.thieu).padStart(5)}`);
    }
    console.log('\nNhững ảnh này nhiều khả năng vẫn nằm ở Supabase Storage và chưa được');
    console.log('chuyển sang. Chạy `npm run migrate:r2` rồi kiểm lại.');
    console.log('TUYỆT ĐỐI CHƯA ĐƯỢC xóa bucket Supabase khi còn dòng nào ở đây.');
  } else {
    console.log('\nMọi ảnh đều có trên R2. Bucket Supabase cũ có thể xóa được.');
  }

  await prisma.$disconnect();
  process.exit(thieu ? 1 : 0);
})().catch(err => { console.error('Lỗi:', err.message); process.exit(1); });
