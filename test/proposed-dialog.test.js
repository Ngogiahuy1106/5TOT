const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

// Bảng tổng hợp hoạt động đề xuất hiện ở bước Minh chứng phải khớp đúng những dòng
// in màu xanh trong báo cáo, không hơn không kém.
const appSource=fs.readFileSync(require.resolve('../public/js/app.js'),'utf8');
const block=appSource.slice(appSource.indexOf('function collectProposedActivities'),appSource.indexOf('function warnActivityAlreadyUsed'));
const ctx={};
vm.createContext(ctx);
vm.runInContext(block+'\nglobalThis.gom=collectProposedActivities;',ctx);

function nguon(){
  return [
    {section:'Đạo đức',list:[{id:'DD-G1',label:'Cuộc thi về chủ nghĩa Mác - Lênin'}],states:{'DD-G1':{yes:true,pending:false,items:[]}}},
    {section:'Thể lực',list:[{id:'TL-G2',label:'Tham gia ít nhất 02 hoạt động thể thao'}],states:{'TL-G2':{yes:true,pending:false,items:[]}}}
  ];
}
const gom=n=>Array.from(ctx.gom(n),x=>({...x}));

test('lấy đúng hoạt động đề xuất, kèm mục và tiêu chí',()=>{
  const n=nguon();
  n[1].states['TL-G2'].items=[{id:'proposed-1',name:'Giải chạy của khoa',proposed:true}];
  assert.deepEqual(gom(n),[{section:'Thể lực',criterion:'Tham gia ít nhất 02 hoạt động thể thao',name:'Giải chạy của khoa'}]);
});

test('bỏ qua hoạt động chọn từ danh mục chính thức',()=>{
  const n=nguon();
  n[0].states['DD-G1'].items=[{id:'DD-G1-abc',name:'Cuộc thi chính thức'}];
  assert.deepEqual(gom(n),[]);
});

test('bỏ qua nhóm đang để bổ sung sau, vì báo cáo không in hoạt động của nhóm đó',()=>{
  const n=nguon();
  n[0].states['DD-G1']={yes:true,pending:true,items:[{id:'p',name:'Đề xuất A',proposed:true}]};
  assert.deepEqual(gom(n),[]);
});

test('bỏ qua nhóm đã chọn Không đạt',()=>{
  const n=nguon();
  n[0].states['DD-G1']={yes:false,pending:false,items:[{id:'p',name:'Đề xuất A',proposed:true}]};
  n[1].states['TL-G2']={yes:true,notMet:true,pending:false,items:[{id:'q',name:'Đề xuất B',proposed:true}]};
  assert.deepEqual(gom(n),[]);
});

test('bỏ qua tên rỗng và giữ đúng thứ tự các mục',()=>{
  const n=nguon();
  n[0].states['DD-G1'].items=[{id:'a',name:'  ',proposed:true},{id:'b',name:'Đề xuất Đạo đức',proposed:true}];
  n[1].states['TL-G2'].items=[{id:'c',name:'Đề xuất Thể lực',proposed:true}];
  assert.deepEqual(gom(n).map(x=>x.name),['Đề xuất Đạo đức','Đề xuất Thể lực']);
});

test('nguồn trống hoặc thiếu trạng thái nhóm thì không lỗi',()=>{
  assert.deepEqual(gom([]),[]);
  assert.deepEqual(gom([{section:'X',list:[{id:'G',label:'L'}],states:{}}]),[]);
});
