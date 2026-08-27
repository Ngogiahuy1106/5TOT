const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const appSource=fs.readFileSync(require.resolve('../public/js/app.js'),'utf8');
const serverSource=fs.readFileSync(require.resolve('../server.js'),'utf8');
const storageSource=fs.readFileSync(require.resolve('../public/js/storage.js'),'utf8');

// --- luật sinh minh chứng phía trình duyệt ---
const feBlock=appSource.slice(appSource.indexOf('function groupEvidenceItems'),appSource.indexOf('function evidenceDaoDuc'));
const feContext={
  EVIDENCE_DEFAULT_MANUAL:'m',EVIDENCE_DEFAULT_ACTIVITY:'a',EVIDENCE_DEFAULT_RANK:'r',EVIDENCE_DEFAULT_MEMBER:'v',
  normalizeRankValue:v=>String(v||''),manualYesNoLabel:g=>g.label
};
vm.createContext(feContext);
vm.runInContext(feBlock+'\nglobalThis.feItems=groupEvidenceItems;',feContext);

// --- luật sinh minh chứng phía máy chủ ---
const beBlock=serverSource.slice(serverSource.indexOf('function collectGroupEvidence'),serverSource.indexOf('function buildExpectedEvidence'));
const beContext={};
vm.createContext(beContext);
vm.runInContext(beBlock+'\nglobalThis.beCollect=collectGroupEvidence;',beContext);

const LIST=[{id:'DD-G1',type:'sheet',label:'Nhóm thử',minCount:1}];
function beKeys(gs){const out=[];beContext.beCollect('daoDuc',{'DD-G1':gs},out);return out.map(x=>x.key);}
function feKeys(gs){return Array.from(feContext.feItems(LIST,{'DD-G1':gs}),it=>'daoDuc::'+it.key);}

const ITEM={id:'DD-G1-9e0fob',name:'Cuộc thi tìm hiểu Nghị quyết'};
const CASES=[
  ['đã xác nhận Đạt',            {yes:true, pending:false,items:[ITEM]},true],
  ['chưa xác nhận (yes=null)',   {yes:null, pending:false,items:[ITEM]},false],
  ['đã chọn Không đạt',          {yes:false,pending:false,items:[ITEM]},false],
  ['đang để bổ sung sau',        {yes:true, pending:true, items:[ITEM]},false]
];

for(const [name,gs,expected] of CASES){
  test(`frontend và backend cùng luật - ${name}`,()=>{
    assert.deepEqual(feKeys(gs),beKeys(gs),'hai bên phải sinh cùng bộ khóa');
    assert.equal(feKeys(gs).length>0,expected);
  });
}

test('nhóm đã Đạt sinh đúng khóa của từng hoạt động',()=>{
  assert.deepEqual(feKeys(CASES[0][1]),['daoDuc::DD-G1:DD-G1-9e0fob']);
});

// --- payload ảnh gửi lên phải bỏ ảnh mồ côi ---
const storageBlock=storageSource.slice(storageSource.indexOf('function buildEvidenceImagesPayload'),storageSource.indexOf('function estimateDataUrlBytes'));

function runPayload(images,allowed){
  const context={
    state:{evidenceImages:images},
    currentEvidenceImageKeys:()=>new Set(allowed),
    console
  };
  vm.createContext(context);
  vm.runInContext(storageBlock+'\nglobalThis.out=buildEvidenceImagesPayload();',context);
  return {payload:context.out,state:context.state};
}

test('ảnh mồ côi bị loại khỏi payload, ảnh hợp lệ vẫn gửi',()=>{
  const {payload}=runPayload({
    'daoDuc::DD-G1:DD-G1-9e0fob':{dataUrl:'data:image/png;base64,AAAA',name:'a.png'},
    'daoDuc::dd-rl::ky1':{dataUrl:'data:image/png;base64,BBBB',name:'b.png'}
  },['daoDuc::dd-rl::ky1']);
  assert.deepEqual(Object.keys(payload),['daoDuc::dd-rl::ky1']);
});

test('ảnh mồ côi không bị xóa khỏi bản nháp để sinh viên thêm lại hoạt động là dùng được ngay',()=>{
  const {state}=runPayload({
    'daoDuc::DD-G1:DD-G1-9e0fob':{dataUrl:'data:image/png;base64,AAAA',name:'a.png'}
  },[]);
  assert.ok(state.evidenceImages['daoDuc::DD-G1:DD-G1-9e0fob'],'vẫn còn trong state');
});

test('ảnh chưa tải xong (không có dataUrl) không lọt vào payload',()=>{
  const {payload}=runPayload({'daoDuc::dd-rl::ky1':{name:'a.png'}},['daoDuc::dd-rl::ky1']);
  assert.deepEqual(Object.keys(payload),[]);
});
