const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const rules=require('../public/js/shared-rules.js');

const source=fs.readFileSync(require.resolve('../server.js'),'utf8');
const validationBlock=source.slice(source.indexOf('const MAX_EVIDENCE_IMAGE_BYTES'),source.indexOf("app.get('/api/config'"));
const context={URL,Buffer,SV5TRules:rules};vm.createContext(context);
vm.runInContext(validationBlock+'\nglobalThis.audit={validateSubmissionPayload,computeServerReview,isValidNgoaiNguCertificate,normalizeReviewerName,reviewerNameKey,submissionVersionMatches};',context);
const imageBlock=source.slice(source.indexOf('const MAX_EVIDENCE_IMAGE_BYTES'),source.indexOf('function storageExtension'));
const imageContext={Buffer,Set,Error,String};vm.createContext(imageContext);vm.runInContext(imageBlock+'\nglobalThis.parse=parseDataUrl;',imageContext);
const appSource=fs.readFileSync(require.resolve('../public/js/app.js'),'utf8');
const certBlock=appSource.slice(appSource.indexOf('const FOREIGN_CERTIFICATES'),appSource.indexOf('/* ---------- STEP: Hội nhập ---------- */'));
const certContext={};vm.createContext(certContext);vm.runInContext(certBlock+'\nglobalThis.validateCert=validateNgoaiNguCertificate;',certContext);

function groups(ids){return Object.fromEntries(ids.map(id=>[id,{yes:false,pending:false}]));}
function fakePngDataUrl(bytes){
  const buffer=Buffer.alloc(Math.max(24,bytes));
  Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(buffer,0);
  buffer.writeUInt32BE(1,16);buffer.writeUInt32BE(1,20);
  return 'data:image/png;base64,'+buffer.toString('base64');
}
function body(){
  const data={
    personal:{fullName:'Nguyễn Văn A',mssv:'202512345',className:'K70-A',khoaTruong:'Điện - Điện tử',birthYear:2006,positions:[''],phone:''},
    daoDuc:{renLuyenKy1:80,renLuyenKy2:80,khongViPham:true,groups:groups(rules.REQUIRED_GROUPS.daoDuc)},
    hocTap:{dien:'thuong',diemKy1:2.8,diemKy2:2.8,tinChiKy1:15,tinChiKy2:15,groups:groups(rules.REQUIRED_GROUPS.hocTap)},
    theLuc:{hoanThanhDuGDTC:false,khongDiemF:true,groups:groups(rules.REQUIRED_GROUPS.theLuc)},
    tinhNguyen:{items:[],pending:true,khenThuong:false},
    hoiNhap:{fixed:groups(rules.REQUIRED_GROUPS.hoiNhapFixed),groups:groups(rules.REQUIRED_GROUPS.hoiNhap),ngoaiNguMethod:'notMet',ngoaiNguPending:false},
    khac:{items:[]},evidence:{'daoDuc::dd-rl':'later','hocTap::ht-diem':'later','theLuc::tl-gdtc':'later'},evidenceForms:{}
  };
  return {fullName:'Nguyễn Văn A',mssv:'202512345',className:'K70-A',data,evidenceImages:{},removedEvidenceImageKeys:[]};
}

