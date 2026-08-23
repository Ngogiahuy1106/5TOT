// server.js - sv5tot-hoso
require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { PrismaClient, Prisma } = require('@prisma/client');
const SV5TRules = require('./public/js/shared-rules.js');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ALLOWED_STATUSES = new Set(['Chưa kiểm tra', 'Đã duyệt', 'Cần bổ sung']);
const R2_ACCOUNT_ID = (process.env.R2_ACCOUNT_ID || '').trim();
const R2_ACCESS_KEY_ID = (process.env.R2_ACCESS_KEY_ID || '').trim();
const R2_SECRET_ACCESS_KEY = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
const R2_BUCKET = (process.env.R2_BUCKET || '').trim();
const R2_REGION = 'auto';
const R2_HOST = R2_ACCOUNT_ID ? `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '';
// Ghim CSP vao dung endpoint cua tai khoan nay. Dung *.r2.cloudflarestorage.com
// se cho phep bucket cua bat ky tai khoan Cloudflare nao khac tro anh vao trang.
const R2_CSP_ORIGIN = R2_HOST ? `https://${R2_HOST}` : '';
const STORAGE_SIGNED_URL_TTL = 15 * 60;
// Tran thoi gian cho mot lo xoa chay dong bo trong request; qua han thi phan
// con lai chuyen sang hang doi StorageCleanupJob.
const STORAGE_DELETE_DEADLINE_MS = 10_000;
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SIGNED_URL_CACHE = new Map();
const STORAGE_WORKER_ID = crypto.randomUUID();
let storageReady = false;
let storageLastError = '';
let healthDbCache={ready:false,checkedAt:0};

app.set('trust proxy', 1);

if (!ADMIN_PASSWORD) {
  console.warn('[WARN] ADMIN_PASSWORD is not set in .env - admin actions will always be rejected until it is set.');
}

