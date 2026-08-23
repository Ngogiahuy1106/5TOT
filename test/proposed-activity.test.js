const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const rules=require('../public/js/shared-rules.js');

// ---- Luồng "Đề xuất hoạt động" phía trình duyệt ----
const appSource=fs.readFileSync(require.resolve('../public/js/app.js'),'utf8');
const block=appSource.slice(appSource.indexOf('function normalizeVN'),appSource.indexOf('function resolveActivityCatalogKey'));
const appContext={
  window:{SV5TRules:rules},
  removeDiacritics:value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D'),
  newStableId:prefix=>`${prefix}-${Math.random().toString(36).slice(2)}`
};
vm.createContext(appContext);
vm.runInContext(block+'\nglobalThis.resolve=resolveProposedActivity;',appContext);

const CATALOG=[{id:'TL-01',name:'Giải chạy "10000 bước chân"',yeuCau:'Có giấy xác nhận',minhchung:'Ảnh BIB'}];

test('đề xuất trùng tên trong danh mục được gắn thành mục chính thức, không đánh dấu proposed',()=>{
  const r=appContext.resolve('Giải chạy "10000 bước chân"',CATALOG,[]);
  assert.equal(r.status,'official');
  assert.equal(r.item.id,'TL-01');
  assert.equal(r.item.proposed,undefined);
  assert.equal(r.item.yeuCau,'Có giấy xác nhận');
});

test('so khớp danh mục bỏ qua dấu, hoa thường và khoảng trắng thừa',()=>{
  const r=appContext.resolve('  giai  CHAY "10000 buoc chan"  ',CATALOG,[]);
  assert.equal(r.status,'official');
  assert.equal(r.item.id,'TL-01');
});

test('đề xuất trùng hoạt động đã thêm bị từ chối',()=>{
  const existing=[{id:'proposed-1',name:'Hội thao sinh viên Bách khoa',proposed:true}];
  const r=appContext.resolve('hội thao sinh viên bách khoa',CATALOG,existing);
  assert.equal(r.status,'duplicate');
});

test('đề xuất trùng mục chính thức đã chọn từ dropdown cũng bị từ chối',()=>{
  const r=appContext.resolve('Giải chạy "10000 bước chân"',CATALOG,[{id:'TL-01',name:'Giải chạy "10000 bước chân"'}]);
  assert.equal(r.status,'duplicate');
});

test('tên mới hoàn toàn mới được đánh dấu proposed',()=>{
  const r=appContext.resolve('Ngày hội hiến máu cấp Viện',CATALOG,[]);
  assert.equal(r.status,'proposed');
  assert.equal(r.item.proposed,true);
  assert.equal(r.item.name,'Ngày hội hiến máu cấp Viện');
});

test('hai đề xuất liên tiếp nhận mã khác nhau',()=>{
  const a=appContext.resolve('Hoạt động A',CATALOG,[]);
  const b=appContext.resolve('Hoạt động B',CATALOG,[]);
  assert.notEqual(a.item.id,b.item.id);
});

test('tên rỗng không tạo mục nào',()=>{
  assert.equal(appContext.resolve('   ',CATALOG,[]).status,'empty');
});

// ---- Chốt chặn phía máy chủ ----
const serverSource=fs.readFileSync(require.resolve('../server.js'),'utf8');
const serverBlock=serverSource.slice(serverSource.indexOf('const MAX_EVIDENCE_IMAGE_BYTES'),serverSource.indexOf("app.get('/api/config'"));
const serverContext={URL,Buffer,SV5TRules:rules};
vm.createContext(serverContext);
vm.runInContext(serverBlock+'\nglobalThis.validateGroupMaps=validateGroupMaps;',serverContext);

function groupStates(ids){return Object.fromEntries(ids.map(id=>[id,{yes:false,pending:false}]));}
function groupData(){
  return {
    daoDuc:{groups:groupStates(rules.REQUIRED_GROUPS.daoDuc)},
    hocTap:{groups:groupStates(rules.REQUIRED_GROUPS.hocTap)},
    theLuc:{groups:groupStates(rules.REQUIRED_GROUPS.theLuc)},
    hoiNhap:{fixed:groupStates(rules.REQUIRED_GROUPS.hoiNhapFixed),groups:groupStates(rules.REQUIRED_GROUPS.hoiNhap)}
  };
}

test('backend chặn hai đề xuất trùng tên dù khác mã',()=>{
  const data=groupData();
  data.theLuc.groups['TL-G2']={yes:true,pending:false,items:[
    {id:'proposed-a',name:'Giải chạy 10000 bước chân',proposed:true},
    {id:'proposed-b',name:'  Giai  CHAY 10000 buoc chan ',proposed:true}
  ]};
  assert.match(String(serverContext.validateGroupMaps(data)),/trùng/);
});

test('backend vẫn cho hai hoạt động khác tên',()=>{
  const data=groupData();
  data.theLuc.groups['TL-G2']={yes:true,pending:false,items:[
    {id:'TL-01',name:'Giải chạy 10000 bước chân'},
    {id:'proposed-b',name:'Hội thao sinh viên Bách khoa',proposed:true}
  ]};
  assert.equal(serverContext.validateGroupMaps(data),null);
});
