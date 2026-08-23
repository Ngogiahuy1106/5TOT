const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const SV5TRules=require('../public/js/shared-rules.js');

const serverSource=fs.readFileSync(require.resolve('../server.js'),'utf8');

function runServerFn(startMarker,endMarker,extraContext){
  const start=serverSource.indexOf(startMarker);
  const end=serverSource.indexOf(endMarker,start);
  return vm.runInNewContext(serverSource.slice(start,end)+`\n${startMarker.match(/function (\w+)/)[1]};`,Object.assign({SV5TRules,Number,String,Array,Object,Math},extraContext||{}));
}

test('ngày hợp lệ theo đúng định dạng YYYY-MM-DD và tồn tại thật',()=>{
  assert.equal(SV5TRules.isValidVolunteerDate('2025-10-31'),true);
  assert.equal(SV5TRules.isValidVolunteerDate('2026-02-29'),false,'2026 không phải năm nhuận');
  assert.equal(SV5TRules.isValidVolunteerDate('2024-02-29'),true,'2024 là năm nhuận');
  assert.equal(SV5TRules.isValidVolunteerDate('2025-13-01'),false);
  assert.equal(SV5TRules.isValidVolunteerDate('31/10/2025'),false);
  assert.equal(SV5TRules.isValidVolunteerDate(''),false);
  assert.equal(SV5TRules.isValidVolunteerDate(null),false);
});

test('danh sách ngày được sắp xếp, khử trùng và bỏ giá trị rác',()=>{
  const result=SV5TRules.normalizeVolunteerDates(['2025-10-31','2025-10-19','2025-10-31','rác','','2025-10-24']);
  assert.deepEqual(result,['2025-10-19','2025-10-24','2025-10-31']);
  assert.deepEqual(SV5TRules.normalizeVolunteerDates('không phải mảng'),[]);
  assert.deepEqual(SV5TRules.normalizeVolunteerDates(undefined),[]);
});

test('chỉ ghi năm ở mốc cuối cùng của mỗi năm, đúng mẫu báo cáo của Ban',()=>{
  // "2. Hỗ trợ đại hội chi đoàn ... (2 ngày: 19/10, 24/10, 26/10, 31/10/2025)."
  assert.equal(
    SV5TRules.formatVolunteerDates(['2025-10-19','2025-10-24','2025-10-26','2025-10-31']),
    '19/10, 24/10, 26/10, 31/10/2025'
  );
  assert.equal(SV5TRules.formatVolunteerDates(['2025-10-31']),'31/10/2025');
  // "5. Hỗ trợ phát lịch Tết 2026 ... (1 ngày: 26/01, 27/01/2026)."
  assert.equal(SV5TRules.formatVolunteerDates(['2026-01-26','2026-01-27']),'26/01, 27/01/2026');
  // "7. ... (1 ngày: 28/02, 01/03/2026)."
  assert.equal(SV5TRules.formatVolunteerDates(['2026-02-28','2026-03-01']),'28/02, 01/03/2026');
  // Bắc qua hai năm: mỗi năm giữ mốc cuối của chính nó.
  assert.equal(SV5TRules.formatVolunteerDates(['2025-12-30','2025-12-31','2026-01-02']),'30/12, 31/12/2025, 02/01/2026');
  assert.equal(SV5TRules.formatVolunteerDates([]),'');
});

test('một dòng báo cáo thành tích ghép đúng tên, số ngày và các mốc ngày',()=>{
  assert.equal(
    SV5TRules.formatVolunteerItem({text:'Hỗ trợ hội thảo tuyển dụng Samsung sharing 2025',days:0.5,dates:['2025-10-31']}),
    'Hỗ trợ hội thảo tuyển dụng Samsung sharing 2025 (0.5 ngày: 31/10/2025)'
  );
  assert.equal(
    SV5TRules.formatVolunteerItem({text:'Hỗ trợ đại hội chi đoàn',days:2,dates:['2025-10-19','2025-10-24','2025-10-26','2025-10-31']}),
    'Hỗ trợ đại hội chi đoàn (2 ngày: 19/10, 24/10, 26/10, 31/10/2025)'
  );
  // Hồ sơ cũ chưa có `dates` vẫn hiển thị được, chỉ thiếu phần liệt kê ngày.
  assert.equal(SV5TRules.formatVolunteerItem({text:'Hoạt động cũ',days:1}),'Hoạt động cũ (1 ngày)');
});

test('phát hiện đúng hoạt động chưa liệt kê ngày',()=>{
  const items=[
    {text:'Có ngày',days:1,dates:['2025-10-31']},
    {text:'Thiếu ngày',days:1,dates:[]},
    {text:'Không có trường dates',days:1},
    {text:'',days:1,dates:['rác']}
  ];
  assert.deepEqual(SV5TRules.volunteerItemsMissingDates(items),['Thiếu ngày','Không có trường dates','(hoạt động chưa đặt tên)']);
  assert.deepEqual(SV5TRules.volunteerItemsMissingDates([]),[]);
});

