'use strict';
// Kiểm chứng lớp ký AWS Signature V4 trong lib/r2-signing.js bằng đúng bộ test
// vector công bố trong tài liệu AWS (Signature Version 4 examples). Chữ ký sai
// nghĩa là mọi request lên Cloudflare R2 bị trả 403, nên phần này phải được khóa
// lại bằng test thay vì tin tưởng bằng mắt.
//
// Ví dụ của AWS dùng virtual-hosted style (bucket nằm trong hostname) còn R2 dùng
// path-style, nên test bơm sẵn `host`, `canonicalUri` và `timestamps` của ví dụ.
// Toàn bộ phần còn lại - canonical request, string to sign, dẫn xuất khóa ký -
// là đúng mã đang chạy thật.

const test = require('node:test');
const assert = require('node:assert');
const { createR2Signer, uriEncode } = require('../lib/r2-signing');

const AWS_EXAMPLE = {
  host: 'examplebucket.s3.amazonaws.com',
  region: 'us-east-1',
  bucket: 'examplebucket',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
};

function signerFor(objectUri) {
  return createR2Signer({
    ...AWS_EXAMPLE,
    timestamps: () => ({ amzDate: '20130524T000000Z', dateStamp: '20130524' }),
    canonicalUri: () => objectUri,
  });
}

test('uriEncode theo đúng bộ ký tự unreserved của RFC 3986', () => {
  // encodeURIComponent bỏ sót ! ' ( ) * - AWS bắt buộc phải mã hóa chúng.
  assert.strictEqual(uriEncode("!'()*"), '%21%27%28%29%2A');
  // Ký tự unreserved phải giữ nguyên.
  assert.strictEqual(uriEncode('aZ0-_.~'), 'aZ0-_.~');
  assert.strictEqual(uriEncode('test$file.text'), 'test%24file.text');
  // Dấu / được giữ khi encodeSlash=false (dùng cho khóa nhiều cấp thư mục).
  assert.strictEqual(uriEncode('2212345/hocTap/a b.jpg', false), '2212345/hocTap/a%20b.jpg');
  assert.strictEqual(uriEncode('2212345/hocTap/a b.jpg'), '2212345%2FhocTap%2Fa%20b.jpg');
});

test('presignGet khớp test vector "GET Object" của AWS', () => {
  const url = signerFor('/test.txt').presignGet('test.txt', 86400);
  const signature = new URL(url).searchParams.get('X-Amz-Signature');
  assert.strictEqual(signature, 'aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404');
});

test('signRequest khớp test vector "PUT Object" của AWS', () => {
  const signed = signerFor('/test%24file.text').signRequest({
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

test('presignGet gắn đủ tham số bắt buộc và không lộ secret', () => {
  const url = new URL(signerFor('/test.txt').presignGet('test.txt', 900));
  for (const key of ['X-Amz-Algorithm', 'X-Amz-Credential', 'X-Amz-Date', 'X-Amz-Expires', 'X-Amz-SignedHeaders', 'X-Amz-Signature']) {
    assert.ok(url.searchParams.get(key), `Thiếu tham số ${key}`);
  }
  assert.strictEqual(url.searchParams.get('X-Amz-Expires'), '900');
  assert.ok(!url.href.includes('wJalrXUtnFEMI'), 'URL không được chứa secret access key');
});

test('mặc định dùng path-style của R2: bucket nằm trong đường dẫn', () => {
  // Không bơm canonicalUri/host: đây là đúng cấu hình chạy thật.
  const signer = createR2Signer({
    accountId: 'abc123',
    accessKeyId: 'key',
    secretAccessKey: 'secret',
    bucket: 'sv5tot-evidence',
  });
  assert.strictEqual(signer.host, 'abc123.r2.cloudflarestorage.com');
  const url = new URL(signer.presignGet('202412345/hocTap/anh.jpg', 900));
  assert.strictEqual(url.hostname, 'abc123.r2.cloudflarestorage.com');
  assert.strictEqual(url.pathname, '/sv5tot-evidence/202412345/hocTap/anh.jpg');
});