app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  if(process.env.NODE_ENV==='production'||process.env.RENDER) res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', `default-src 'self'; img-src 'self' data: blob:${R2_CSP_ORIGIN ? ' ' + R2_CSP_ORIGIN : ''}; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; connect-src 'self'${R2_CSP_ORIGIN ? ' ' + R2_CSP_ORIGIN : ''}; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';`);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// Render/monitoring có thể kiểm tra cả DB và trạng thái Storage mà không cần
// đăng nhập. Endpoint không trả URL, khóa hay chi tiết nhạy cảm.
app.get('/api/health', async (req,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{
    if(Date.now()-healthDbCache.checkedAt>5_000){await prisma.$queryRaw`SELECT 1`;healthDbCache={ready:true,checkedAt:Date.now()};}
    const healthy=healthDbCache.ready&&storageReady;
    res.status(healthy?200:503).json({success:healthy,database:healthDbCache.ready?'ready':'unavailable',storage:storageReady?'ready':'unavailable'});
  }catch(err){
    healthDbCache={ready:false,checkedAt:Date.now()};
    res.status(503).json({success:false,database:'unavailable',storage:storageReady?'ready':'unavailable'});
  }
});

function parseCookies(req){
  const raw=String(req.headers.cookie||'');
  const out={};
  raw.split(';').forEach(part=>{ const i=part.indexOf('='); if(i<0)return;try{out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim());}catch{/* bỏ cookie sai định dạng */} });
  return out;
}
function sessionTokenHash(token){
  return crypto.createHash('sha256').update(String(token||'')).digest('hex');
}
async function cleanupAdminSessions(){
  await prisma.adminSession.deleteMany({where:{expiresAt:{lte:new Date()}}});
}
async function getAdminSession(req){
  const token=parseCookies(req).sv5t_admin_session;
  if(!token) return null;
  const tokenHash=sessionTokenHash(token);
  const session=await prisma.adminSession.findUnique({where:{tokenHash}});
  if(!session||session.expiresAt<=new Date()){
    if(session) await prisma.adminSession.delete({where:{tokenHash}}).catch(()=>{});
    return null;
  }
  return {token,tokenHash,...session};
}
async function requireAdmin(req,res,next){
  try{
    const session=await getAdminSession(req);
    if(!session) return res.status(401).json({success:false,message:'Phiên quản trị đã hết hạn. Vui lòng đăng nhập lại.'});
    req.adminSession=session;next();
  }catch(err){console.error('[auth] SESSION failed:',err.message);res.status(503).json({success:false,message:'Không kiểm tra được phiên quản trị.'});}
}
function setAdminSessionCookie(res,token){
  const secure=process.env.NODE_ENV==='production'||Boolean(process.env.RENDER);
  res.setHeader('Set-Cookie',`sv5t_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(ADMIN_SESSION_TTL_MS/1000)}${secure?'; Secure':''}`);
}
function clearAdminSessionCookie(res){
  const secure=process.env.NODE_ENV==='production'||Boolean(process.env.RENDER);
  res.setHeader('Set-Cookie',`sv5t_admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure?'; Secure':''}`);
}
function shortHash(value){
  return crypto.createHash('sha256').update(String(value??'unknown')).digest('hex').slice(0,32);
}
function clientIpHash(req){
  return shortHash(req.ip||req.socket?.remoteAddress||'unknown');
}
// Nhiều sinh viên trong ký túc xá/wifi trường ra Internet bằng CÙNG một IP NAT.
// Vì vậy hạn mức "chống spam một người" phải khóa theo danh tính (MSSV), còn hạn
// mức theo IP chỉ giữ ở mức chống flood để không chặn nhầm cả phòng.
function studentKeyOf(req){
  const mssv=String(req.body?.mssv||req.query?.mssv||'').trim();
  return mssv?shortHash(mssv):'no-id';
}
async function touchRateLimit(key,windowMs,{peek=false}={}){
  const now=Date.now(),nowDate=new Date(now),newResetAt=new Date(now+windowMs);
  if(peek){
    const row=await prisma.apiRateLimit.findUnique({where:{key}});
    if(!row||row.resetAt<=nowDate) return {count:0,resetAt:newResetAt};
    return {count:Number(row.count),resetAt:row.resetAt};
  }
  const rows=await prisma.$queryRaw(Prisma.sql`
    INSERT INTO "ApiRateLimit" ("key","count","resetAt","updatedAt")
    VALUES (${key},1,${newResetAt},${nowDate})
    ON CONFLICT ("key") DO UPDATE SET
      "count"=CASE WHEN "ApiRateLimit"."resetAt"<=${nowDate} THEN 1 ELSE "ApiRateLimit"."count"+1 END,
      "resetAt"=CASE WHEN "ApiRateLimit"."resetAt"<=${nowDate} THEN ${newResetAt} ELSE "ApiRateLimit"."resetAt" END,
      "updatedAt"=${nowDate}
    RETURNING "count","resetAt"
  `);
  return {count:Number(rows[0].count),resetAt:rows[0].resetAt};
}
function rateLimit({windowMs,max,prefix,keyOf,label}){
  return async (req,res,next)=>{
    const suffix=typeof keyOf==='function'?keyOf(req):clientIpHash(req);
    const key=`${prefix}:${suffix}`;
    try{
      const item=await touchRateLimit(key,windowMs);
      res.setHeader('X-RateLimit-Limit',String(max));
      res.setHeader('X-RateLimit-Remaining',String(Math.max(0,max-item.count)));
      if(item.count>max){
        const retry=Math.max(1,Math.ceil((new Date(item.resetAt).getTime()-Date.now())/1000));
        res.setHeader('Retry-After',String(retry));
        return res.status(429).json({success:false,code:'RATE_LIMITED',scope:'ratelimit',message:`Bạn ${label||'thao tác'} quá nhiều lần trong thời gian ngắn. Vui lòng chờ khoảng ${retry} giây rồi thử lại.`});
      }
      next();
    }catch(err){console.error('[rate-limit] failed:',err.message);res.status(503).json({success:false,code:'RATE_LIMIT_STORE',scope:'database',message:'Không kiểm tra được hạn mức thao tác vì cơ sở dữ liệu đang bận. Vui lòng thử lại sau ít phút.'});}
  };
}
// Hạn mức theo IP nới rộng: chỉ để chặn flood, không phải để chặn người dùng thật.
const globalApiLimit=rateLimit({windowMs:60_000,max:600,prefix:'api',label:'gửi yêu cầu'});
// Đăng nhập: chỉ ĐẾM LẦN SAI (xử lý trong chính route /api/auth), đăng nhập đúng
// không tiêu tốn hạn mức, nên cả Ban ngồi chung một phòng vẫn đăng nhập được.
const AUTH_FAIL_WINDOW_MS=15*60_000;
const AUTH_FAIL_MAX=10;
const reviewLimit=rateLimit({windowMs:5*60_000,max:120,prefix:'review',keyOf:req=>`${clientIpHash(req)}:${studentKeyOf(req)}`,label:'kiểm tra hồ sơ'});
const submitLimit=rateLimit({windowMs:10*60_000,max:8,prefix:'submit',keyOf:studentKeyOf,label:'gửi hồ sơ'});
const submitIpLimit=rateLimit({windowMs:10*60_000,max:120,prefix:'submit-ip',label:'gửi hồ sơ'});
const lookupLimit=rateLimit({windowMs:5*60_000,max:120,prefix:'lookup',keyOf:req=>`${clientIpHash(req)}:${studentKeyOf(req)}`,label:'tra cứu'});
const deleteConfirmLimit=rateLimit({windowMs:15*60_000,max:10,prefix:'delete-confirm',label:'xác nhận xóa'});
app.use('/api',(req,res,next)=>{res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, private');res.setHeader('Pragma','no-cache');next();});
app.use(express.json({ limit: '25mb' }));
// Middleware gắn "scope" cho mọi phản hồi lỗi để frontend biết lỗi thuộc nhóm nào
// (dữ liệu nhập / quyền / mạng / máy chủ / kho ảnh) mà không phải đoán theo status.
app.use('/api',(req,res,next)=>{
  const originalJson=res.json.bind(res);
  res.json=body=>{
    if(body&&typeof body==='object'&&body.success===false&&!body.scope){
      const status=res.statusCode;
      body.scope=status===401||status===403?'permission'
        :status===404?'notfound'
        :status===409?'conflict'
        :status===429?'ratelimit'
        :status>=500?(status===503?'unavailable':'server')
        :'input';
    }
    return originalJson(body);
  };
  next();
});
app.use('/api',globalApiLimit);
const limiterCleanup=setInterval(async()=>{const now=Date.now();try{await Promise.all([cleanupAdminSessions(),prisma.apiRateLimit.deleteMany({where:{resetAt:{lte:new Date(now-5*60_000)}}})]);}catch(err){console.error('[cleanup] session/rate:',err.message);}for(const [key,item] of SIGNED_URL_CACHE.entries())if(!item||item.expiresAt<=now)SIGNED_URL_CACHE.delete(key);},5*60_000);
if(typeof limiterCleanup.unref==='function') limiterCleanup.unref();
const storageCleanup=setInterval(()=>processStorageCleanupJobs().catch(err=>console.error('[storage] cleanup worker:',err.message)),60_000);
if(typeof storageCleanup.unref==='function') storageCleanup.unref();

// ---- Cloudflare R2 (S3-compatible, AWS Signature V4) ------------------------
// R2 không có endpoint "sign" sẵn như Supabase Storage: mọi request phải tự ký
// bằng SigV4. Bù lại, việc tạo link xem ảnh (presign) là phép tính cục bộ nên
// không tốn round-trip mạng và không tính vào quota operation của R2.
function storageIsConfigured() {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET);
}

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

function r2SigningKey(dateStamp) {
  const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
  return hmac(hmac(hmac(hmac('AWS4' + R2_SECRET_ACCESS_KEY, dateStamp), R2_REGION), 's3'), 'aws4_request');
}

function canonicalQueryString(query) {
  return Object.keys(query).sort().map(key => `${uriEncode(key)}=${uriEncode(query[key])}`).join('&');
}

// R2 dùng path-style: https://<account>.r2.cloudflarestorage.com/<bucket>/<key>
function r2CanonicalUri(objectPath) {
  return `/${uriEncode(R2_BUCKET)}${objectPath ? `/${uriEncode(objectPath, false)}` : ''}`;
}

// Ký bằng Authorization header - dùng cho request đi từ server (PUT/DELETE/GET).
function signR2Request({ method, objectPath = '', query = {}, headers = {}, body = null }) {
  const { amzDate, dateStamp } = amzTimestamps();
  const payloadHash = sha256Hex(body === null ? '' : body);
  const table = {};
  for (const [name, value] of Object.entries({ ...headers, host: R2_HOST, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate })) {
    table[name.toLowerCase()] = String(value).trim().replace(/\s+/g, ' ');
  }
  const names = Object.keys(table).sort();
  const canonicalHeaders = names.map(name => `${name}:${table[name]}\n`).join('');
  const signedHeaders = names.join(';');
  const canonicalQuery = canonicalQueryString(query);
  const canonicalUri = r2CanonicalUri(objectPath);
  const canonicalRequest = [method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${dateStamp}/${R2_REGION}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
  const signature = crypto.createHmac('sha256', r2SigningKey(dateStamp)).update(stringToSign).digest('hex');
  return {
    url: `https://${R2_HOST}${canonicalUri}${canonicalQuery ? `?${canonicalQuery}` : ''}`,
    headers: {
      ...headers,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

// Ký vào query string - link tạm cho trình duyệt tải ảnh trực tiếp từ R2.
function presignR2Get(objectPath, expiresIn) {
  const { amzDate, dateStamp } = amzTimestamps();
  const scope = `${dateStamp}/${R2_REGION}/s3/aws4_request`;
  const canonicalQuery = canonicalQueryString({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${R2_ACCESS_KEY_ID}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  });
  const canonicalUri = r2CanonicalUri(objectPath);
  const canonicalRequest = ['GET', canonicalUri, canonicalQuery, `host:${R2_HOST}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
  const signature = crypto.createHmac('sha256', r2SigningKey(dateStamp)).update(stringToSign).digest('hex');
  return `https://${R2_HOST}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

async function storageFetch(url,options={},timeoutMs=15_000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  if(typeof timer.unref==='function') timer.unref();
  try{return await fetch(url,{...options,signal:controller.signal});}
  finally{clearTimeout(timer);}
}

function sanitizeFilePart(value) {
  return String(value || 'file').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'file';
}
const MAX_EVIDENCE_IMAGE_BYTES=8*1024*1024;
const MAX_TOTAL_EVIDENCE_BYTES=16*1024*1024;
function estimateDataUrlDecodedBytes(dataUrl){
  const match=/^data:([^;,]+);base64,(.+)$/s.exec(String(dataUrl||''));
  if(!match) return null;
  const payload=match[2].replace(/\s/g,'');
  if(!payload||payload.length%4===1||!/^[A-Za-z0-9+/]*={0,2}$/.test(payload)) return null;
  const padding=payload.endsWith('==')?2:payload.endsWith('=')?1:0;
  return Math.max(0,Math.floor(payload.length*3/4)-padding);
}
function readImageDimensions(buffer,contentType){
  if(contentType==='image/png'&&buffer.length>=24) return {width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)};
  if(contentType==='image/jpeg'){
    let offset=2;
    while(offset+8<buffer.length){
      if(buffer[offset]!==0xff){offset++;continue;}
      const marker=buffer[offset+1];offset+=2;
      if(marker===0xd8||marker===0xd9||(marker>=0xd0&&marker<=0xd7))continue;
      if(offset+2>buffer.length)break;
      const length=buffer.readUInt16BE(offset);if(length<2||offset+length>buffer.length)break;
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&length>=7)return {height:buffer.readUInt16BE(offset+3),width:buffer.readUInt16BE(offset+5)};
      offset+=length;
    }
  }
  if(contentType==='image/webp'&&buffer.length>=30){
    const kind=buffer.subarray(12,16).toString('ascii');
    if(kind==='VP8X')return {width:1+buffer.readUIntLE(24,3),height:1+buffer.readUIntLE(27,3)};
    if(kind==='VP8 '&&buffer.subarray(23,26).equals(Buffer.from([0x9d,0x01,0x2a])))return {width:buffer.readUInt16LE(26)&0x3fff,height:buffer.readUInt16LE(28)&0x3fff};
    if(kind==='VP8L'&&buffer.length>=25&&buffer[20]===0x2f){const b1=buffer[21],b2=buffer[22],b3=buffer[23],b4=buffer[24];return {width:1+(b1|((b2&0x3f)<<8)),height:1+((b2>>6)|(b3<<2)|((b4&0x0f)<<10))};}
  }
  return null;
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!match) throw new Error('Ảnh minh chứng không đúng định dạng base64.');
  const contentType = match[1].toLowerCase();
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!allowedTypes.has(contentType)) {
    throw new Error('Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.');
  }
  const estimatedBytes=estimateDataUrlDecodedBytes(dataUrl);
  if(estimatedBytes===null) throw new Error('Dữ liệu base64 của ảnh không hợp lệ.');
  if(estimatedBytes>MAX_EVIDENCE_IMAGE_BYTES) throw new Error('Mỗi ảnh sau khi nén không được vượt quá 8 MB.');
  const buffer = Buffer.from(match[2].replace(/\s/g,''), 'base64');
  if (!buffer.length) throw new Error('Tệp ảnh rỗng.');
  if (buffer.length > MAX_EVIDENCE_IMAGE_BYTES) throw new Error('Mỗi ảnh sau khi nén không được vượt quá 8 MB.');
  const signatures={
    'image/jpeg':buffer.length>=3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff,
    'image/png':buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])),
    'image/webp':buffer.length>=12&&buffer.subarray(0,4).toString('ascii')==='RIFF'&&buffer.subarray(8,12).toString('ascii')==='WEBP'
  };
  if(!signatures[contentType]) throw new Error('Nội dung tệp không khớp định dạng ảnh đã khai báo.');
  const dimensions=readImageDimensions(buffer,contentType);
  if(!dimensions||dimensions.width<1||dimensions.height<1) throw new Error('Không đọc được kích thước ảnh hoặc tệp ảnh đã bị hỏng.');
  if(dimensions.width>8000||dimensions.height>8000||dimensions.width*dimensions.height>20_000_000) throw new Error('Kích thước ảnh quá lớn. Vui lòng dùng ảnh tối đa 20 megapixel và không quá 8000 px mỗi cạnh.');
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
    throw new Error('Thiếu R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY hoặc R2_BUCKET trong .env.');
  }
  // ListObjectsV2 với max-keys=1: xác nhận bucket tồn tại và token đủ quyền mà
  // không tải về dữ liệu thật. R2 không cho đọc trạng thái public qua S3 API
  // (public access cấu hình bằng r2.dev / custom domain) nên bỏ cảnh báo public.
  const signed = signR2Request({ method: 'GET', query: { 'list-type': '2', 'max-keys': '1' } });
  const check = await storageFetch(signed.url, { headers: signed.headers });
  if (!check.ok) {
    const detail = (await check.text().catch(() => '')).slice(0, 400);
    if (check.status === 404) {
      throw new Error(`Bucket "${R2_BUCKET}" chưa tồn tại. Hãy tạo bucket private này trước trong Cloudflare R2.`);
    }
    if (check.status === 401 || check.status === 403) {
      throw new Error(`API token R2 bị từ chối hoặc không đủ quyền trên bucket "${R2_BUCKET}". Kiểm tra lại Access Key ID / Secret Access Key và phạm vi của token.`);
    }
    throw new Error(`Không kiểm tra được bucket "${R2_BUCKET}": ${detail || check.status}`);
  }
  console.log(`[storage] Đã kết nối bucket R2: ${R2_BUCKET}`);
}

