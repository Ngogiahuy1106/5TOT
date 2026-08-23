// Test phân quyền bằng REQUEST THẬT, không đọc mã nguồn dạng chuỗi.
//
// Lý do file này tồn tại: audit 23/08/2026 chạy phép thử đột biến - vô hiệu hóa
// kiểm phiên trong requireAdmin rồi chạy `npm test` - và cả 57 test vẫn xanh.
// Toàn bộ 12 route quản trị khi đó không có gì bảo vệ trước hồi quy.
//
// Không cần database thật. Bộ đếm rate limit lưu trong Postgres nên chỉ cần
// thay đúng một chỗ - prisma.$queryRaw - bằng bản giả luôn báo "còn hạn mức".
// Ngoài chỗ đó, request đi qua đúng chuỗi middleware thật, kể cả requireAdmin.
//
// Khi không gửi cookie, getAdminSession() thoát sớm và trả null trước khi chạm
// Prisma, nên requireAdmin phải trả 401 ngay. Nếu ai đó gỡ lớp kiểm tra này,
// request đi tiếp xuống tầng dữ liệu - nơi bản giả không có hàm tương ứng - và
// trả về mã khác 401, làm test dưới đây đỏ.

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.DATABASE_URL ||= 'postgresql://khong-dung-den:0@127.0.0.1:1/khong-dung-den';
const { app, prisma } = require('../server.js');

// Bản giả cho kho hạn mức: luôn là lượt đầu tiên, còn nguyên hạn mức.
prisma.$queryRaw = async () => [{ count: 1, resetAt: new Date(Date.now() + 60_000) }];
prisma.apiRateLimit = { findUnique: async () => null, deleteMany: async () => ({ count: 0 }) };

// Đúng 12 route có requireAdmin trong server.js. Thêm route quản trị mới mà quên
// thêm vào đây thì test "không sót route nào" bên dưới sẽ đỏ.
const ADMIN_ROUTES = [
  ['GET', '/api/submissions'],
  ['GET', '/api/admin/dashboard'],
  ['GET', '/api/admin/reviewers'],
  ['GET', '/api/submissions-export'],
  ['GET', '/api/submissions/khong-ton-tai'],
  ['PATCH', '/api/config'],
  ['PATCH', '/api/submissions/khong-ton-tai'],
  ['DELETE', '/api/submissions/khong-ton-tai'],
  ['POST', '/api/admin/reviewers'],
  ['DELETE', '/api/admin/reviewers/khong-ton-tai'],
  ['PUT', '/api/admin/activity-catalog'],
  ['POST', '/api/auth/logout']
];

let server, base;

test.before(async () => {
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise(resolve => server.close(resolve)));

function call(method, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...headers } }, res => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    if (method !== 'GET' && method !== 'DELETE') req.end('{}');
    else req.end();
  });
}

test('mọi route quản trị đều trả 401 khi không có cookie phiên', async () => {
  for (const [method, path] of ADMIN_ROUTES) {
    const status = await call(method, path);
    assert.equal(status, 401, `${method} ${path} phải trả 401 khi chưa đăng nhập, nhận được ${status}`);
  }
});

test('không route quản trị nào trả 2xx khi chưa đăng nhập', async () => {
  for (const [method, path] of ADMIN_ROUTES) {
    const status = await call(method, path);
    assert.ok(status < 200 || status >= 300, `${method} ${path} trả ${status} - khu quản trị đang mở cho người chưa đăng nhập`);
  }
});

test('danh sách route trong test khớp với số route requireAdmin trong server.js', () => {
  const source = require('node:fs').readFileSync(require.resolve('../server.js'), 'utf8');
  const declared = (source.match(/app\.(get|post|put|patch|delete)\([^)]*requireAdmin/g) || []).length;
  assert.equal(ADMIN_ROUTES.length, declared,
    `server.js có ${declared} route requireAdmin nhưng test chỉ phủ ${ADMIN_ROUTES.length}. Thêm route quản trị mới thì thêm vào ADMIN_ROUTES.`);
});

test('route công khai vẫn vào được mà không cần đăng nhập', async () => {
  // Không chạm database nên phải trả 400 (thiếu/sai tham số), không phải 401.
  const status = await call('GET', '/api/submission-status?mssv=khong-hop-le');
  assert.equal(status, 400, `route tra cứu công khai không được đòi đăng nhập, nhận được ${status}`);
});