test('payload hợp lệ và tiêu chí phụ Không đạt/Bổ sung sau vẫn qua',()=>{
  const value=body();assert.equal(context.audit.validateSubmissionPayload(value),null);
  assert.equal(context.audit.computeServerReview(value.data,{}).blockers,0);
});
test('backend chặn DRL và GPA dưới ngưỡng',()=>{
  const lowDrl=body();lowDrl.data.daoDuc.renLuyenKy2=79;assert.match(context.audit.validateSubmissionPayload(lowDrl),/rèn luyện/);
  const lowGpa=body();lowGpa.data.hocTap.diemKy1=2.79;lowGpa.data.hocTap.diemKy2=2.79;assert.match(context.audit.validateSubmissionPayload(lowGpa),/GPA/);
});
test('backend chặn vi phạm và điểm F GDTC',()=>{
  const violation=body();violation.data.daoDuc.khongViPham=false;assert.match(context.audit.validateSubmissionPayload(violation),/không vi phạm/);
  const physical=body();physical.data.theLuc.khongDiemF=false;assert.match(context.audit.validateSubmissionPayload(physical),/điểm F/);
  physical.data.theLuc.hoanThanhDuGDTC=true;assert.equal(context.audit.validateSubmissionPayload(physical),null);
});
test('backend chặn thiếu nhóm, lệch danh tính và key ảnh lạ',()=>{
  const missing=body();delete missing.data.hocTap.groups['HT-G6'];assert.match(context.audit.validateSubmissionPayload(missing),/HT-G6/);
  const mismatch=body();mismatch.data.personal.mssv='20221234';assert.match(context.audit.validateSubmissionPayload(mismatch),/không trùng/);
  const extra=body();extra.evidenceImages.bad={name:'x.png',dataBase64:'data:image/png;base64,iVBORw0KGgo='};assert.match(context.audit.validateSubmissionPayload(extra),/không thuộc hồ sơ/);
});
test('base64 ảnh không bị tính nhầm vào giới hạn độ dài văn bản',()=>{
  const value=body();
  value.evidenceImages['theLuc::tl-gdtc']={name:'gdtc.png',dataBase64:fakePngDataUrl(6000)};
  assert.equal(context.audit.validateSubmissionPayload(value),null);
});
test('backend chặn tổng ảnh vượt 16 MB trước khi upload',()=>{
  const value=body(),large=fakePngDataUrl(6*1024*1024);
  value.evidenceImages={
    'daoDuc::dd-rl::ky1':{name:'rl1.jpg',dataBase64:large},
    'hocTap::ht-diem::ky1':{name:'gpa1.jpg',dataBase64:large},
    'theLuc::tl-gdtc':{name:'gdtc.jpg',dataBase64:large}
  };
  assert.match(context.audit.validateSubmissionPayload(value),/16 MB/);
});
test('chứng chỉ cấp cao vẫn phải có điểm đỗ hợp lệ',()=>{
  const value=body();Object.assign(value.data.hoiNhap,{ngoaiNguMethod:'certificate',ngoaiNguCertificateType:'HSK',ngoaiNguCertificateScore:'',ngoaiNguCertificateDetails:{hskLevel:4,hskScore:0,hskk:'Sơ cấp'}});
  assert.equal(context.audit.isValidNgoaiNguCertificate(value.data),false);
  value.data.hoiNhap.ngoaiNguCertificateDetails={hskLevel:4,hskScore:180,hskk:'Sơ cấp'};
  assert.equal(context.audit.isValidNgoaiNguCertificate(value.data),true);
});
test('frontend và backend đồng bộ các ca biên chứng chỉ ngoại ngữ',()=>{
  const cases=[
    ['2025','K70','TOEIC','350',{},true],['2025','K70','TOEIC','349',{},false],
    ['2022','K67','IELTS','5.5',{},true],['2022','K67','IELTS','5',{},false],
    ['2025','K70','TOEIC_4','',{listening:275,speaking:120,reading:275,writing:120},true],
    ['2025','K70','JLPT','',{level:'N3',score:''},false],['2025','K70','JLPT','',{level:'N3',score:95},true],
    ['2025','K70','DELF','',{level:'B1',score:0},false],['2025','K70','DELF','',{level:'B1',score:50},true],
    ['2025','K70','HSK','',{hskLevel:4,hskScore:0,hskk:'Sơ cấp'},false],['2025','K70','HSK','',{hskLevel:4,hskScore:180,hskk:'Sơ cấp'},true]
  ];
  for(const [year,khoa,type,score,details,expected] of cases){
    const hn={ngoaiNguMethod:'certificate',ngoaiNguCertificateType:type,ngoaiNguCertificateScore:score,ngoaiNguCertificateDetails:details};
    const backend=context.audit.isValidNgoaiNguCertificate({personal:{mssv:year+'12345'},hoiNhap:hn});
    const frontend=certContext.validateCert(hn,khoa).ok;
    assert.equal(backend,expected,`${khoa} ${type} backend`);assert.equal(frontend,expected,`${khoa} ${type} frontend`);
  }
});
test('server từ chối bytes không khớp MIME ảnh',()=>{
  assert.throws(()=>imageContext.parse('data:image/png;base64,QUJDRA=='),/không khớp/);
  assert.doesNotThrow(()=>imageContext.parse('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'));
});
test('payload ảnh hỏng bị trả về lỗi dữ liệu trước khi upload',()=>{
  const value=body();value.evidenceImages['theLuc::tl-gdtc']={name:'gia.png',dataBase64:'data:image/png;base64,QUJDRA=='};
  assert.match(context.audit.validateSubmissionPayload(value),/Ảnh gia.png không hợp lệ/);
});
test('tên người kiểm tra được chuẩn hóa để dùng lại nhất quán',()=>{
  assert.equal(context.audit.normalizeReviewerName('  Nguyễn   Văn A  '),'Nguyễn Văn A');
  assert.equal(context.audit.reviewerNameKey('NGUYỄN VĂN A'),context.audit.reviewerNameKey('nguyen van a'));
});
test('bản kiểm tra chỉ lưu lên đúng phiên bản hồ sơ đã mở',()=>{
  assert.equal(context.audit.submissionVersionMatches('2026-08-17T08:00:00.000Z','2026-08-17T08:00:00.000Z'),true);
  assert.equal(context.audit.submissionVersionMatches('2026-08-17T08:00:00.001Z','2026-08-17T08:00:00.000Z'),false);
});

test('rate limit tách khóa: gửi hồ sơ theo MSSV, đăng nhập chỉ đếm lần sai',()=>{
  // submit khóa theo MSSV nên nhiều sinh viên chung một IP NAT không chặn nhau.
  assert.match(source,/const submitLimit=rateLimit\(\{[^}]*keyOf:studentKeyOf/);
  // Vẫn còn một hạn mức theo IP để chống flood, nhưng ở mức cao hơn nhiều.
  assert.match(source,/const submitIpLimit=rateLimit\(\{windowMs:10\*60_000,max:120/);
  assert.match(source,/app\.post\('\/api\/submissions',submitIpLimit,submitLimit,/);
  // Đăng nhập không còn dùng middleware đếm mọi request.
  assert.doesNotMatch(source,/const authLimit=/);
  assert.match(source,/app\.post\('\/api\/auth',async\(req,res\)=>/);
  assert.match(source,/Chỉ lần SAI mới bị tính vào hạn mức/);
  // express.json phải chạy trước limiter vì limiter đọc req.body.mssv.
  assert.ok(source.indexOf("app.use(express.json(")<source.indexOf("app.use('/api',globalApiLimit)"),
    'express.json phải đăng ký trước globalApiLimit');
});

test('mọi phản hồi lỗi của /api đều được gắn scope để frontend phân loại',()=>{
  assert.match(source,/body\.scope=status===401\|\|status===403\?'permission'/);
  assert.match(source,/code:'STORAGE_DOWN',scope:'storage'/);
  assert.match(source,/code:'RATE_LIMITED',scope:'ratelimit'/);
  assert.match(source,/code:'BAD_PASSWORD',scope:'permission'/);
});