async function uploadEvidenceImages(mssv, evidenceImages, protectedPaths = new Set()) {
  if (!storageIsConfigured()) throw new Error('Cloudflare R2 chưa được cấu hình đầy đủ trên máy chủ.');
  const result = {};
  const uploadedPaths = [];
  try {
    for (const [key, image] of Object.entries(evidenceImages || {})) {
      if (!image?.dataBase64) continue;
      const { contentType, buffer } = parseDataUrl(image.dataBase64);
      const originalName = sanitizeFilePart(image.name || 'anh.jpg');
      const folder = evidenceFolder(key);
      const extension = storageExtension(contentType);
      const version = crypto.randomUUID().replace(/-/g,'').slice(0,12);
      const objectName = `${sanitizeFilePart(key)}-${version}.${extension}`;
      const objectPath = `${sanitizeFilePart(mssv)}/${folder}/${objectName}`;
      // Không cần cờ chống ghi đè như x-upsert:false của Supabase: objectPath đã
      // chứa version ngẫu nhiên 12 ký tự hex nên không thể trùng khóa đang có.
      const signed = signR2Request({
        method: 'PUT',
        objectPath,
        headers: { 'Content-Type': contentType, 'Cache-Control': 'private, max-age=3600' },
        body: buffer,
      });
      const response = await storageFetch(signed.url, { method: 'PUT', headers: signed.headers, body: buffer });
      if (!response.ok) {
        const detail = await response.text();
        const error=new Error(`Không upload được ảnh ${originalName}: ${detail || response.status}`);error.code='STORAGE_UPLOAD';throw error;
      }
      uploadedPaths.push(objectPath);
      result[key] = {
        bucket: R2_BUCKET,
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
    await deleteStorageObjects(uploadedPaths.filter(path => !protectedPaths.has(path)),{queueOnFailure:true});
    throw err;
  }
}

async function enqueueStorageCleanup(paths,lastError){
  for(const objectPath of [...new Set((paths||[]).filter(Boolean))]){
    await prisma.storageCleanupJob.upsert({
      where:{path:objectPath},
      update:{lastError:String(lastError||'').slice(0,1000),nextAttemptAt:new Date(),lockedAt:null,lockedBy:''},
      create:{path:objectPath,lastError:String(lastError||'').slice(0,1000)}
    }).catch(err=>console.error('[storage] Không ghi được cleanup job:',err.message));
  }
}
// Trả về '' nếu xóa xong, ngược lại trả về mô tả lỗi cuối cùng.
async function deleteOneStorageObject(objectPath){
  let lastError='';
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const signed=signR2Request({method:'DELETE',objectPath});
      const response=await storageFetch(signed.url,{method:'DELETE',headers:signed.headers});
      // S3/R2 trả 204 kể cả khi object đã không còn - coi như xóa thành công.
      if(response.ok||response.status===404) return '';
      lastError=`${response.status} ${(await response.text().catch(()=>'')).slice(0,300)}`;
    }catch(err){ lastError=err.message; }
    if(attempt<3) await new Promise(r=>setTimeout(r,150*attempt));
  }
  return lastError||'unknown error';
}
// R2 không có API xóa theo mảng prefix như Supabase (một request xóa cả lô);
// DeleteObjects của S3 cần body XML + Content-MD5 nên ở đây xóa từng object.
//
// Một hồ sơ có thể có tới 80 ảnh và tới 160 khóa cần xóa (xem phần validate bên
// dưới), nên xóa tuần tự sẽ biến một sự cố R2 thành hàng giờ treo request. Vì
// vậy chạy tối đa 5 luồng song song, và sau STORAGE_DELETE_DEADLINE_MS thì
// ngừng nhận object mới - phần chưa xong được đẩy sang hàng đợi
// StorageCleanupJob để worker nền dọn sau. Hạn chót chỉ chặn việc BẮT ĐẦU một
// object mới chứ không cắt ngang object đang chạy, nên lời gọi chỉ có một
// object (worker dọn dẹp) không bị ảnh hưởng.
async function deleteStorageObjects(paths,{throwOnFailure=false,queueOnFailure=false}={}) {
  const objectPaths = [...new Set((paths || []).filter(Boolean))];
  if (!objectPaths.length || !storageIsConfigured()) return true;
  const deadline=Date.now()+STORAGE_DELETE_DEADLINE_MS;
  const failed=[];let lastError='',cursor=0;
  async function worker(){
    while(cursor<objectPaths.length){
      const objectPath=objectPaths[cursor++];
      if(Date.now()>=deadline){
        failed.push(objectPath);
        lastError=lastError||'Quá hạn chờ xóa; phần còn lại đã chuyển sang hàng đợi dọn dẹp.';
        continue;
      }
      const err=await deleteOneStorageObject(objectPath);
      if(err){failed.push(objectPath);lastError=err;}
      else SIGNED_URL_CACHE.delete(objectPath);
    }
  }
  await Promise.all(Array.from({length:Math.min(5,objectPaths.length)},()=>worker()));
  if(!failed.length) return true;
  console.error('[storage] DELETE failed:',lastError);
  if(queueOnFailure) await enqueueStorageCleanup(failed,lastError);
  if(throwOnFailure) throw new Error('Không xóa được tệp minh chứng trên Storage.');
  return false;
}
async function claimStorageCleanupJobs(){
  const staleAt=new Date(Date.now()-5*60_000),now=new Date();
  return prisma.$transaction(async tx=>{
    const jobs=await tx.$queryRaw(Prisma.sql`
      SELECT "path","attempts","nextAttemptAt","lastError"
      FROM "StorageCleanupJob"
      WHERE "nextAttemptAt"<=${now} AND ("lockedAt" IS NULL OR "lockedAt"<${staleAt})
      ORDER BY "nextAttemptAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 30
    `);
    if(jobs.length) await tx.storageCleanupJob.updateMany({
      where:{path:{in:jobs.map(job=>job.path)}},data:{lockedAt:now,lockedBy:STORAGE_WORKER_ID}
    });
    return jobs;
  });
}
async function processStorageCleanupJobs(){
  const jobs=await claimStorageCleanupJobs();
  for(const job of jobs){
    try{
      await deleteStorageObjects([job.path],{throwOnFailure:true,queueOnFailure:false});
      await prisma.storageCleanupJob.deleteMany({where:{path:job.path,lockedBy:STORAGE_WORKER_ID}});
    }catch(err){
      const attempts=job.attempts+1,delay=Math.min(24*60*60_000,Math.max(60_000,2**Math.min(attempts,10)*60_000));
      await prisma.storageCleanupJob.updateMany({where:{path:job.path,lockedBy:STORAGE_WORKER_ID},data:{attempts,nextAttemptAt:new Date(Date.now()+delay),lastError:String(err.message||'').slice(0,1000),lockedAt:null,lockedBy:''}}).catch(()=>{});
    }
  }
}

async function createSignedUrl(objectPath) {
  if (!objectPath || !storageIsConfigured()) return '';
  const cached=SIGNED_URL_CACHE.get(objectPath);
  if(cached && cached.expiresAt>Date.now()+60_000) return cached.url;
  // Presign là phép tính cục bộ nên không thể lỗi mạng; vẫn giữ cache để cùng
  // một ảnh nhận cùng một URL trong 15 phút, nhờ đó trình duyệt cache được ảnh
  // thay vì tải lại từ R2 mỗi lần mở trang.
  try{
    const url=presignR2Get(objectPath,STORAGE_SIGNED_URL_TTL);
    SIGNED_URL_CACHE.set(objectPath,{url,expiresAt:Date.now()+STORAGE_SIGNED_URL_TTL*1000});
    return url;
  }catch(err){console.error('[storage] SIGN failed:',err.message);return '';}
}

async function hydrateEvidenceImageUrls(evidenceImages) {
  const output = {};
  const entries=Object.entries(evidenceImages || {});
  let cursor=0;
  async function worker(){
    while(cursor<entries.length){
      const index=cursor++,[key,image]=entries[index];
      output[key] = { ...image, url: await createSignedUrl(image?.path) };
    }
  }
  await Promise.all(Array.from({length:Math.min(5,entries.length)},()=>worker()));
  return output;
}

