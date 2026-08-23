'use strict';
// Kiểm tra kết nối Cloudflare R2 thật: list -> PUT -> presign GET -> DELETE.
// Chạy bằng: npm run check:r2   (cần .env đã điền đủ 4 biến R2_*)
//
// Script trích nguyên văn khối SigV4 từ server.js nên nó kiểm tra đúng đoạn mã
// đang chạy thật, không phải một bản sao. Dùng sau khi đổi key, đổi bucket, hoặc
// để xác nhận biến môi trường trên Render đã đúng.
// Object test được tạo trong __smoke-test/ và xóa ngay sau đó.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const ROOT = process.argv[2] || path.join(__dirname, '..');
const ENV_LINE = /^([A-Z0-9_]+)="?([^"]*)"?$/;
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
  const m = ENV_LINE.exec(line.trim());
  if (m) process.env[m[1]] = m[2];
}

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
  exported: null,
};
vm.createContext(sandbox);
new vm.Script(`${block}\nexported = { signR2Request, presignR2Get };`).runInContext(sandbox);
const { signR2Request, presignR2Get } = sandbox.exported;

const key = `__smoke-test/${crypto.randomUUID()}.txt`;
const payload = Buffer.from('sv5tot r2 smoke test ' + new Date().toISOString(), 'utf8');
let failed = false;

function step(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  if (!ok) failed = true;
}

(async () => {
  // 1. ListObjectsV2 - đúng lệnh mà verifyStorageBucket() gọi lúc khởi động
  let s = signR2Request({ method: 'GET', query: { 'list-type': '2', 'max-keys': '1' } });
  let r = await fetch(s.url, { headers: s.headers });
  step('ListObjectsV2 (health check luc khoi dong)', r.ok, `HTTP ${r.status}`);
  if (!r.ok) console.log('    ' + (await r.text()).slice(0, 300));

  // 2. PUT - đường đi của uploadEvidenceImages()
  s = signR2Request({
    method: 'PUT', objectPath: key, body: payload,
    headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'private, max-age=3600' },
  });
  r = await fetch(s.url, { method: 'PUT', headers: s.headers, body: payload });
  step('PUT object (upload anh minh chung)', r.ok, `HTTP ${r.status}`);
  if (!r.ok) console.log('    ' + (await r.text()).slice(0, 300));

  // 3. Presigned GET - link trình duyệt dùng để xem ảnh
  const url = presignR2Get(key, 900);
  r = await fetch(url);
  const body = r.ok ? Buffer.from(await r.arrayBuffer()) : Buffer.alloc(0);
  step('Presigned GET (link xem anh 15 phut)', r.ok && body.equals(payload),
    r.ok ? `HTTP ${r.status}, noi dung ${body.equals(payload) ? 'khop' : 'KHONG khop'}` : `HTTP ${r.status}`);
  step('Content-Type giu dung khi tra ve', r.headers.get('content-type') === 'text/plain',
    String(r.headers.get('content-type')));

  // 4. Link không có chữ ký phải bị từ chối
  r = await fetch(`https://${sandbox.R2_HOST}/${sandbox.R2_BUCKET}/${key}`);
  // R2 trả 400 InvalidArgument (không phải 401/403) khi thiếu chữ ký - miễn là
  // không phải 2xx thì object không bị phục vụ công khai.
  step('Truy cap khong chu ky bi tu choi (bucket that su private)',
    !r.ok, `HTTP ${r.status}`);

  // 5. DELETE - đường đi của deleteStorageObjects()
  s = signR2Request({ method: 'DELETE', objectPath: key });
  r = await fetch(s.url, { method: 'DELETE', headers: s.headers });
  step('DELETE object (don dep minh chung)', r.ok || r.status === 404, `HTTP ${r.status}`);

  // 6. Xác nhận đã xóa thật
  r = await fetch(presignR2Get(key, 900));
  step('Object da bien mat sau khi xoa', r.status === 404, `HTTP ${r.status}`);

  console.log(failed ? '\n=> CO BUOC THAT BAI' : '\n=> TAT CA BUOC DEU DAT');
  process.exit(failed ? 1 : 0);
})();
