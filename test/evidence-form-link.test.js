const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const rules=require('../public/js/shared-rules.js');

// ---- Phía máy chủ: link đơn minh chứng phải là URL https thật ----
const source=fs.readFileSync(require.resolve('../server.js'),'utf8');
const validationBlock=source.slice(source.indexOf('const MAX_EVIDENCE_IMAGE_BYTES'),source.indexOf("app.get('/api/config'"));
const context={URL,Buffer,SV5TRules:rules};
vm.createContext(context);
vm.runInContext(validationBlock+'\nglobalThis.validate=validateSubmissionPayload;',context);

function groups(ids){return Object.fromEntries(ids.map(id=>[id,{yes:false,pending:false}]));}
function body(formLinks){
  const data={
    personal:{fullName:'Nguyễn Văn A',mssv:'202512345',className:'K70-A',khoaTruong:'Điện - Điện tử',birthYear:2006,positions:[''],phone:''},
    daoDuc:{renLuyenKy1:80,renLuyenKy2:80,khongViPham:true,groups:groups(rules.REQUIRED_GROUPS.daoDuc)},
    hocTap:{dien:'thuong',diemKy1:2.8,diemKy2:2.8,tinChiKy1:15,tinChiKy2:15,groups:groups(rules.REQUIRED_GROUPS.hocTap)},
    theLuc:{hoanThanhDuGDTC:false,khongDiemF:true,groups:groups(rules.REQUIRED_GROUPS.theLuc)},
    tinhNguyen:{items:[],pending:true,khenThuong:false},
    hoiNhap:{fixed:groups(rules.REQUIRED_GROUPS.hoiNhapFixed),groups:groups(rules.REQUIRED_GROUPS.hoiNhap),ngoaiNguMethod:'notMet',ngoaiNguPending:false},
    khac:{items:[]},evidence:{'daoDuc::dd-rl':'later','hocTap::ht-diem':'later','theLuc::tl-gdtc':'later'},
    evidenceForms:formLinks||{}
  };
  return {fullName:'Nguyễn Văn A',mssv:'202512345',className:'K70-A',data,evidenceImages:{},removedEvidenceImageKeys:[]};
}

test('link đơn https hợp lệ vẫn được chấp nhận',()=>{
  assert.equal(context.validate(body({'daoDuc::dd-rl':'https://docs.google.com/document/d/abc/edit'})),null);
});

test('máy chủ chặn link đơn dùng javascript:',()=>{
  const msg=context.validate(body({'daoDuc::dd-rl':'javascript:alert(document.cookie)'}));
  assert.match(String(msg),/[Ll]ink đơn/);
});

test('máy chủ chặn link đơn dùng http thường và chuỗi rác',()=>{
  assert.match(String(context.validate(body({'daoDuc::dd-rl':'http://docs.google.com/abc'}))),/[Ll]ink đơn/);
  assert.match(String(context.validate(body({'daoDuc::dd-rl':'khong-phai-url'}))),/[Ll]ink đơn/);
});

test('bỏ trống link đơn vẫn hợp lệ',()=>{
  assert.equal(context.validate(body({'daoDuc::dd-rl':''})),null);
});

// ---- Phía trình duyệt: chỉ dựng thẻ liên kết cho URL https ----
const appSource=fs.readFileSync(require.resolve('../public/js/app.js'),'utf8');
const feBlock=appSource.slice(appSource.indexOf('function evidenceFormLinkHref'),appSource.indexOf('function renderImageSlot'));
const feContext={URL};
vm.createContext(feContext);
vm.runInContext(feBlock+'\nglobalThis.href=evidenceFormLinkHref;',feContext);

test('chỉ URL https mới được dựng thành liên kết bấm được',()=>{
  assert.equal(feContext.href('https://docs.google.com/document/d/abc/edit'),'https://docs.google.com/document/d/abc/edit');
  assert.equal(feContext.href('  https://drive.google.com/file/x  '),'https://drive.google.com/file/x');
});

test('không dựng liên kết cho javascript:, http: hay chuỗi rác',()=>{
  assert.equal(feContext.href('javascript:alert(1)'),null);
  assert.equal(feContext.href('http://docs.google.com/abc'),null);
  assert.equal(feContext.href('data:text/html,<script>x</script>'),null);
  assert.equal(feContext.href('chua-dien-gi'),null);
  assert.equal(feContext.href(''),null);
  assert.equal(feContext.href(null),null);
});
