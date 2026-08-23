'use strict';
// Kiểm chứng lớp ký AWS Signature V4 tự viết trong server.js bằng đúng bộ
// test vector công bố trong tài liệu AWS (Signature Version 4 examples).
// Chữ ký sai nghĩa là mọi request lên Cloudflare R2 sẽ bị trả 403, nên phần
// này phải được khóa lại bằng test thay vì tin tưởng bằng mắt.
//
// Cách làm: trích nguyên văn khối hàm SigV4 từ server.js (chúng là hàm thuần,
// chỉ phụ thuộc các hằng R2_*), nạp vào một sandbox có khóa/ngày/endpoint đúng
// như ví dụ của AWS, rồi so chữ ký sinh ra với giá trị AWS công bố.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SERVER_SRC = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const BEGIN = '// RFC 3986:';
const END = 'function sanitizeFilePart(';

function extractSigV4Source() {
  const from = SERVER_SRC.indexOf(BEGIN);
  const to = SERVER_SRC.indexOf(END);
  assert.ok(from !== -1, 'Không tìm thấy điểm bắt đầu khối SigV4 trong server.js');
  assert.ok(to > from, 'Không tìm thấy điểm kết thúc khối SigV4 trong server.js');
  return SERVER_SRC.slice(from, to);
}

// Ví dụ AWS dùng virtual-hosted style (bucket nằm trong hostname) còn R2 dùng
// path-style, nên canonical URI được thay bằng đúng URI của ví dụ. Phần còn lại
// - canonical request, string to sign, dẫn xuất khóa ký, ký query string - là
// mã lấy nguyên từ server.js.
function loadSigner({ objectUri, amzDate, dateStamp }) {
  const sandbox = {
    crypto: require('node:crypto'),
    R2_REGION: 'us-east-1',
    R2_HOST: 'examplebucket.s3.amazonaws.com',
    R2_BUCKET: 'examplebucket',
    R2_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
    R2_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    exported: null,
  };
  const script = `
    ${extractSigV4Source()}
    // Ghi đè sau khi khai báo: bản khai báo sau thắng, giữ nguyên phần còn lại.
    function amzTimestamps() { return { amzDate: ${JSON.stringify(amzDate)}, dateStamp: ${JSON.stringify(dateStamp)} }; }
    function r2CanonicalUri() { return ${JSON.stringify(objectUri)}; }
    exported = { signR2Request, presignR2Get, uriEncode };
  `;
  vm.createContext(sandbox);
  new vm.Script(script).runInContext(sandbox);
  return sandbox.exported;
}

test('uriEncode theo đúng bộ ký tự unreserved của RFC 3986', () => {
  const { uriEncode } = loadSigner({ objectUri: '/', amzDate: '20130524T000000Z', dateStamp: '20130524' });
  // encodeURIComponent bỏ sót ! ' ( ) * - AWS bắt buộc phải mã hóa chúng.
  assert.strictEqual(uriEncode("!'()*"), '%21%27%28%29%2A');
  // Ký tự unreserved phải giữ nguyên.
  assert.strictEqual(uriEncode('aZ0-_.~'), 'aZ0-_.~');
  assert.strictEqual(uriEncode('test$file.text'), 'test%24file.text');
  // Dấu / được giữ khi encodeSlash=false (dùng cho khóa nhiều cấp thư mục).
  assert.strictEqual(uriEncode('2212345/hocTap/a b.jpg', false), '2212345/hocTap/a%20b.jpg');
  assert.strictEqual(uriEncode('2212345/hocTap/a b.jpg'), '2212345%2FhocTap%2Fa%20b.jpg');
});

test('presignR2Get khớp test vector "GET Object" của AWS', () => {
  const { presignR2Get } = loadSigner({
    objectUri: '/test.txt',
    amzDate: '20130524T000000Z',
    dateStamp: '20130524',
  });
  const url = presignR2Get('test.txt', 86400);
  const signature = new URL(url).searchParams.get('X-Amz-Signature');
  assert.strictEqual(signature, 'aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404');
});

test('signR2Request khớp test vector "PUT Object" của AWS', () => {
  const { signR2Request } = loadSigner({
    objectUri: '/test%24file.text',
    amzDate: '20130524T000000Z',
    dateStamp: '20130524',
  });
  const signed = signR2Request({
    method: 'PUT',
    objectPath: 'test$file.text',
    body: Buffer.from('Welcome to Amazon S3.', 'utf8'),
    headers: {
      date: 'Fri, 24 May 2013 00:00:00 GMT',
      'x-amz-storage-class': 'REDUCED_REDUNDANCY',
    },
  });
  assert.strictEqual(
    signed.headers['x-amz-content-sha256'],
    '44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072',
  );
  assert.match(
    signed.headers.Authorization,
    /Signature=98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd$/,
  );
  assert.match(
    signed.headers.Authorization,
    /SignedHeaders=date;host;x-amz-content-sha256;x-amz-date;x-amz-storage-class,/,
  );
});

test('presignR2Get gắn đủ tham số bắt buộc và không lộ secret', () => {
  const { presignR2Get } = loadSigner({
    objectUri: '/test.txt',
    amzDate: '20130524T000000Z',
    dateStamp: '20130524',
  });
  const url = new URL(presignR2Get('test.txt', 900));
  for (const key of ['X-Amz-Algorithm', 'X-Amz-Credential', 'X-Amz-Date', 'X-Amz-Expires', 'X-Amz-SignedHeaders', 'X-Amz-Signature']) {
    assert.ok(url.searchParams.get(key), `Thiếu tham số ${key}`);
  }
  assert.strictEqual(url.searchParams.get('X-Amz-Expires'), '900');
  assert.ok(!url.href.includes('wJalrXUtnFEMI'), 'URL không được chứa secret access key');
});