function checkAdminPassword(password) {
  if(!ADMIN_PASSWORD || typeof password!=="string") return false;
  const a=Buffer.from(password), b=Buffer.from(ADMIN_PASSWORD);
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}
async function serializableTransaction(work,maxAttempts=3){
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    try{return await prisma.$transaction(work,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}
    catch(err){if(err?.code!=='P2034'||attempt===maxAttempts)throw err;}
  }
  throw new Error('Không hoàn tất được giao dịch đồng thời.');
}
async function lockSubmissionMssv(tx,mssv){
  // pg_advisory_xact_lock() tra ve kieu void; $queryRaw khong deserialize duoc
  // (P2010) nen phai dung $executeRaw - khoa van duoc giu den het transaction.
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`sv5t-submission:${String(mssv||'').trim()}`},0))`);
}
function normalizeReviewerName(value){
  return String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ');
}
function reviewerNameKey(value){
  return normalizeReviewerName(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
}
function submissionVersionMatches(current,expected){
  const a=new Date(current),b=new Date(expected);
  return !Number.isNaN(a.getTime())&&!Number.isNaN(b.getTime())&&a.getTime()===b.getTime();
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
function groupStateComplete(gs, groupId){
  return SV5TRules.groupStateComplete(gs,groupId);
}
function collectGroupEvidence(category, groups, expected){
  for(const [groupId,gs] of Object.entries(groups||{})){
    if(groupId==='HN-F') continue;
    if(gs?.yes!==true || gs?.pending===true) continue;
    // Nhóm đã chuyển sang dạng danh sách nhưng hồ sơ cũ chỉ có `detail`: giữ đúng
    // khóa minh chứng cũ để đánh dấu của Ban trên hồ sơ cũ không bị lệch.
    if(Array.isArray(gs.items)&&gs.items.length) gs.items.forEach(it=>expected.push({key:`${category}::${groupId}:${it?.id||it?.name||''}`,dual:false}));
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
  (tn.items||[]).forEach((item,i)=>expected.push({key:`tinhNguyen::${item?.id||`tn-${i}`}`,dual:false}));
  if(tn.khenThuong) expected.push({key:'tinhNguyen::tn-khenthuong',dual:false});
  collectGroupEvidence('hoiNhap',hn.fixed,expected); collectGroupEvidence('hoiNhap',hn.groups,expected);
  if(hn.ngoaiNguMethod==='courseB'||hn.ngoaiNguMethod==='exempt'||(hn.ngoaiNguMethod==='certificate'&&isValidNgoaiNguCertificate(data))) expected.push({key:'hoiNhap::hn-ngoaingu',dual:false});
  (data.khac?.items||[]).forEach((item,i)=>expected.push({key:`khac::${item?.id||`khac-${i}`}`,dual:false}));
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
  // Mỗi hoạt động tình nguyện phải liệt kê đủ các ngày đã tham gia để đưa vào
  // báo cáo thành tích - đây là điều kiện bắt buộc khi bấm gửi hồ sơ.
  const volunteerNoDays=(tn.items||[]).filter(item=>!(Number(item?.days)>0)).map(item=>String(item?.text||'').trim()||'(hoạt động chưa đặt tên)');
  for(const name of volunteerNoDays){ rows.tinhNguyen.criteria.unanswered++; missingCriteria.push(`Tình nguyện: chưa nhập số ngày quy đổi cho “${name}”`); }
  const volunteerNoDates=SV5TRules.volunteerItemsMissingDates(tn.items);
  for(const name of volunteerNoDates){ rows.tinhNguyen.criteria.unanswered++; missingCriteria.push(`Tình nguyện: chưa liệt kê ngày tham gia của “${name}”`); }

  countServerGroupDeclarations(rows.hoiNhap,hn.fixed,missingCriteria);
  if(hn.ngoaiNguPending===true) rows.hoiNhap.criteria.later++;
  else if(hn.ngoaiNguMethod==='courseB'||hn.ngoaiNguMethod==='exempt'||hn.ngoaiNguMethod==='notMet'||(hn.ngoaiNguMethod==='certificate'&&isValidNgoaiNguCertificate(data))) rows.hoiNhap.criteria.declared++;
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

const FOREIGN_CERTIFICATES={
  IELTS:{kind:'number',min:[5,5.5],max:9,step:.5}, TOEIC:{kind:'toeicTotal'}, VSTEP:{kind:'number',min:[5.5,6],max:10,step:.5},
  APTIS:{kind:'number',min:[80,121],max:200}, PEIC:{kind:'level',levels:['Level 2','Level 3 (Pass)','Level 3 (Pass with Merit)','Level 3 (Pass with Distinction)','Level 4 (Pass)','Level 4 (Pass with Merit)','Level 4 (Pass with Distinction)','Level 5'],minLevel:[0,1]},
  PTE:{kind:'number',min:[29,36],max:90}, LINGUASKILL:{kind:'number',min:[140,160],max:210}, CAMBRIDGE_ASSESSMENT:{kind:'level',levels:['B1 Preliminary / B1 Business Preliminary','B2 First / B2 Business Vantage (Grade C)','B2 First / B2 Business Vantage (Grade B)','B2 First / B2 Business Vantage (Grade A)','C1 Advanced / C1 Business Higher','C2 Proficiency'],minLevel:[0,1]},
  CAMBRIDGE_TESTS:{kind:'number',min:[140,160],max:230}, TOEIC_4:{kind:'toeic4',min:[{listening:275,speaking:120,reading:275,writing:120},{listening:400,speaking:150,reading:385,writing:150}]},
  TOEFL_IBT:{kind:'number',min:[35,46],max:120}, TOEFL_ITP:{kind:'number',min:[450,500],max:677}, JLPT:{kind:'jlpt'}, DELF:{kind:'delf'}, TCF:{kind:'number',min:[200,250],max:699}, HSK:{kind:'hsk'}
};
function foreignTierFromData(data){
  const mssv=String(data?.personal?.mssv||''),label={2025:'K70',2024:'K69',2023:'K68'}[mssv.slice(0,4)]; return label?0:1;
}
function isValidNgoaiNguCertificate(data){
  const hn=data?.hoiNhap||{};
  if(hn.ngoaiNguMethod!=="certificate") return false;
  const type=String(hn.ngoaiNguCertificateType||"");
  const raw=String(hn.ngoaiNguCertificateScore??"").trim();
  const cfg=FOREIGN_CERTIFICATES[type]; if(!cfg)return false;
  const tier=foreignTierFromData(data),d=hn.ngoaiNguCertificateDetails||{};
  if(cfg.kind==='level') return cfg.levels.indexOf(String(d.level||''))>=cfg.minLevel[tier];
  if(cfg.kind==='toeic4'){
    const m=cfg.min[tier],limits={listening:495,speaking:200,reading:495,writing:200};
    return Object.keys(limits).every(k=>Number.isFinite(Number(d[k]))&&Number(d[k])>=m[k]&&Number(d[k])<=limits[k]);
  }
  if(cfg.kind==='jlpt'){
    const rank={N5:1,N4:2,N3:3,N2:4,N1:5},pass={N4:90,N3:95,N2:90,N1:100},need=tier===0?2:3,level=String(d.level||''),rawScore=String(d.score??'').trim(),score=Number(rawScore);
    if(rawScore===''||!Number.isFinite(score)||score>180||!pass[level])return false;
    return rank[level]>need?score>=pass[level]:rank[level]===need&&score>=(tier===0?145:95);
  }
  if(cfg.kind==='delf'){
    const rank={A1:1,A2:2,B1:3,B2:4,C1:5,C2:6},level=String(d.level||''),rawScore=String(d.score??'').trim(),score=Number(rawScore);
    if(rawScore===''||!Number.isFinite(score)||score<0||score>100)return false;
    return rank[level]>2?score>=50:level==='A2'&&score>=(tier===0?50:71);
  }
  if(cfg.kind==='hsk'){
    const hsk=Number(d.hskLevel),rawScore=String(d.hskScore??'').trim(),score=Number(rawScore),hskkRank={'Sơ cấp':1,'Trung cấp':2,'Cao cấp':3},need=tier===0?3:4,needScore=tier===0?241:180,needHskk=tier===0?1:2;
    return rawScore!==''&&Number.isInteger(hsk)&&hsk>=1&&hsk<=6&&Number.isFinite(score)&&score>=0&&score<=300&&(hsk>need?score>=180:hsk===need&&score>=needScore)&&hskkRank[String(d.hskk||'')]>=needHskk;
  }
  if(raw===''||!Number.isFinite(Number(raw)))return false;
  const score=Number(raw);
  if(cfg.kind==='toeicTotal'){
    const khoa=String(data?.personal?.mssv||'').slice(0,4),minimum=khoa==='2025'?350:khoa==='2024'?400:khoa==='2023'?450:500;
    return Number.isInteger(score)&&score>=minimum&&score<=990;
  }
  return score>=cfg.min[tier]&&score<=cfg.max&&(cfg.step!==.5||Math.abs(score*2-Math.round(score*2))<1e-9);
}

function normalizeRemovedEvidenceKeys(value){
  if(!Array.isArray(value)) return [];
  return [...new Set(value.map(v=>String(v||'').trim()).filter(v=>v && v.length<=300))];
}
function normalizeReviewFlags(value){
  if(!value || typeof value!=='object' || Array.isArray(value)) return {};
  const out={};
  for(const [key,flag] of Object.entries(value)){
    const cleanKey=String(key||'').trim();
    const label=flag===true?cleanKey:String(flag||'').trim().slice(0,500);
    if(cleanKey && cleanKey.length<=300 && label && isSafeText(label)) out[cleanKey]=label;
    if(Object.keys(out).length>=200) break;
  }
  return out;
}
function validateJsonComplexity(value){
  const limits={nodes:0,strings:0};
  function visit(current,depth){
    if(depth>14) return 'Dữ liệu hồ sơ lồng quá sâu.';
    limits.nodes++;
    if(limits.nodes>5000) return 'Dữ liệu hồ sơ có quá nhiều trường.';
    if(typeof current==='string'){
      limits.strings+=current.length;
      if(current.length>5000||limits.strings>250000) return 'Nội dung chữ trong hồ sơ quá dài.';
      return null;
    }
    if(Array.isArray(current)){
      if(current.length>500) return 'Một danh sách trong hồ sơ có quá nhiều mục.';
      for(const item of current){const error=visit(item,depth+1);if(error)return error;}
      return null;
    }
    if(current&&typeof current==='object'){
      const entries=Object.entries(current);
      if(entries.length>500) return 'Một đối tượng trong hồ sơ có quá nhiều trường.';
      for(const [key,item] of entries){
        if(key.length>300) return 'Tên trường dữ liệu quá dài.';
        const error=visit(item,depth+1);if(error)return error;
      }
    }
    return null;
  }
  return visit(value,0);
}
function validStudentId(value){
  const id=String(value||'').trim(),year=id.slice(0,4);
  if(!['2021','2022','2023','2024','2025'].includes(year)) return false;
  return id.length===(year==='2024'||year==='2025'?9:8)&&/^20\d+$/.test(id);
}
function validateActivityArrays(data){
  const arrays=[data.tinhNguyen?.items,data.khac?.items];
  if(arrays.some(value=>value!==undefined&&!Array.isArray(value))) return 'Danh sách hoạt động không hợp lệ.';
  if((data.tinhNguyen?.items||[]).length>100||(data.khac?.items||[]).length>100) return 'Mỗi mục chỉ được tối đa 100 hoạt động.';
  for(const item of data.tinhNguyen?.items||[]){
    if(!item||typeof item!=='object'||!String(item.text||'').trim()||String(item.text).length>500) return 'Hoạt động tình nguyện không hợp lệ.';
    const days=Number(item.days);if(!Number.isFinite(days)||days<0||days>366||Math.abs(days*2-Math.round(days*2))>1e-9) return 'Số ngày tình nguyện phải từ 0 đến 366 và theo bước 0,5 ngày.';
    if(item.dates!==undefined){
      if(!Array.isArray(item.dates)||item.dates.length>SV5TRules.MAX_VOLUNTEER_DATES) return `Danh sách ngày của hoạt động “${String(item.text).slice(0,80)}” không hợp lệ (tối đa ${SV5TRules.MAX_VOLUNTEER_DATES} ngày).`;
      const invalid=item.dates.find(value=>!SV5TRules.isValidVolunteerDate(value));
      if(invalid!==undefined) return `Ngày “${String(invalid).slice(0,40)}” của hoạt động “${String(item.text).slice(0,80)}” không đúng định dạng YYYY-MM-DD.`;
    }
  }
  for(const item of data.khac?.items||[]) if(!item||typeof item!=='object'||!String(item.text||'').trim()||String(item.text).length>500) return 'Thành tích khác không hợp lệ.';
  // Chặn theo mã không đủ: mỗi đề xuất tự sinh một mã riêng nên hai dòng cùng tên
  // vẫn lọt. Với tình nguyện thì đây là lỗ hổng thật, vì tổng ngày được cộng dồn
  // theo từng dòng nên khai trùng một hoạt động sẽ thổi phồng số ngày đạt được.
  // Dùng đúng normalizeActivityName mà frontend dùng để hai bên không lệch luật.
  for(const [label,items] of [['tình nguyện',data.tinhNguyen?.items||[]],['thành tích khác',data.khac?.items||[]]]){
    const ids=new Set(),names=new Set();
    for(const item of items){
      const id=String(item?.id||'').trim();
      if(id&&(id.length>150||ids.has(id)))return `Mã hoạt động ${label} bị trùng hoặc quá dài.`;
      if(id)ids.add(id);
      const nameKey=SV5TRules.normalizeActivityName(item?.text);
      if(nameKey){
        if(names.has(nameKey))return `Hoạt động ${label} bị trùng tên.`;
        names.add(nameKey);
      }
    }
  }
  return null;
}
function validateGroupMaps(data){
  const maps=[
    ['Đạo đức',data.daoDuc?.groups,SV5TRules.REQUIRED_GROUPS.daoDuc],['Học tập',data.hocTap?.groups,SV5TRules.REQUIRED_GROUPS.hocTap],
    ['Thể lực',data.theLuc?.groups,SV5TRules.REQUIRED_GROUPS.theLuc],['Hội nhập chính',data.hoiNhap?.fixed,SV5TRules.REQUIRED_GROUPS.hoiNhapFixed],
    ['Hội nhập phụ',data.hoiNhap?.groups,SV5TRules.REQUIRED_GROUPS.hoiNhap]
  ];
  for(const [label,states,allowedIds] of maps){
    if(!SV5TRules.isPlainObject(states)) return `${label}: nhóm tiêu chí không hợp lệ.`;
    const allowed=new Set(allowedIds);
    if(Object.keys(states).some(id=>!allowed.has(id))) return `${label}: có mã tiêu chí không được hỗ trợ.`;
    for(const id of allowedIds){
      const gs=states[id];if(!SV5TRules.isPlainObject(gs))return `${label}: thiếu trạng thái ${id}.`;
      if(gs.items!==undefined){
        if(!Array.isArray(gs.items)||gs.items.length>100)return `${label}: danh sách hoạt động ${id} không hợp lệ.`;
        const ids=new Set(),names=new Set();
        for(const item of gs.items){
          if(!SV5TRules.isPlainObject(item)||!String(item.name||'').trim()||String(item.name).length>500)return `${label}: hoạt động trong ${id} không hợp lệ.`;
          const itemId=String(item.id||item.name||'');if(itemId.length>150||ids.has(itemId))return `${label}: hoạt động trong ${id} bị trùng hoặc có mã quá dài.`;ids.add(itemId);
          // Mỗi đề xuất nhận một mã riêng nên chống trùng theo mã không bắt được
          // hai đề xuất cùng tên; điều kiện đạt chỉ đếm số phần tử nên phải chặn.
          const nameKey=SV5TRules.normalizeActivityName(item.name);
          if(names.has(nameKey))return `${label}: hoạt động trong ${id} bị trùng tên.`;
          names.add(nameKey);
        }
      }
    }
  }
  return null;
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
  if (!SV5TRules.isPlainObject(data)) return 'Thiếu dữ liệu hồ sơ.';
  // Base64 ảnh có thể dài hàng trăm nghìn ký tự và được kiểm tra dung lượng riêng;
  // không được coi nó là "văn bản hồ sơ" với giới hạn 5.000 ký tự.
  const complexityError=validateJsonComplexity({fullName,mssv,className,data,removedEvidenceImageKeys:body?.removedEvidenceImageKeys});
  if(complexityError) return complexityError;
  let unsafe=false; walkStrings({fullName,mssv,className,data},v=>{if(!isSafeText(v)) unsafe=true;});
  if(unsafe) return 'Dữ liệu chứa ký tự HTML không được phép.';
  const cleanName=String(fullName||'').trim(), cleanClass=String(className||'').trim();
  if (!cleanName) return 'Thiếu họ và tên.';
  if (cleanName.length>150) return 'Họ và tên quá dài.';
  if (!validStudentId(mssv)) return 'MSSV không hợp lệ hoặc không thuộc K66-K70.';
  if (!cleanClass) return 'Thiếu thông tin lớp.';
  if (cleanClass.length>120) return 'Tên lớp quá dài.';
  if(evidenceImages && (!SV5TRules.isPlainObject(evidenceImages) || Object.keys(evidenceImages).length>80)) return 'Số lượng ảnh minh chứng không hợp lệ.';
  if(Array.isArray(body?.removedEvidenceImageKeys)&&body.removedEvidenceImageKeys.length>160) return 'Danh sách ảnh cần xóa quá dài.';
  const personal = data.personal || {};
  if(!SV5TRules.isPlainObject(personal)) return 'Thông tin cá nhân không hợp lệ.';
  if(String(personal.mssv||'').trim()!==String(mssv||'').trim()) return 'MSSV trong báo cáo không trùng với MSSV gửi hồ sơ.';
  if(String(personal.fullName||'').trim()!==cleanName) return 'Họ tên trong báo cáo không trùng với họ tên gửi hồ sơ.';
  if(String(personal.className||'').trim()!==cleanClass) return 'Lớp trong báo cáo không trùng với lớp gửi hồ sơ.';
  if (String(personal.khoaTruong || '') !== 'Điện - Điện tử') return 'Khoa/Trường không hợp lệ.';
  if(!Number.isInteger(Number(personal.birthYear))||Number(personal.birthYear)<2000||Number(personal.birthYear)>2010) return 'Năm sinh phải là số nguyên từ 2000 đến 2010.';
  if(!Array.isArray(personal.positions)||personal.positions.length>10||personal.positions.some(value=>String(value||'').length>150)) return 'Danh sách chức vụ không hợp lệ.';
  if(String(personal.phone||'').length>30||!/^[-+().\s\d]*$/.test(String(personal.phone||''))) return 'Số điện thoại không hợp lệ.';
  const daoDuc = data.daoDuc || {};
  if (!isNumberInRange(daoDuc.renLuyenKy1, 0, 100) || !isNumberInRange(daoDuc.renLuyenKy2, 0, 100)) return 'Điểm rèn luyện phải nằm trong khoảng từ 0 đến 100.';
  const hocTap = data.hocTap || {};
  if(!Object.prototype.hasOwnProperty.call(SV5TRules.GPA_THRESHOLDS,String(hocTap.dien||''))) return 'Diện xét học tập không hợp lệ.';
  if (!isNumberInRange(hocTap.diemKy1, 0, 4) || !isNumberInRange(hocTap.diemKy2, 0, 4)) return 'Điểm học tập phải nằm trong khoảng từ 0 đến 4.';
  if (!isNumberInRange(hocTap.tinChiKy1, 1, 30) || !isNumberInRange(hocTap.tinChiKy2, 1, 30)) return 'Số tín chỉ mỗi kỳ phải nằm trong khoảng từ 1 đến 30.';
  if(!Number.isInteger(Number(hocTap.tinChiKy1))||!Number.isInteger(Number(hocTap.tinChiKy2))) return 'Số tín chỉ mỗi kỳ phải là số nguyên.';
  const hardEligibility=SV5TRules.evaluateHardEligibility(data);
  if(!hardEligibility.drlMet) return `Điểm rèn luyện trung bình phải từ ${hardEligibility.drlRequired} trở lên.`;
  if(!hardEligibility.gpaMet) return `GPA trung bình có trọng số của diện xét phải từ ${hardEligibility.gpaThreshold} trở lên.`;
  if(!hardEligibility.noViolationMet) return 'Chỉ có thể gửi hồ sơ khi sinh viên xác nhận không vi phạm pháp luật, quy chế và nội quy.';
  if(!hardEligibility.physicalMet) return 'Chỉ có thể gửi hồ sơ khi đã hoàn thành đủ 05 học phần GDTC hoặc không có điểm F trong các học phần GDTC đã học.';
  const missingDeclarations=SV5TRules.missingRequiredDeclarations(data);
  if(missingDeclarations.length) return `Hồ sơ còn ${missingDeclarations.length} tiêu chí chưa khai báo đầy đủ: ${missingDeclarations.slice(0,5).join('; ')}.`;
  const groupError=validateGroupMaps(data);if(groupError)return groupError;
  const hn=data.hoiNhap||{};
  if(!['courseB','exempt','certificate','notMet'].includes(String(hn.ngoaiNguMethod||''))&&hn.ngoaiNguPending!==true) return 'Trạng thái ngoại ngữ chưa được khai báo.';
  if(hn.ngoaiNguMethod==='certificate'&&!isValidNgoaiNguCertificate(data)) return 'Thông tin chứng chỉ ngoại ngữ không hợp lệ hoặc chưa đạt mức tối thiểu theo khóa.';
  const volunteerItems = Array.isArray(data.tinhNguyen?.items) ? data.tinhNguyen.items : [];
  if (volunteerItems.some(item => !isNumberInRange(item?.days, 0, Number.MAX_SAFE_INTEGER))) return 'Số ngày tình nguyện không được âm.';
  const activityError=validateActivityArrays(data);if(activityError)return activityError;
  const allowedImageKeys=currentExpectedImageKeys(data);
  if(data.evidence!==undefined&&(!SV5TRules.isPlainObject(data.evidence)||Object.keys(data.evidence).length>200)) return 'Trạng thái minh chứng không hợp lệ.';
  if(data.evidenceForms!==undefined&&(!SV5TRules.isPlainObject(data.evidenceForms)||Object.keys(data.evidenceForms).length>200)) return 'Danh sách link đơn minh chứng không hợp lệ.';
  for(const value of Object.values(data.evidence||{})) if(!['','later','form'].includes(String(value||''))) return 'Có trạng thái minh chứng không được hỗ trợ.';
  for(const value of Object.values(data.evidenceForms||{})) if(String(value||'').length>2000) return 'Link đơn minh chứng quá dài.';
  let totalEvidenceBytes=0;
  for(const [key,image] of Object.entries(evidenceImages||{})){
    if(!allowedImageKeys.has(key)) return `Ảnh minh chứng không thuộc hồ sơ hiện tại: ${String(key).slice(0,120)}.`;
    if(!SV5TRules.isPlainObject(image)||typeof image.dataBase64!=='string'||image.dataBase64.length>11*1024*1024||String(image.name||'').length>255) return 'Dữ liệu một ảnh minh chứng không hợp lệ.';
    const imageBytes=estimateDataUrlDecodedBytes(image.dataBase64);
    if(imageBytes===null) return 'Dữ liệu base64 của ảnh minh chứng không hợp lệ.';
    if(imageBytes>MAX_EVIDENCE_IMAGE_BYTES) return 'Mỗi ảnh sau khi nén không được vượt quá 8 MB.';
    try{ parseDataUrl(image.dataBase64); }
    catch(err){ return `Ảnh ${String(image.name||key).slice(0,120)} không hợp lệ: ${err.message}`; }
    totalEvidenceBytes+=imageBytes;
  }
  if(totalEvidenceBytes>MAX_TOTAL_EVIDENCE_BYTES) return 'Tổng dung lượng ảnh minh chứng không được vượt quá 16 MB.';
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
        activityCatalog: row?.activityCatalog || null,
        reportYear: row?.reportYear || 2025,
      },
    });
  } catch (err) {
    console.error('[config] GET failed:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi khi đọc cấu hình từ máy chủ.' });
  }
});

app.patch('/api/config', requireAdmin, async (req, res) => {
  const { config } = req.body || {};
  if (!config || typeof config !== 'object') return res.status(400).json({ success: false, message: 'Thiếu dữ liệu cấu hình.' });
  try {
    const linkFields=['linkDeXuatHoatDong','linkXacNhanCLB','linkXacNhanNgoaiKhoa','linkXacNhanChung'];
    for(const field of linkFields){const value=String(config[field]||'').trim();if(value&&(!isValidPublicUrl(value)||value.length>2000))return res.status(400).json({success:false,message:`Liên kết ${field} phải là URL HTTPS hợp lệ.`});}
    const start=config.submissionStartAt?new Date(config.submissionStartAt):null;
    const end=config.submissionEndAt?new Date(config.submissionEndAt):null;
    if(start&&Number.isNaN(start.getTime())) return res.status(400).json({success:false,message:'Thời gian bắt đầu không hợp lệ.'});
    if(end&&Number.isNaN(end.getTime())) return res.status(400).json({success:false,message:'Thời gian kết thúc không hợp lệ.'});
    if(start&&end&&start>=end) return res.status(400).json({success:false,message:'Thời gian kết thúc phải sau thời gian bắt đầu.'});
    const payload = {
      linkDeXuatHoatDong: String(config.linkDeXuatHoatDong || '').trim(),
      linkXacNhanClb: String(config.linkXacNhanCLB || '').trim(),
      linkXacNhanNgoaiKhoa: String(config.linkXacNhanNgoaiKhoa || '').trim(),
      linkXacNhanChung: String(config.linkXacNhanChung || '').trim(),
      submissionsOpen: config.submissionsOpen !== false,
      submissionStartAt: start,
      submissionEndAt: end,
      submissionClosedMessage: String(config.submissionClosedMessage || 'Hiện không trong thời gian nhận hồ sơ.').slice(0,300),
      reportYear: Number.isInteger(Number(config.reportYear)) && Number(config.reportYear)>=2020 && Number(config.reportYear)<=2100 ? Number(config.reportYear) : 2025,
    };
    await prisma.appConfig.upsert({ where: { key: 'main' }, update: payload, create: { key: 'main', ...payload } });
    res.json({ success: true });
  } catch (err) {
    console.error('[config] PATCH failed:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi khi lưu cấu hình lên máy chủ.' });
  }
});

app.post('/api/auth',async(req,res)=>{
  const failKey=`auth-fail:${clientIpHash(req)}`;
  try{
    const current=await touchRateLimit(failKey,AUTH_FAIL_WINDOW_MS,{peek:true});
    if(current.count>=AUTH_FAIL_MAX){
      const retry=Math.max(1,Math.ceil((new Date(current.resetAt).getTime()-Date.now())/1000));
      res.setHeader('Retry-After',String(retry));
      return res.status(429).json({success:false,code:'AUTH_LOCKED',scope:'ratelimit',message:`Đã nhập sai mật khẩu ${AUTH_FAIL_MAX} lần. Vui lòng chờ khoảng ${Math.ceil(retry/60)} phút rồi thử lại.`});
    }
  }catch(err){console.error('[auth] rate peek failed:',err.message);}
  if(!checkAdminPassword(req.body?.password)){
    // Chỉ lần SAI mới bị tính vào hạn mức.
    try{await touchRateLimit(failKey,AUTH_FAIL_WINDOW_MS);}catch(err){console.error('[auth] rate bump failed:',err.message);}
    return res.status(401).json({success:false,code:'BAD_PASSWORD',scope:'permission',message:'Mật khẩu quản trị không đúng.'});
  }
  try{
    await prisma.apiRateLimit.deleteMany({where:{key:failKey}}).catch(()=>{});
    const oldToken=parseCookies(req).sv5t_admin_session;
    if(oldToken) await prisma.adminSession.deleteMany({where:{tokenHash:sessionTokenHash(oldToken)}});
    const token=crypto.randomBytes(32).toString('hex');
    await prisma.adminSession.create({data:{tokenHash:sessionTokenHash(token),expiresAt:new Date(Date.now()+ADMIN_SESSION_TTL_MS)}});
    setAdminSessionCookie(res,token);
    res.json({success:true,expiresIn:Math.floor(ADMIN_SESSION_TTL_MS/1000)});
  }catch(err){console.error('[auth] LOGIN failed:',err.message);res.status(503).json({success:false,message:'Không tạo được phiên quản trị.'});}
});
app.get('/api/auth/session',async(req,res)=>{try{res.json({success:true,authenticated:Boolean(await getAdminSession(req))});}catch{res.status(503).json({success:false,authenticated:false,message:'Không kiểm tra được phiên quản trị.'});}});
app.post('/api/auth/logout',requireAdmin,async(req,res)=>{
  try{if(req.adminSession?.tokenHash)await prisma.adminSession.deleteMany({where:{tokenHash:req.adminSession.tokenHash}});clearAdminSessionCookie(res);res.json({success:true});}
  catch(err){console.error('[auth] LOGOUT failed:',err.message);res.status(503).json({success:false,message:'Không đăng xuất được phiên quản trị.'});}
});

// Kiểm tra trước khi gửi bằng đúng thuật toán backend dùng khi lưu hồ sơ.
app.post('/api/submissions/review',reviewLimit,async (req,res)=>{
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
app.post('/api/submissions',submitIpLimit,submitLimit,async (req, res) => {
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
  let dbCommitted = false;
  try {
    if(!storageReady) return res.status(503).json({success:false,code:'STORAGE_DOWN',scope:'storage',message:`Kho ảnh minh chứng đang tạm thời gián đoạn nên chưa nhận được hồ sơ.${storageLastError?' Chi tiết: '+storageLastError:''}`});
    // Object path luôn có version ngẫu nhiên nên có thể upload trước transaction.
    // Nếu transaction thất bại, toàn bộ ảnh vừa upload sẽ được rollback/đưa vào hàng đợi dọn.
    newlyUploaded = await uploadEvidenceImages(normalizedMssv, evidenceImages || {});
    const cleanData = JSON.parse(JSON.stringify(data));
    cleanData.evidenceImages = {};
    const expectedEvidenceKeys=new Set(buildExpectedEvidence(cleanData).map(item=>item.key));
    cleanData.evidence=Object.fromEntries(Object.entries(cleanData.evidence||{}).filter(([key])=>expectedEvidenceKeys.has(key)));
    cleanData.evidenceForms=Object.fromEntries(Object.entries(cleanData.evidenceForms||{}).filter(([key])=>expectedEvidenceKeys.has(key)));
    const savedResult = await serializableTransaction(async tx=>{
      await lockSubmissionMssv(tx,normalizedMssv);
      // Đọc lại sau khi đã khóa: hai lần gửi đồng thời sẽ merge/xóa ảnh trên
      // phiên bản mới nhất thay vì cùng dựa vào một snapshot cũ.
      const existing=await tx.submission.findUnique({where:{mssv:normalizedMssv},select:{id:true,evidenceImages:true}});
      const oldImages=existing?.evidenceImages && typeof existing.evidenceImages==='object'?existing.evidenceImages:{};
      const reviewEvidence={};
      for(const [key,img] of Object.entries(oldImages)) if(img?.path&&!removedKeys.has(key)) reviewEvidence[key]={dataBase64:'existing'};
      Object.assign(reviewEvidence,evidenceImages||{});
      const serverReview=computeServerReview(data,reviewEvidence);
      if(serverReview.blockers>0){const error=new Error('SUBMISSION_BLOCKERS');error.code='SUBMISSION_BLOCKERS';error.review=serverReview;throw error;}
      const allowedKeys=currentExpectedImageKeys(data),retainedOldImages={};
      for(const [key,image] of Object.entries(oldImages)) if(allowedKeys.has(key)&&!removedKeys.has(key)) retainedOldImages[key]=image;
      const mergedImages={...retainedOldImages,...newlyUploaded};
      const payload={fullName:String(fullName).trim(),className:String(className).trim(),data:cleanData,evidenceImages:mergedImages,status:'Chưa kiểm tra',note:''};
      const saved=await tx.submission.upsert({
        where: { mssv: normalizedMssv },
        update: payload,
        create: { mssv: normalizedMssv, ...payload },
      });
      // Sinh viên gửi lại: bỏ bản check cũ trong cùng transaction với bản hồ sơ mới.
      if(existing) await tx.submissionReview.deleteMany({where:{submissionId:saved.id}});
      return {saved,oldImages,mergedImages,updated:Boolean(existing)};
    });
    dbCommitted=true;
    const {saved:row,oldImages,mergedImages,updated}=savedResult;
    const newPaths=new Set(Object.values(newlyUploaded).map(item=>item?.path).filter(Boolean));
    const removedPaths = Object.entries(oldImages)
      .filter(([key]) => !Object.prototype.hasOwnProperty.call(mergedImages,key) || Object.prototype.hasOwnProperty.call(newlyUploaded,key))
      .map(([,image]) => image?.path)
      .filter(oldPath => oldPath && !newPaths.has(oldPath));
    await deleteStorageObjects(removedPaths,{queueOnFailure:true});
    res.json({ success: true, id: row.id, updated, submittedAt: row.updatedAt });
  } catch (err) {
    if(!dbCommitted) await deleteStorageObjects(Object.values(newlyUploaded).map(item => item?.path).filter(Boolean),{queueOnFailure:true});
    if(err.code==='SUBMISSION_BLOCKERS') return res.status(400).json({success:false,code:'SUBMISSION_BLOCKERS',message:`Hồ sơ còn ${err.review.criteriaMissing} tiêu chí và ${err.review.evidenceMissing} minh chứng chưa được khai báo đầy đủ.`,review:err.review,issues:[...(err.review.missingCriteria||[]),...(err.review.missingEvidence||[])].slice(0,200).map(text=>({column:'Cần bổ sung',reason:String(text)}))});
    if(err.code==='STORAGE_UPLOAD'||err.name==='AbortError'||/fetch failed/i.test(String(err.message||''))){storageReady=false;return res.status(503).json({success:false,code:'STORAGE_UPLOAD',scope:'storage',message:'Không tải được ảnh minh chứng lên kho ảnh. Hồ sơ CHƯA được ghi và dữ liệu cũ không bị thay đổi; vui lòng thử lại sau ít phút.'});}
    console.error('[submissions] POST failed:', err.message);
    res.status(500).json({ success: false, code:'SUBMIT_FAILED', message: 'Máy chủ gặp lỗi khi lưu hồ sơ. Dữ liệu chưa được ghi; vui lòng thử lại.' });
  }
});

// Danh sách nhẹ, phân trang 10 hồ sơ; không trả JSON form và ảnh.
app.get('/api/submissions',requireAdmin,async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 10));
  const search = String(req.query.search || '').trim();
  const statusFilter=String(req.query.status||'').trim();
  const filters=[];
  if(search) filters.push({OR: [
      { fullName: { contains: search, mode: 'insensitive' } },
      { mssv: { contains: search } },
      { className: { contains: search, mode: 'insensitive' } },
    ]});
  if(statusFilter && ALLOWED_STATUSES.has(statusFilter)) filters.push(statusFilter==='Chưa kiểm tra'
    ? {OR:[{review:{is:null}},{review:{is:{status:'Chưa kiểm tra'}}}]}
    : {review:{is:{status:statusFilter}}});
  const where=filters.length?{AND:filters}:{};
  try {
    const [total, rows] = await prisma.$transaction([
      prisma.submission.count({ where }),
      prisma.submission.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, fullName: true, mssv: true, className: true, createdAt: true, updatedAt: true, review:{select:{status:true,note:true,reviewer:true,checkedAt:true,updatedAt:true,submissionUpdatedAt:true}} },
      }),
    ]);
    res.json({ success: true, submissions: rows.map(row=>({...row,status:row.review?.status||'Chưa kiểm tra',note:row.review?.note||'',reviewer:row.review?.reviewer||'',checkedAt:row.review?.checkedAt||null,review:undefined})), page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (err) {
    console.error('[submissions] GET failed:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi khi đọc danh sách hồ sơ.' });
  }
});

app.get('/api/admin/dashboard',requireAdmin,async (req,res)=>{
  try{
    const [total,approved,needMore,unchecked]=await prisma.$transaction([
      prisma.submission.count(), prisma.submissionReview.count({where:{status:'Đã duyệt'}}), prisma.submissionReview.count({where:{status:'Cần bổ sung'}}), prisma.submission.count({where:{OR:[{review:{is:null}},{review:{is:{status:'Chưa kiểm tra'}}}]}})
    ]);
    res.json({success:true,summary:{total,unchecked,approved,needMore}});
  }catch(err){res.status(500).json({success:false,message:'Không tải được tổng quan.'});}
});
app.get('/api/admin/reviewers',requireAdmin,async(req,res)=>{
  try{
    const reviewers=await prisma.adminReviewer.findMany({where:{active:true},orderBy:{name:'asc'},select:{id:true,name:true}});
    res.json({success:true,reviewers});
  }catch(err){res.status(500).json({success:false,message:'Không tải được danh sách người kiểm tra.'});}
});
app.post('/api/admin/reviewers',requireAdmin,async(req,res)=>{
  const name=normalizeReviewerName(req.body?.name),normalizedName=reviewerNameKey(name);
  if(name.length<2||name.length>100||!normalizedName||!isSafeText(name)) return res.status(400).json({success:false,message:'Tên thành viên phải từ 2 đến 100 ký tự và không chứa HTML.'});
  try{
    const count=await prisma.adminReviewer.count({where:{active:true}});
    if(count>=50) return res.status(400).json({success:false,message:'Danh sách người kiểm tra đã đạt giới hạn 50 thành viên.'});
    const existing=await prisma.adminReviewer.findUnique({where:{normalizedName}});
    if(existing){
      const reviewer=await prisma.adminReviewer.update({where:{id:existing.id},data:{name,active:true},select:{id:true,name:true}});
      return res.json({success:true,reviewer,reused:true});
    }
    const reviewer=await prisma.adminReviewer.create({data:{name,normalizedName},select:{id:true,name:true}});
    res.status(201).json({success:true,reviewer});
  }catch(err){
    if(err.code==='P2002') return res.status(409).json({success:false,message:'Tên thành viên này đã tồn tại.'});
    res.status(500).json({success:false,message:'Không thêm được người kiểm tra.'});
  }
});
app.delete('/api/admin/reviewers/:id',requireAdmin,async(req,res)=>{
  try{
    const reviewer=await prisma.adminReviewer.findUnique({where:{id:req.params.id},select:{id:true}});
    if(!reviewer) return res.status(404).json({success:false,message:'Không tìm thấy người kiểm tra.'});
    await prisma.adminReviewer.update({where:{id:req.params.id},data:{active:false}});
    res.json({success:true});
  }catch(err){res.status(500).json({success:false,message:'Không xóa được người kiểm tra khỏi danh sách chọn.'});}
});
app.get('/api/submissions-export',requireAdmin,async (req,res)=>{
  try{
    const rows=await prisma.submission.findMany({orderBy:{updatedAt:'desc'},select:{fullName:true,mssv:true,className:true,data:true,updatedAt:true,review:{select:{status:true,note:true,flags:true,reviewer:true,checkedAt:true}}}});
    const output=rows.map(row=>{
      const d=row.data||{}, h=d.hocTap||{}, tn=d.tinhNguyen||{};
      const tc1=Number(h.tinChiKy1)||0,tc2=Number(h.tinChiKy2)||0;
      const gpa=tc1+tc2>0?((Number(h.diemKy1)||0)*tc1+(Number(h.diemKy2)||0)*tc2)/(tc1+tc2):'';
      const flagged=Object.values(normalizeReviewFlags(row.review?.flags));
      const volunteerDetail=(tn.items||[]).map(item=>SV5TRules.formatVolunteerItem(item)).join('; ');
      return {fullName:row.fullName,mssv:row.mssv,className:row.className,gpa:gpa===''?'':Number(gpa.toFixed(2)),volunteerDays:(tn.items||[]).reduce((a,it)=>a+(Number(it?.days)||0),0),volunteerDetail,status:row.review?.status||'Chưa kiểm tra',reviewer:row.review?.reviewer||'',note:row.review?.note||'',reviewIssues:flagged.join('; '),checkedAt:row.review?.checkedAt||'',updatedAt:row.updatedAt};
    });
    res.json({success:true,submissions:output});
  }catch(err){res.status(500).json({success:false,message:'Không xuất được danh sách.'});}
});
app.get('/api/submission-status',lookupLimit,async (req,res)=>{
  const mssv=String(req.query.mssv||'').trim();
  if(!validStudentId(mssv)) return res.status(400).json({success:false,message:'MSSV không hợp lệ.'});
  try{
    const row=await prisma.submission.findUnique({where:{mssv},select:{updatedAt:true,review:{select:{status:true,updatedAt:true}}}});
    if(!row) return res.status(404).json({success:false,message:'Không tìm thấy hồ sơ với MSSV này.'});
    res.json({success:true,status:row.review?.status||'Chưa kiểm tra',updatedAt:row.review?.updatedAt||row.updatedAt});
  }catch(err){res.status(500).json({success:false,message:'Không tra cứu được hồ sơ.'});}
});

app.get('/api/submissions/:id',requireAdmin,async (req, res) => {
  try {
    const row = await prisma.submission.findUnique({ where: { id: req.params.id }, include:{review:true} });
    if (!row) return res.status(404).json({ success: false, message: 'Hồ sơ không còn tồn tại.' });
    const evidenceImages = storageReady?await hydrateEvidenceImageUrls(row.evidenceImages):Object.fromEntries(Object.entries(row.evidenceImages||{}).map(([key,image])=>[key,{...image,url:''}]));
    res.json({ success: true, storageAvailable:storageReady, submission: { ...row, status:row.review?.status||'Chưa kiểm tra', note:row.review?.note||'', review:row.review||null, evidenceImages } });
  } catch (err) {
    console.error('[submissions] DETAIL failed:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi khi đọc chi tiết hồ sơ.' });
  }
});

app.patch('/api/submissions/:id',requireAdmin,async (req, res) => {
  const status = String(req.body?.status || '');
  const note = String(req.body?.note || '').trim().slice(0, 2000);
  const reviewerInput=normalizeReviewerName(req.body?.reviewer);
  const expectedUpdatedAt=new Date(req.body?.submissionUpdatedAt||'');
  const hasFlags=Object.prototype.hasOwnProperty.call(req.body||{},'flags');
  const flags = normalizeReviewFlags(req.body?.flags);
  if (!ALLOWED_STATUSES.has(status)) return res.status(400).json({ success: false, message: 'Trạng thái hồ sơ không hợp lệ.' });
  if(!reviewerInput) return res.status(400).json({success:false,message:'Vui lòng chọn người kiểm tra từ danh sách.'});
  if(Number.isNaN(expectedUpdatedAt.getTime())) return res.status(400).json({success:false,message:'Thiếu phiên bản hồ sơ đang được kiểm tra. Vui lòng tải lại hồ sơ.'});
  try {
    const target=await prisma.submission.findUnique({where:{id:req.params.id},select:{id:true,mssv:true}});
    if(!target) return res.status(404).json({ success: false, message: 'Hồ sơ không còn tồn tại.' });
    const row=await serializableTransaction(async tx=>{
      await lockSubmissionMssv(tx,target.mssv);
      const exists=await tx.submission.findUnique({where:{id:req.params.id},select:{id:true,updatedAt:true,review:{select:{flags:true}}}});
      if(!exists){const error=new Error('NOT_FOUND');error.code='NOT_FOUND';throw error;}
      if(!submissionVersionMatches(exists.updatedAt,expectedUpdatedAt)){const error=new Error('STALE_SUBMISSION');error.code='STALE_SUBMISSION';error.currentUpdatedAt=exists.updatedAt;throw error;}
      const member=await tx.adminReviewer.findUnique({where:{normalizedName:reviewerNameKey(reviewerInput)},select:{name:true,active:true}});
      if(!member?.active){const error=new Error('INVALID_REVIEWER');error.code='INVALID_REVIEWER';throw error;}
      const effectiveFlags=hasFlags?flags:normalizeReviewFlags(exists.review?.flags);
      if(!SV5TRules.reviewStatusAllowed(status,effectiveFlags)){const error=new Error('REVIEW_HAS_FLAGS');error.code='REVIEW_HAS_FLAGS';throw error;}
      const checkedAt=new Date(),update={status,note,reviewer:member.name,submissionUpdatedAt:exists.updatedAt,checkedAt};if(hasFlags)update.flags=flags;
      const saved=await tx.submissionReview.upsert({where:{submissionId:req.params.id},update,create:{submissionId:req.params.id,status,note,flags:effectiveFlags,reviewer:member.name,submissionUpdatedAt:exists.updatedAt,checkedAt}});
      await tx.submissionReviewRevision.create({data:{submissionId:req.params.id,reviewId:saved.id,status:saved.status,note:saved.note,flags:saved.flags,reviewer:member.name,submissionUpdatedAt:exists.updatedAt}});
      return saved;
    });
    res.json({ success: true, submission: { id: req.params.id, status: row.status, note: row.note, flags:row.flags, reviewer:row.reviewer,submissionUpdatedAt:row.submissionUpdatedAt,checkedAt:row.checkedAt,reviewUpdatedAt:row.updatedAt } });
  } catch (err) {
    if (err.code === 'P2025'||err.code==='NOT_FOUND') return res.status(404).json({ success: false, message: 'Hồ sơ không còn tồn tại.' });
    if(err.code==='STALE_SUBMISSION') return res.status(409).json({success:false,code:'STALE_SUBMISSION',message:'Sinh viên đã cập nhật hồ sơ sau khi bạn mở bản kiểm tra. Vui lòng tải lại hồ sơ trước khi lưu.',currentUpdatedAt:err.currentUpdatedAt});
    if(err.code==='INVALID_REVIEWER') return res.status(400).json({success:false,message:'Người kiểm tra không còn nằm trong danh sách được phép. Vui lòng chọn lại.'});
    if(err.code==='REVIEW_HAS_FLAGS') return res.status(409).json({success:false,message:'Không thể chuyển sang “Đã duyệt” khi hồ sơ vẫn còn nội dung bị đánh dấu thiếu/sai. Hãy bỏ toàn bộ đánh dấu hoặc chọn “Cần bổ sung”.'});
    console.error('[submissions] PATCH failed:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật hồ sơ.' });
  }
});

app.delete('/api/submissions/:id',requireAdmin,deleteConfirmLimit,async (req, res) => {
  if(!checkAdminPassword(req.body?.password)) return res.status(403).json({success:false,message:'Mật khẩu xác nhận không đúng.'});
  try {
    const target=await prisma.submission.findUnique({where:{id:req.params.id},select:{mssv:true}});
    if(!target) return res.status(404).json({success:false,message:'Hồ sơ không còn tồn tại.'});
    const row=await serializableTransaction(async tx=>{
      await lockSubmissionMssv(tx,target.mssv);
      const current=await tx.submission.findUnique({where:{id:req.params.id},select:{evidenceImages:true}});
      if(!current){const error=new Error('NOT_FOUND');error.code='NOT_FOUND';throw error;}
      await tx.submission.delete({where:{id:req.params.id}});
      return current;
    });
    const storageDeleted=await deleteStorageObjects(Object.values(row.evidenceImages || {}).map(item => item?.path),{queueOnFailure:true});
    res.json({ success: true, storageCleanupQueued:!storageDeleted });
  } catch (err) {
    if (err.code === 'P2025'||err.code==='NOT_FOUND') return res.status(404).json({ success: false, message: 'Hồ sơ không còn tồn tại.' });
    console.error('[submissions] DELETE failed:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa hồ sơ.' });
  }
});


app.put('/api/admin/activity-catalog',requireAdmin,async(req,res)=>{
  const catalog=req.body?.catalog;
  if(!catalog || typeof catalog!=='object' || Array.isArray(catalog)) return res.status(400).json({success:false,message:'Danh mục hoạt động không hợp lệ.'});
  const allowedKeys=[
    'daoDuc','daoDucDangDoan',
    'hocTap','hocTapClb','hocTapNckh','hocTapNhomNckh','hocTapThamLuan','hocTapSangTao',
    'theLuc','tinhNguyen',
    'hoiNhapKhoaHoc','hoiNhapCapDaiHoc','hoiNhapGiaoLuu','hoiNhapPhu'
  ];
  const unknownKeys=Object.keys(catalog).filter(key=>!allowedKeys.includes(key));
  if(unknownKeys.length) return res.status(400).json({success:false,code:'CATALOG_UNKNOWN_GROUP',message:`Danh mục có ${unknownKeys.length} nhóm không được hỗ trợ: ${unknownKeys.join(', ')}.`,issues:unknownKeys.map(key=>({column:'Nhóm',reason:'Nhóm này không nằm trong 14 nhóm tiêu chí được hỗ trợ.',value:key}))});
  const clean={};
  // Gom mọi hoạt động lỗi rồi trả về một lượt, kèm tên nhóm và tên hoạt động cụ thể,
  // để quản trị biết chính xác phải sửa dòng nào trong file Excel.
  const issues=[];
  const addIssue=(key,name,column,reason,value)=>{ if(issues.length<200) issues.push({column:`${key} › ${column}`,reason,value:String(value||name||'').slice(0,120)}); };
  for(const key of allowedKeys){
    const arr=catalog[key];
    if(!Array.isArray(arr)){ addIssue(key,'','Nhóm','Nhóm này phải là một danh sách hoạt động.',typeof arr); clean[key]=[]; continue; }
    if(arr.length>500){ addIssue(key,'','Nhóm',`Nhóm có ${arr.length} hoạt động, vượt giới hạn 500.`,''); clean[key]=[]; continue; }
    const ids=new Set();clean[key]=[];
    for(const it of arr){
      const item={id:String(it?.id||'').trim(),name:String(it?.name||'').trim(),yeuCau:String(it?.yeuCau||'').trim(),minhchung:String(it?.minhchung||'').trim()};
      if(!item.name)continue;
      if(!/^[A-Za-z0-9._:-]{1,100}$/.test(item.id)){ addIssue(key,item.name,'Mã hoạt động','Mã trống hoặc chứa ký tự không cho phép (chỉ dùng chữ, số và . _ : -).',item.id||'(trống)'); continue; }
      if(ids.has(item.id)){ addIssue(key,item.name,'Mã hoạt động','Mã hoạt động bị trùng với một hoạt động khác trong cùng nhóm.',item.id); continue; }
      if(item.name.length>500){ addIssue(key,item.name,'Hoạt động',`Tên dài ${item.name.length} ký tự, vượt giới hạn 500.`,item.name); continue; }
      if(item.yeuCau.length>500){ addIssue(key,item.name,'Yêu cầu',`Nội dung dài ${item.yeuCau.length} ký tự, vượt giới hạn 500.`,item.name); continue; }
      if(item.minhchung.length>1000){ addIssue(key,item.name,'Cách thức minh chứng',`Nội dung dài ${item.minhchung.length} ký tự, vượt giới hạn 1000.`,item.name); continue; }
      const unsafeField=[['Hoạt động',item.name],['Yêu cầu',item.yeuCau],['Cách thức minh chứng',item.minhchung]].find(([,value])=>!isSafeText(value));
      if(unsafeField){ addIssue(key,item.name,unsafeField[0],'Nội dung chứa ký tự < hoặc > nên bị chặn. Hãy thay bằng ≤ / ≥ hoặc bỏ ký tự đó.',unsafeField[1]); continue; }
      ids.add(item.id);clean[key].push(item);
    }
  }
  if(issues.length) return res.status(400).json({success:false,code:'CATALOG_INVALID_ROWS',message:`Có ${issues.length} hoạt động không hợp lệ nên danh mục chưa được lưu.`,issues});
  try{
    await prisma.appConfig.upsert({where:{key:'main'},update:{activityCatalog:clean},create:{key:'main',activityCatalog:clean}});
    res.json({success:true});
  }catch(err){ console.error('[catalog] save failed:',err.message); res.status(503).json({success:false,code:'CATALOG_DB',scope:'database',message:'Không ghi được danh mục vào cơ sở dữ liệu. Danh mục cũ vẫn giữ nguyên; vui lòng thử lại sau ít phút.'}); }
});

app.use('/api',(req,res)=>res.status(404).json({success:false,message:'API không tồn tại.'}));
app.use((err,req,res,next)=>{
  if(res.headersSent)return next(err);
  if(err?.type==='entity.too.large')return res.status(413).json({success:false,message:'Dữ liệu gửi lên vượt quá giới hạn 25 MB.'});
  if(err instanceof SyntaxError&&Object.prototype.hasOwnProperty.call(err,'body'))return res.status(400).json({success:false,message:'JSON gửi lên không hợp lệ.'});
  console.error('[server] unhandled:',err?.message||err);
  res.status(500).json({success:false,message:'Máy chủ gặp lỗi ngoài dự kiến.'});
});

async function refreshStorageReadiness(){
  try{await verifyStorageBucket();storageReady=true;storageLastError='';}
  catch(err){storageReady=false;storageLastError=String(err.message||err);console.error('[storage] Chưa sẵn sàng, hệ thống sẽ tự thử lại:',storageLastError);}
}
const storageVerification=setInterval(()=>refreshStorageReadiness(),5*60_000);
if(typeof storageVerification.unref==='function') storageVerification.unref();
const httpServer=app.listen(PORT,()=>{
  console.log(`SV5T Ho So server running at http://localhost:${PORT}`);
  refreshStorageReadiness();
});
async function shutdown(){
  clearInterval(storageVerification);clearInterval(storageCleanup);clearInterval(limiterCleanup);
  httpServer.close(async()=>{await prisma.$disconnect();process.exit(0);});
  setTimeout(()=>process.exit(1),10_000).unref();
}
process.on('SIGTERM',shutdown);
process.on('SIGINT',shutdown);
