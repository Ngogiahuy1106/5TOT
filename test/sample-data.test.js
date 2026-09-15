const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const rules=require('../public/js/shared-rules.js');

// Chạy nguyên app.js và storage.js trong vm với DOM giả, để dữ liệu mẫu đi qua đúng
// các hàm gom minh chứng và kiểm tra thật chứ không phải bản chép lại trong test.
// shared-rules.js nạp lại bên trong vm: isPlainObject so nguyên mẫu Object nên đối
// tượng tạo ở vm này không qua được bản luật nạp ở ngoài.
const appSource=fs.readFileSync(require.resolve('../public/js/app.js'),'utf8');
const storageSource=fs.readFileSync(require.resolve('../public/js/storage.js'),'utf8');
const rulesSource=fs.readFileSync(require.resolve('../public/js/shared-rules.js'),'utf8');
const serverSource=fs.readFileSync(require.resolve('../server.js'),'utf8');
const serverBlock=serverSource.slice(serverSource.indexOf('const MAX_EVIDENCE_IMAGE_BYTES'),serverSource.indexOf("app.get('/api/config'"));

const server=(()=>{
  const context={URL,Buffer,SV5TRules:rules};
  vm.createContext(context);
  vm.runInContext(serverBlock+'\nglobalThis.api={validateSubmissionPayload,computeServerReview};',context);
  return context.api;
})();

function makeApp(){
  const context={console,URL,crypto:globalThis.crypto,document:{getElementById:()=>({})}};
  vm.createContext(context);
  vm.runInContext('globalThis.window=globalThis;',context);
  vm.runInContext(rulesSource,context,{filename:'shared-rules.js'});
  vm.runInContext(appSource,context,{filename:'app.js'});
  vm.runInContext(storageSource,context,{filename:'storage.js'});
  vm.runInContext(`render=function(){};
    globalThis.app={state,APP_CONFIG,fillSampleData,applyActivityCatalog,serializeStateForStorage,validateSubmissionBeforeSend,
      buildSubmissionReview,collectProposedActivities,allCriterionGroupSources,applyActivityCatalogEdit,activityCatalogGroups,
      getActivityCatalogSnapshot,resolveActivityCatalogKey,normalizeCatalogText,EXCEL_CATEGORY_MAP,ACTIVITY_CATALOG_KEYS};`,context);
  return context.app;
}

const LINKS={linkXacNhanChung:'https://docs.google.com/document/d/chung/edit',linkXacNhanCLB:'https://docs.google.com/document/d/clb/edit',linkXacNhanNgoaiKhoa:'https://docs.google.com/document/d/ngoaikhoa/edit'};
const item=(id,name)=>({id,name,yeuCau:'Tham gia',minhchung:'Giấy chứng nhận của BTC'});
// Hai nhóm Hội nhập có chung hoạt động đứng đầu danh sách - đúng như danh mục thật.
const CATALOG={
  daoDuc:[item('DD-G1-a','Tham gia Cuộc thi tìm hiểu Nghị quyết Đại hội Đảng bộ')],
  daoDucDangDoan:[item('DD-G4-a','Tham gia Kiểm tra Nghị quyết Đại hội Đoàn toàn quốc')],
  hocTap:[item('HT-G3-a','Tham gia Kỳ thi Olympic Toán học cấp Đại học')],
  hocTapClb:[item('HT-G1-a','Tham gia Ban Chuyên môn CLB Học thuật')],
  hocTapNckh:[item('HT-G2-a','Tham gia đề tài Nghiên cứu Khoa học Sinh viên')],
  hocTapNhomNckh:[item('HT-G4-a','Tham gia nhóm Nghiên cứu Khoa học')],
  hocTapThamLuan:[],hocTapSangTao:[],
  theLuc:[item('TL-G2-a','Tham gia Giải chạy 10000 bước chân'),item('TL-G2-b','Tham gia Giải bóng đá SEEE CUP')],
  tinhNguyen:[item('TN-a','Tham gia Chương trình Chủ Nhật Đỏ'),item('TN-b','Tham gia đội hình tiếp sức mùa thi')],
  hoiNhapKhoaHoc:[item('HN-KH-a','Tham gia Khóa học LATEX BASIC')],
  hoiNhapCapDaiHoc:[item('HN-DH-a','Tham gia GREENTALK CHALLENGE 2025'),item('HN-DH-b','Tham gia Cuộc thi Santa Class')],
  hoiNhapGiaoLuu:[item('HN-G1-a','Tham gia Ngày hội Sinh viên 5 Tốt cấp cụm')],
  hoiNhapPhu:[item('HN-G2-a','Tham gia GREENTALK CHALLENGE 2025'),item('HN-G2-b','Tham gia Rung chuông Trí tuệ số')]
};
const emptyCatalog=()=>Object.fromEntries(Object.keys(CATALOG).map(key=>[key,[]]));

