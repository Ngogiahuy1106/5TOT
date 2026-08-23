const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync(require.resolve('../public/js/app.js'),'utf8');
const serverSource=fs.readFileSync(require.resolve('../server.js'),'utf8');
// Mốc cắt dùng regex chứ không dùng chuỗi cứng: thêm `async` vào khai báo hàm
// từng làm lệch mốc và kéo theo cả file test đỏ vì một chữ thừa ở cuối lát cắt.
const EXPORT_EXCEL_AT=source.search(/(?:async\s+)?function exportCriteriaExcel/);
const block=source.slice(source.indexOf('const ACTIVITY_CATALOG_KEYS'),EXPORT_EXCEL_AT);

// Lấy danh sách nhóm thẳng từ app.js thay vì chép cứng, để test không lệch khi
// thêm/bớt nhóm danh mục (lần trước thêm hocTapClb đã làm cả file test đỏ).
const FRONTEND_KEYS=vm.runInNewContext(source.slice(source.indexOf('const ACTIVITY_CATALOG_KEYS'),source.indexOf('const ACTIVITY_CATALOG_PREFIXES'))+'\nACTIVITY_CATALOG_KEYS;');

function makeContext(){
  const CRITERIA=Object.fromEntries(FRONTEND_KEYS.map(key=>[key,[]]));
  const context={
    CRITERIA,
    removeDiacritics:value=>String(value||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D'),
    console
  };
  vm.createContext(context);
  vm.runInContext(block+'\nglobalThis.apply=applyActivityCatalog;globalThis.parseRows=parseActivityCatalogRows;globalThis.keys=ACTIVITY_CATALOG_KEYS;globalThis.ParseError=ActivityCatalogParseError;',context);
  return context;
}

// assert.throws không trả về error, nên bắt tay để kiểm tra danh sách issues.
function captureParseError(context,rows){
  try{ context.parseRows(rows); }
  catch(err){ assert.ok(err instanceof context.ParseError,'phải là ActivityCatalogParseError'); return err; }
  throw new assert.AssertionError({message:'parseRows lẽ ra phải ném lỗi'});
}

function emptyCatalog(context){
  return Object.fromEntries(Array.from(context.keys).map(key=>[key,[]]));
}

const HEADER=['Tiêu chí','Tiêu chí chính/phụ ','Mô tả tiêu chí cụ thể','Hoạt động','Yêu cầu','Cách thức minh chứng'];

test('ID hoạt động fallback không đổi khi sắp xếp lại Excel',()=>{
  const a=makeContext(),b=makeContext();
  const catalogA=emptyCatalog(a),catalogB=emptyCatalog(b);
  catalogA.daoDuc=[{name:'Hoạt động A'},{name:'Hoạt động B'}];
  catalogB.daoDuc=[{name:'Hoạt động B'},{name:'Hoạt động A'}];
  assert.equal(a.apply(catalogA),true);assert.equal(b.apply(catalogB),true);
  const idsA=Object.fromEntries(a.CRITERIA.daoDuc.map(item=>[item.name,item.id]));
  const idsB=Object.fromEntries(b.CRITERIA.daoDuc.map(item=>[item.name,item.id]));
  assert.deepEqual(idsA,idsB);
});

test('catalog mới thay toàn bộ dữ liệu cũ thay vì gộp',()=>{
  const context=makeContext();
  context.CRITERIA.daoDuc.push({id:'OLD',name:'Hoạt động cũ'});
  const catalog=emptyCatalog(context);
  catalog.daoDuc=[{id:'NEW',name:'Hoạt động mới',yeuCau:'Tham gia',minhchung:'GCN'}];
  assert.equal(context.apply(catalog),true);
  assert.deepEqual(context.CRITERIA.daoDuc.map(item=>item.id),['NEW']);
  assert.equal(context.CRITERIA.theLuc.length,0);
});

test('import mọi hoạt động, kể cả dòng CLB học thuật (HT-G1)',()=>{
  const context=makeContext();
  const rows=[
    HEADER,
    ['Đạo đức Tốt','Tiêu chí phụ','Tham gia các cuộc thi về chủ nghĩa Mác - Lênin, tư tưởng Hồ Chí Minh','Hoạt động DD','Tham gia','GCN'],
    ['Đạo đức Tốt','Tiêu chí phụ','Tham gia tích cực các cuộc thi về Đảng, Đoàn - Hội','Hoạt động Đoàn Hội','Tham gia','GCN'],
    ['Học Tập Tốt','Tiêu chí phụ','Là thành viên tham gia tích cực mảng/ban Chuyên môn/Nội dung của CLB học thuật','Ban chuyên môn CLB','Tham gia','Xác nhận BCN'],
    ['Học Tập Tốt','Tiêu chí phụ','Tham gia đề tài nghiên cứu khoa học sinh viên.','Đề tài NCKH','Thực hiện','Xác nhận GVHD'],
    ['Thể Lực Tốt','Tiêu chí phụ','','Giải thể thao','Tham gia','GCN'],
    ['Tình nguyện tốt','Tiêu chí chính','Tham gia ít nhất 05 ngày tình nguyện','Tình nguyện A',1,'Tham gia'],
    ['', 'Tiêu chí chính','Tham gia ít nhất 05 ngày tình nguyện','Tình nguyện B','0.5-1','Tham gia'],
    ['Hội Nhập Tốt','Tiêu chí chính','Hoàn thành ít nhất 01 khóa trang bị kỹ năng thực hành xã hội','Khóa kỹ năng','Hoàn thành','GCN'],
    ['Hội Nhập Tốt','Tiêu chí chính','Tham gia tích cực ít nhất 01 hoạt động hội nhập từ cấp đại học trở lên tổ chức.','Hoạt động hội nhập','Top 50','GCN'],
    ['Hội Nhập Tốt','Tiêu chí phụ','Tham gia ít nhất một hoạt động giao lưu quốc tế','Giao lưu quốc tế','Tham gia','GCN'],
    ['Hội Nhập Tốt','Tiêu chí phụ','Tham gia các cuộc thi về kiến thức Hội nhập hoặc có sử dụng Ngoại ngữ','Cuộc thi ngoại ngữ','Tham gia','GCN']
  ];
  const result=context.parseRows(rows);
  // Không còn dòng nào bị bỏ qua: HT-G1 giờ cũng là một nhóm danh mục.
  assert.equal(result.sourceCount,11);
  assert.equal(result.mappedCount,11);
  assert.equal(result.ignoredCount,undefined);
  assert.equal(result.catalog.daoDuc.length,1);
  assert.equal(result.catalog.daoDucDangDoan.length,1);
  assert.equal(result.catalog.hocTapClb.length,1);
  assert.equal(result.catalog.hocTapClb[0].name,'Ban chuyên môn CLB');
  assert.match(result.catalog.hocTapClb[0].id,/^HT-G1-/);
  assert.equal(result.catalog.hocTap.length,0);
  assert.equal(result.catalog.hocTapNckh.length,1);
  assert.equal(result.catalog.theLuc.length,1);
  assert.equal(result.catalog.tinhNguyen.length,2);
  assert.equal(result.catalog.hoiNhapKhoaHoc.length,1);
  assert.equal(result.catalog.hoiNhapCapDaiHoc.length,1);
  assert.equal(result.catalog.hoiNhapGiaoLuu.length,1);
  assert.equal(result.catalog.hoiNhapPhu.length,1);
});

test('mọi nhóm tiêu chí có hoạt động trong sheet đều dùng dropdown danh sách',()=>{
  // HT-G1 vừa chọn được từ danh mục vừa tự ghi qua nút "Đề xuất hoạt động".
  assert.match(source,/id:"HT-G1"[^\n]+type:"sheet"[^\n]+items:CRITERIA\.hocTapClb/);
  assert.match(source,/id:"DD-G4"[^\n]+type:"sheet"/);
  assert.match(source,/id:"HT-G2"[^\n]+type:"sheet"/);
  assert.match(source,/id:"HT-G4"[^\n]+type:"sheet"/);
  assert.match(source,/id:"HT-G5"[^\n]+type:"sheet"/);
  assert.match(source,/id:"HT-G6"[^\n]+type:"sheet"/);
  assert.match(source,/id:"HN-G1"[^\n]+type:"sheet"/);
  // Tình nguyện có ĐỦ HAI đường thêm: chọn từ danh mục và tự nhập tên hoạt động.
  assert.match(source,/select\.id\s*=\s*"tnSelect"/);
  assert.match(source,/id="tnCustomText"/);
  assert.match(source,/id="tnCustomAdd"/);
  // Cả hai đều hiện sẵn, không giấu sau nút bật/tắt như bản trước.
  assert.doesNotMatch(source,/tn\.proposeOpen/);
  assert.doesNotMatch(source,/id="tnText"/);
  assert.doesNotMatch(source,/tnCatalogList/);
});

test('hoạt động tự nhập trùng tên với danh mục sẽ được gắn vào mục chính thức',()=>{
  // Tránh việc cùng một hoạt động tồn tại hai bản: một "Từ danh mục", một "Tự nhập".
  // So khớp bằng normalizeActivityName của shared-rules - cùng một luật với bước
  // đề xuất của các nhóm khác và với validateActivityArrays ở backend.
  assert.match(source,/const official = CRITERIA\.tinhNguyen\.find\(c => window\.SV5TRules\.normalizeActivityName\(c\.name\) === key\)/);
  assert.match(source,/volunteerItemExists\(tn\.items,\{id:official\?\.id,name:text\}\)/);
  assert.doesNotMatch(source,/normalizeCatalogText\(c\.name\) === normalizeCatalogText\(text\)/,"không được quay lại normalizer riêng của bước tình nguyện");
});

test('mô tả không xác định làm import thất bại và báo đúng dòng',()=>{
  const context=makeContext();
  const rows=[
    HEADER,
    ['Học Tập Tốt','Tiêu chí phụ','Mô tả lạ','Hoạt động A','Tham gia','GCN']
  ];
  const error=captureParseError(context,rows);
  assert.equal(error.issues.length,1);
  assert.equal(error.issues[0].row,2);
  assert.equal(error.issues[0].column,'Mô tả tiêu chí cụ thể');
});

test('gom hết dòng lỗi trong một lần đọc thay vì dừng ở lỗi đầu tiên',()=>{
  const context=makeContext();
  const rows=[
    HEADER,
    ['Học Tập Tốt','Tiêu chí phụ','Mô tả lạ 1','Hoạt động A','Tham gia','GCN'],
    ['Học Tập Tốt','Tiêu chí phụ','Mô tả lạ 2','Hoạt động B','Tham gia','GCN'],
    ['Thể Lực Tốt','Tiêu chí phụ','','Giải X','Tham gia','GCN'],
    ['Thể Lực Tốt','Tiêu chí phụ','','Giải X','Tham gia','GCN'],
    ['Đạo đức Tốt','Tiêu chí phụ','Tham gia các cuộc thi về chủ nghĩa Mác - Lênin','Có <script>','Tham gia','GCN']
  ];
  const error=captureParseError(context,rows);
  assert.equal(error.issues.length,4);
  assert.equal(JSON.stringify(error.issues.map(issue=>issue.row)),JSON.stringify([2,3,5,6]));
  assert.match(error.issues[2].reason,/Trùng tên với hoạt động ở dòng 4/);
  assert.match(error.issues[3].reason,/ký tự < hoặc >/);
});

test('thiếu cột bắt buộc được liệt kê từng cột một',()=>{
  const context=makeContext();
  const rows=[['Tiêu chí','Hoạt động'],['Đạo đức Tốt','Hoạt động A']];
  const error=captureParseError(context,rows);
  assert.equal(JSON.stringify(error.issues.map(issue=>issue.column)),JSON.stringify(['Tiêu chí chính/phụ','Mô tả tiêu chí cụ thể','Yêu cầu','Cách thức minh chứng']));
});

test('frontend và backend chấp nhận cùng một bộ nhóm danh mục',()=>{
  const context=makeContext();
  const routeStart=serverSource.indexOf("app.put('/api/admin/activity-catalog'");
  const arrayStart=serverSource.indexOf('[',serverSource.indexOf('const allowedKeys=',routeStart));
  const arrayEnd=serverSource.indexOf('];',arrayStart)+1;
  const backendKeys=JSON.parse(JSON.stringify(vm.runInNewContext(serverSource.slice(arrayStart,arrayEnd))));
  assert.deepEqual(backendKeys,Array.from(context.keys));
});

test('ID fallback giống nhau giữa lúc import Excel và lúc tải catalog từ AppConfig',()=>{
  const context=makeContext();
  // Không có cột "Mã hoạt động" -> cả hai đường đều phải tự sinh ID từ cùng công thức.
  const rows=[
    HEADER,
    ['Đạo đức Tốt','Tiêu chí phụ','Tham gia các cuộc thi về chủ nghĩa Mác - Lênin, tư tưởng Hồ Chí Minh','Hoạt động DD','Tham gia','GCN'],
    ['Thể Lực Tốt','Tiêu chí phụ','','Giải thể thao','Tham gia','GCN'],
    ['Tình nguyện tốt','Tiêu chí chính','Tham gia ít nhất 05 ngày tình nguyện','Tình nguyện A',1,'Tham gia']
  ];
  const parsed=context.parseRows(rows);

  // Đường 1: import Excel -> lưu DB -> áp dụng ngay.
  assert.equal(context.apply(parsed.catalog),true);
  const afterImport=Object.fromEntries(Array.from(context.keys).map(key=>[key,context.CRITERIA[key].map(item=>item.id)]));

  // Đường 2: tải lại trang, AppConfig.activityCatalog trả về catalog không kèm ID.
  const reloaded=makeContext();
  const stripped=emptyCatalog(reloaded);
  for(const key of Array.from(reloaded.keys)) stripped[key]=parsed.catalog[key].map(({name,yeuCau,minhchung})=>({name,yeuCau,minhchung}));
  assert.equal(reloaded.apply(stripped),true);
  const afterReload=Object.fromEntries(Array.from(reloaded.keys).map(key=>[key,reloaded.CRITERIA[key].map(item=>item.id)]));

  // parsed.catalog đến từ realm của vm nên so sánh bằng JSON thay vì deepStrictEqual.
  assert.equal(JSON.stringify(afterReload),JSON.stringify(afterImport));
  assert.equal(JSON.stringify(afterImport.tinhNguyen),JSON.stringify(parsed.catalog.tinhNguyen.map(item=>item.id)));
});

test('applyActivityCatalog loại ID sai định dạng đúng như backend',()=>{
  const context=makeContext();
  const catalog=emptyCatalog(context);
  catalog.theLuc=[{id:'ID có dấu cách',name:'Giải chạy X'}];
  assert.equal(context.apply(catalog),true);
  assert.match(context.CRITERIA.theLuc[0].id,/^[A-Za-z0-9._:-]{1,100}$/);
});
