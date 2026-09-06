'use strict';
// Ký AWS Signature V4 cho Cloudflare R2. Tách riêng khỏi server.js để các script
// trong scripts/ và bộ test dùng lại bằng require, thay vì cắt mã nguồn theo
// chuỗi mốc - cách cũ gãy im lặng mỗi khi sửa server.js.
//
// R2 không có endpoint "sign" sẵn nên mọi request phải tự ký. Bù lại, việc tạo
// link xem ảnh (presign) là phép tính cục bộ: không tốn round-trip mạng và không
// tính vào quota operation của R2.

const crypto = require('node:crypto');

// RFC 3986: AWS chỉ để nguyên A-Z a-z 0-9 - _ . ~ ; encodeURIComponent bỏ sót ! ' ( ) *
function uriEncode(value, encodeSlash = true) {
  let out = encodeURIComponent(String(value)).replace(/[!'()*]/g, ch => '%' + ch.charCodeAt(0).toString(16).toUpperCase());
  if (!encodeSlash) out = out.replace(/%2F/g, '/');
  return out;
}

const sha256Hex = data => crypto.createHash('sha256').update(data).digest('hex');

function amzTimestamps() {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

function canonicalQueryString(query) {
  return Object.keys(query).sort().map(key => `${uriEncode(key)}=${uriEncode(query[key])}`).join('&');
}

// `timestamps` và `canonicalUri` chỉ để test bơm giá trị cố định vào: bộ test
// vector của AWS dùng ngày giờ cho sẵn và virtual-hosted style URI, còn R2 dùng
// path-style. Chạy thật thì luôn dùng mặc định.
function createR2Signer({
  accountId = '',
  accessKeyId = '',
  secretAccessKey = '',
  bucket = '',
  region = 'auto',
  host,
  timestamps = amzTimestamps,
  canonicalUri,
} = {}) {
  const resolvedHost = host || (accountId ? `${accountId}.r2.cloudflarestorage.com` : '');

  // R2 dùng path-style: https://<account>.r2.cloudflarestorage.com/<bucket>/<key>
  const uriOf = canonicalUri || (objectPath => `/${uriEncode(bucket)}${objectPath ? `/${uriEncode(objectPath, false)}` : ''}`);

  function signingKey(dateStamp) {
    const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
    return hmac(hmac(hmac(hmac('AWS4' + secretAccessKey, dateStamp), region), 's3'), 'aws4_request');
  }

  // Ký bằng Authorization header - dùng cho request đi từ server (PUT/DELETE/GET).
  function signRequest({ method, objectPath = '', query = {}, headers = {}, body = null }) {
    const { amzDate, dateStamp } = timestamps();
    const payloadHash = sha256Hex(body === null ? '' : body);
    const table = {};
    for (const [name, value] of Object.entries({ ...headers, host: resolvedHost, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate })) {
      table[name.toLowerCase()] = String(value).trim().replace(/\s+/g, ' ');
    }
    const names = Object.keys(table).sort();
    const canonicalHeaders = names.map(name => `${name}:${table[name]}\n`).join('');
    const signedHeaders = names.join(';');
    const canonicalQuery = canonicalQueryString(query);
    const uri = uriOf(objectPath);
    const canonicalRequest = [method, uri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const scope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
    const signature = crypto.createHmac('sha256', signingKey(dateStamp)).update(stringToSign).digest('hex');
    return {
      url: `https://${resolvedHost}${uri}${canonicalQuery ? `?${canonicalQuery}` : ''}`,
      headers: {
        ...headers,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      },
    };
  }

  // Ký vào query string - link tạm cho trình duyệt tải ảnh trực tiếp từ R2.
  function presignGet(objectPath, expiresIn) {
    const { amzDate, dateStamp } = timestamps();
    const scope = `${dateStamp}/${region}/s3/aws4_request`;
    const canonicalQuery = canonicalQueryString({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${accessKeyId}/${scope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresIn),
      'X-Amz-SignedHeaders': 'host',
    });
    const uri = uriOf(objectPath);
    const canonicalRequest = ['GET', uri, canonicalQuery, `host:${resolvedHost}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
    const signature = crypto.createHmac('sha256', signingKey(dateStamp)).update(stringToSign).digest('hex');
    return `https://${resolvedHost}${uri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  }

  return { host: resolvedHost, region, bucket, signRequest, presignGet };
}

module.exports = { createR2Signer, uriEncode, sha256Hex, amzTimestamps, canonicalQueryString };