function sample(app,{catalog=CATALOG,links=LINKS}={}){
  Object.assign(app.APP_CONFIG,{linkXacNhanChung:'',linkXacNhanCLB:'',linkXacNhanNgoaiKhoa:''},links);
  assert.equal(app.applyActivityCatalog(JSON.parse(JSON.stringify(catalog))),true);
  app.fillSampleData();
  // Tạo lại đối tượng ở ngoài vm để máy chủ nhận đúng như một payload JSON.
  const data=JSON.parse(JSON.stringify(app.serializeStateForStorage({includeImageData:false})));
  return {fullName:data.personal.fullName,mssv:data.personal.mssv,className:data.personal.className,data,evidenceImages:{},removedEvidenceImageKeys:[]};
}

function assertSendable(app,body){
  assert.equal(app.validateSubmissionBeforeSend(),null);
  assert.equal(app.buildSubmissionReview().blockers,0);
  assert.equal(server.validateSubmissionPayload(body),null);
  const review=server.computeServerReview(body.data,{});
  assert.deepEqual([...review.missingCriteria],[]);
  assert.deepEqual([...review.missingEvidence],[]);
  assert.equal(review.blockers,0);
  return review;
}

test('dữ liệu mẫu qua được kiểm tra gửi hồ sơ ở cả giao diện và máy chủ',()=>{
  const app=makeApp();
  const body=sample(app);
  const review=assertSendable(app,body);
  // Mọi minh chứng đều nộp bằng link đơn, không mục nào để bổ sung sau.
  assert.ok(review.rows.every(row=>row.evidence.later===0&&row.evidence.missing===0));
  assert.ok(Object.values(body.data.evidence).length>=20);
  assert.ok(Object.values(body.data.evidence).every(status=>status==='form'));
  // Khai đủ mọi phần: không nhóm nào bỏ trống hoặc để bổ sung sau.
  assert.ok(review.rows.every(row=>row.criteria.later===0&&row.criteria.unanswered===0));
  assert.ok(body.data.reportDate.day&&body.data.reportDate.month);
});

test('dữ liệu mẫu không dùng một hoạt động cho hai tiêu chí khi danh mục trùng tên',()=>{
  const app=makeApp();
  const body=sample(app);
  const names=[];
  for(const states of [body.data.daoDuc.groups,body.data.hocTap.groups,body.data.theLuc.groups,body.data.hoiNhap.fixed,body.data.hoiNhap.groups]){
    for(const gs of Object.values(states)) for(const it of gs.items||[]) names.push(rules.normalizeActivityName(it.name));
  }
  assert.equal(new Set(names).size,names.length);
  assert.ok(names.includes(rules.normalizeActivityName('Tham gia GREENTALK CHALLENGE 2025')));
  // Có danh mục thì dùng hoạt động chính thức, không phải đề xuất.
  assert.equal(app.collectProposedActivities(app.allCriterionGroupSources()).length,0);
});

test('danh mục trống vẫn ra hồ sơ gửi được, hoạt động còn thiếu thành đề xuất',()=>{
  const app=makeApp();
  const body=sample(app,{catalog:emptyCatalog()});
  assertSendable(app,body);
  assert.ok(app.collectProposedActivities(app.allCriterionGroupSources()).length>=10);
  assert.ok(body.data.theLuc.groups['TL-G2'].items.length>=2);
});

test('chưa cấu hình link đơn thì minh chứng để bổ sung sau và vẫn gửi được',()=>{
  const app=makeApp();
  const body=sample(app,{links:{}});
  assertSendable(app,body);
  assert.ok(Object.values(body.data.evidence).every(status=>status==='later'));
  assert.deepEqual(body.data.evidenceForms,{});
});