test('backend chặn gửi hồ sơ khi thiếu ngày tình nguyện',()=>{
  const computeServerReview=runServerFn('function computeServerReview(data,evidenceImages){','\nasync function getSubmissionWindow',
    {createReviewRows:runServerFn('function createReviewRows(){','\nfunction countServerGroupDeclarations'),
     buildExpectedEvidence:()=>[],
     countServerGroupDeclarations:()=>{},
     isValidNgoaiNguCertificate:()=>true});
  const base={
    daoDuc:{renLuyenKy1:'90',renLuyenKy2:'90',khongViPham:true,groups:{}},
    hocTap:{diemKy1:'3.5',diemKy2:'3.5',tinChiKy1:'15',tinChiKy2:'15',groups:{}},
    theLuc:{hoanThanhDuGDTC:true,groups:{}},
    hoiNhap:{fixed:{},groups:{},ngoaiNguMethod:'courseB'},
    evidence:{},evidenceForms:{}
  };

  const missing={...base,tinhNguyen:{items:[{text:'Hiến máu',days:5,dates:[]}],pending:false}};
  const missingReview=computeServerReview(missing,{});
  assert.ok(missingReview.blockers>0,'thiếu ngày phải bị chặn');
  assert.ok(missingReview.missingCriteria.some(text=>/chưa liệt kê ngày tham gia/.test(text)));

  const noDays={...base,tinhNguyen:{items:[{text:'Hiến máu',days:0,dates:['2025-10-31']}],pending:true}};
  assert.ok(computeServerReview(noDays,{}).missingCriteria.some(text=>/chưa nhập số ngày quy đổi/.test(text)));

  const complete={...base,tinhNguyen:{items:[{text:'Hiến máu',days:5,dates:['2025-10-31']}],pending:false}};
  const completeReview=computeServerReview(complete,{});
  assert.equal(completeReview.missingCriteria.filter(text=>/Tình nguyện/.test(text)).length,0);
});

test('backend từ chối ngày sai định dạng trong payload',()=>{
  const validateActivityArrays=runServerFn('function validateActivityArrays(data){','\nfunction validateGroupMaps');
  const ok={tinhNguyen:{items:[{text:'A',days:1,dates:['2025-10-31']}]},khac:{items:[]}};
  assert.equal(validateActivityArrays(ok),null);

  const badFormat={tinhNguyen:{items:[{text:'A',days:1,dates:['31/10/2025']}]},khac:{items:[]}};
  assert.match(String(validateActivityArrays(badFormat)),/không đúng định dạng YYYY-MM-DD/);

  const notArray={tinhNguyen:{items:[{text:'A',days:1,dates:'2025-10-31'}]},khac:{items:[]}};
  assert.match(String(validateActivityArrays(notArray)),/không hợp lệ/);

  const tooMany={tinhNguyen:{items:[{text:'A',days:1,dates:new Array(SV5TRules.MAX_VOLUNTEER_DATES+1).fill('2025-10-31')}]},khac:{items:[]}};
  assert.match(String(validateActivityArrays(tooMany)),/tối đa/);

  // Hồ sơ cũ hoàn toàn không có trường `dates` vẫn phải qua được validation.
  const legacy={tinhNguyen:{items:[{text:'A',days:1}]},khac:{items:[]}};
  assert.equal(validateActivityArrays(legacy),null);
});

// ---- Chống khai trùng hoạt động tình nguyện ----
// Tổng ngày tình nguyện được cộng dồn theo từng dòng, nên hai dòng trùng tên là
// một cách thổi phồng số ngày để chạm mốc 5 ngày. Chặn theo mã không bắt được
// vì mỗi đề xuất tự sinh một mã riêng.

test('backend chặn hai hoạt động tình nguyện trùng tên dù khác mã',()=>{
  const validateActivityArrays=runServerFn('function validateActivityArrays(data){','\nfunction validateGroupMaps');

  const spacingAndCase={tinhNguyen:{items:[
    {id:'tn-1',text:'Mùa hè xanh',days:3,dates:['2025-07-01']},
    {id:'tn-2',text:'  MÙA  HÈ   XANH ',days:3,dates:['2025-07-02']}
  ]},khac:{items:[]}};
  assert.match(String(validateActivityArrays(spacingAndCase)),/tình nguyện bị trùng tên/);

  const noDiacritics={tinhNguyen:{items:[
    {id:'tn-1',text:'Mùa hè xanh',days:3,dates:['2025-07-01']},
    {id:'tn-2',text:'mua he xanh',days:3,dates:['2025-07-02']}
  ]},khac:{items:[]}};
  assert.match(String(validateActivityArrays(noDiacritics)),/tình nguyện bị trùng tên/);

  const distinct={tinhNguyen:{items:[
    {id:'tn-1',text:'Mùa hè xanh',days:3,dates:['2025-07-01']},
    {id:'tn-2',text:'Hiến máu',days:2,dates:['2025-07-02']}
  ]},khac:{items:[]}};
  assert.equal(validateActivityArrays(distinct),null);

  const otherAchievements={tinhNguyen:{items:[]},khac:{items:[
    {id:'k-1',text:'Giải nhất NCKH'},{id:'k-2',text:'giai nhat  nckh'}
  ]}};
  assert.match(String(validateActivityArrays(otherAchievements)),/thành tích khác bị trùng tên/);
});

test('frontend và backend dùng chung một luật so trùng tên tình nguyện',()=>{
  const appSource=fs.readFileSync(require.resolve('../public/js/app.js'),'utf8');
  const block=appSource.slice(appSource.indexOf('function volunteerDatesOf'),appSource.indexOf('function renderVolunteerDateEditor'));
  const ctx={window:{SV5TRules}};
  vm.createContext(ctx);
  vm.runInContext(block+'\nglobalThis.exists=volunteerItemExists;',ctx);

  const items=[{id:'tn-1',text:'Mùa hè xanh'}];
  assert.equal(ctx.exists(items,{name:'  MÙA  HÈ  XANH '}),true,'khác hoa thường và khoảng trắng vẫn là trùng');
  assert.equal(ctx.exists(items,{name:'mua he xanh'}),true,'bỏ dấu vẫn là trùng');
  assert.equal(ctx.exists(items,{name:'Hiến máu'}),false);
  assert.equal(ctx.exists(items,{id:'tn-1'}),true,'trùng mã vẫn phải bắt được');
  assert.equal(ctx.exists([],{name:'Mùa hè xanh'}),false);
});
