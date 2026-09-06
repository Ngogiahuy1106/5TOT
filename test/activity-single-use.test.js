const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const rules=require('../public/js/shared-rules.js');

// ---- Phía trình duyệt: tìm hoạt động đã dùng ở tiêu chí khác ----
const appSource=fs.readFileSync(require.resolve('../public/js/app.js'),'utf8');
const feBlock=appSource.slice(appSource.indexOf('function findActivityUsedInOtherGroup'),appSource.indexOf('function allCriterionGroupSources'));
const feCtx={window:{SV5TRules:rules}};
vm.createContext(feCtx);
vm.runInContext(feBlock+'\nglobalThis.tim=findActivityUsedInOtherGroup;',feCtx);

const NGAY_HOI='Tham gia Ngày hội “Sinh viên 5 tốt” cụm Hội số 1';
function nguon(){
  return [
    {list:[{id:'DD-G1',label:'Cuộc thi về chủ nghĩa Mác - Lênin'}],states:{'DD-G1':{items:[]}}},
    {list:[{id:'TL-G2',label:'Tham gia ít nhất 02 hoạt động thể dục thể thao'}],states:{'TL-G2':{items:[]}}}
  ];
}

test('hoạt động chưa dùng ở đâu thì thêm được',()=>{
  assert.equal(feCtx.tim(NGAY_HOI,'DD-G1',nguon()),null);
});

test('đã dùng ở tiêu chí khác thì báo đúng tiêu chí đó',()=>{
  const n=nguon(); n[1].states['TL-G2'].items=[{id:'TL-G2-18ukuiu',name:NGAY_HOI}];
  const kq=feCtx.tim(NGAY_HOI,'DD-G1',n);
  assert.ok(kq,'phải phát hiện được');
  assert.equal(kq.groupId,'TL-G2');
  assert.match(kq.label,/thể dục thể thao/);
});

test('không tự chặn chính tiêu chí đang thêm',()=>{
  // Thêm lại vào đúng nhóm đã có là việc của chống trùng trong nhóm, không phải ở đây.
  const n=nguon(); n[0].states['DD-G1'].items=[{id:'DD-G1-eyxvnd',name:NGAY_HOI}];
  assert.equal(feCtx.tim(NGAY_HOI,'DD-G1',n),null);
});

test('đối chiếu theo tên chuẩn hóa, không theo mã',()=>{
  // Cùng hoạt động nhưng danh mục cấp hai mã khác nhau vì tiền tố nhóm khác nhau.
  const n=nguon(); n[1].states['TL-G2'].items=[{id:'TL-G2-18ukuiu',name:'  tham gia NGAY HOI “Sinh vien 5 tot” cum Hoi so 1  '}];
  assert.ok(feCtx.tim(NGAY_HOI,'DD-G1',n),'khác dấu, hoa thường và khoảng trắng vẫn phải khớp');
});

test('hoạt động khác tên thì không chặn nhầm',()=>{
  const n=nguon(); n[1].states['TL-G2'].items=[{id:'x',name:'Tham gia Giải bóng đá nam SEEE CUP 2025'}];
  assert.equal(feCtx.tim(NGAY_HOI,'DD-G1',n),null);
});

test('tên rỗng thì không chặn gì',()=>{
  assert.equal(feCtx.tim('','DD-G1',nguon()),null);
  assert.equal(feCtx.tim(null,'DD-G1',nguon()),null);
});

// ---- Phía máy chủ ----
const serverSource=fs.readFileSync(require.resolve('../server.js'),'utf8');
const beBlock=serverSource.slice(serverSource.indexOf('const MAX_EVIDENCE_IMAGE_BYTES'),serverSource.indexOf("app.get('/api/config'"));
const beCtx={URL,Buffer,SV5TRules:rules};
vm.createContext(beCtx);
vm.runInContext(beBlock+'\nglobalThis.validateGroupMaps=validateGroupMaps;',beCtx);

function gs(ids){return Object.fromEntries(ids.map(id=>[id,{yes:false,pending:false}]));}
function duLieu(){
  return {
    daoDuc:{groups:gs(rules.REQUIRED_GROUPS.daoDuc)},
    hocTap:{groups:gs(rules.REQUIRED_GROUPS.hocTap)},
    theLuc:{groups:gs(rules.REQUIRED_GROUPS.theLuc)},
    hoiNhap:{fixed:gs(rules.REQUIRED_GROUPS.hoiNhapFixed),groups:gs(rules.REQUIRED_GROUPS.hoiNhap)}
  };
}

test('máy chủ chặn một hoạt động dùng cho hai tiêu chí khác nhau',()=>{
  const d=duLieu();
  d.daoDuc.groups['DD-G1']={yes:true,pending:false,items:[{id:'DD-G1-eyxvnd',name:NGAY_HOI}]};
  d.theLuc.groups['TL-G2']={yes:true,pending:false,items:[{id:'TL-G2-18ukuiu',name:NGAY_HOI}]};
  assert.match(String(beCtx.validateGroupMaps(d)),/tiêu chí khác/);
});

test('máy chủ chặn cả khi hai tiêu chí nằm cùng một mục',()=>{
  const d=duLieu();
  d.hoiNhap.fixed['HN-CAP-DAI-HOC']={yes:true,pending:false,items:[{id:'HN-DH-ag6vuv',name:'Tham gia MATHCODE CONTEST'}]};
  d.hoiNhap.groups['HN-G2']={yes:true,pending:false,items:[{id:'HN-G2-vflzlq',name:'Tham gia MATHCODE CONTEST'}]};
  assert.match(String(beCtx.validateGroupMaps(d)),/tiêu chí khác/);
});

test('dùng đúng một hoạt động cho đúng một tiêu chí thì hợp lệ',()=>{
  const d=duLieu();
  d.daoDuc.groups['DD-G1']={yes:true,pending:false,items:[{id:'DD-G1-eyxvnd',name:NGAY_HOI}]};
  d.theLuc.groups['TL-G2']={yes:true,pending:false,items:[{id:'x',name:'Tham gia Giải bóng đá nam SEEE CUP 2025'}]};
  assert.equal(beCtx.validateGroupMaps(d),null);
});