test('thêm hoạt động sinh mã theo tên và chặn trùng tên trong cùng tiêu chí',()=>{
  const app=makeApp();
  app.applyActivityCatalog(JSON.parse(JSON.stringify(CATALOG)));
  const added=app.applyActivityCatalogEdit(app.getActivityCatalogSnapshot(),{type:'add',key:'theLuc',name:'  Tham gia Giải cầu lông SEEE  ',yeuCau:'Tham gia',minhchung:'GCN'});
  assert.equal(added.error,undefined);
  assert.equal(added.item.name,'Tham gia Giải cầu lông SEEE');
  assert.match(added.item.id,/^TL-G2-[a-z0-9]+$/);
  assert.equal(added.catalog.theLuc.length,3);
  // Cùng tên thì cùng mã, để bản nháp cũ của sinh viên vẫn khớp khi thêm lại.
  const again=app.applyActivityCatalogEdit(app.getActivityCatalogSnapshot(),{type:'add',key:'theLuc',name:'Tham gia Giải cầu lông SEEE'});
  assert.equal(again.item.id,added.item.id);
  const duplicate=app.applyActivityCatalogEdit(added.catalog,{type:'add',key:'theLuc',name:'tham gia giai cau long seee'});
  assert.match(duplicate.error,/đã có hoạt động/);
  assert.match(app.applyActivityCatalogEdit(app.getActivityCatalogSnapshot(),{type:'add',key:'theLuc',name:''}).error,/tên hoạt động/);
  assert.match(app.applyActivityCatalogEdit(app.getActivityCatalogSnapshot(),{type:'add',key:'theLuc',name:'Điểm <b>'}).error,/< hoặc >/);
  assert.match(app.applyActivityCatalogEdit(app.getActivityCatalogSnapshot(),{type:'add',key:'',name:'Hoạt động'}).error,/chọn tiêu chí/);
  // Cùng tên ở tiêu chí khác vẫn được thêm, như danh mục thật đang có.
  assert.equal(app.applyActivityCatalogEdit(app.getActivityCatalogSnapshot(),{type:'add',key:'hoiNhapGiaoLuu',name:'Tham gia GREENTALK CHALLENGE 2025'}).error,undefined);
});

test('sửa giữ nguyên mã, xóa bỏ đúng một hoạt động',()=>{
  const app=makeApp();
  app.applyActivityCatalog(JSON.parse(JSON.stringify(CATALOG)));
  const edited=app.applyActivityCatalogEdit(app.getActivityCatalogSnapshot(),{type:'edit',key:'theLuc',id:'TL-G2-a',name:'Tham gia Giải chạy 10000 bước chân lần thứ 10',yeuCau:'Ít nhất 12/21 ngày',minhchung:'Giấy chứng nhận'});
  assert.equal(edited.item.id,'TL-G2-a');
  assert.equal(edited.catalog.theLuc.find(x=>x.id==='TL-G2-a').yeuCau,'Ít nhất 12/21 ngày');
  assert.match(app.applyActivityCatalogEdit(app.getActivityCatalogSnapshot(),{type:'edit',key:'theLuc',id:'TL-G2-a',name:'Tham gia Giải bóng đá SEEE CUP'}).error,/đã có hoạt động/);
  const removed=app.applyActivityCatalogEdit(app.getActivityCatalogSnapshot(),{type:'delete',key:'hoiNhapPhu',id:'HN-G2-a'});
  assert.deepEqual([...removed.catalog.hoiNhapPhu.map(x=>x.id)],['HN-G2-b']);
  assert.equal(removed.catalog.hoiNhapCapDaiHoc.length,2);
  assert.match(app.applyActivityCatalogEdit(removed.catalog,{type:'delete',key:'hoiNhapPhu',id:'HN-G2-a'}).error,/không còn trong danh mục/);
});

test('bảng nhóm phủ đủ 14 nhóm danh mục và mô tả trong file Excel xuất ra nhập lại đúng nhóm',()=>{
  const app=makeApp();
  const groups=app.activityCatalogGroups();
  assert.deepEqual([...groups.map(g=>g.key)].sort(),[...app.ACTIVITY_CATALOG_KEYS].sort());
  for(const g of groups){
    assert.ok(g.label,`${g.key} thiếu mô tả`);
    const category=app.EXCEL_CATEGORY_MAP.find(entry=>app.normalizeCatalogText(g.section).includes(entry.match)).key;
    assert.equal(app.resolveActivityCatalogKey(category,g.kind,g.label),g.key,`${g.key} nhập lại sai nhóm`);
  }
});
