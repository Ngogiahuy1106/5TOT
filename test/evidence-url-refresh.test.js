const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const appSource=fs.readFileSync(require.resolve('../public/js/app.js'),'utf8');
const block=appSource.slice(appSource.indexOf('const MAX_EVIDENCE_URL_REFRESH'),appSource.indexOf('function evidenceFormLinkHref'));
const ctx={};
vm.createContext(ctx);
vm.runInContext(block+'\nglobalThis.decide=evidenceUrlRefreshDecision;\nglobalThis.MAX=MAX_EVIDENCE_URL_REFRESH;\nglobalThis.RESET=EVIDENCE_URL_REFRESH_RESET_MS;',ctx);

const NOW=1_000_000;
const base={adminMode:true,imageGeneration:0,currentGeneration:0,refreshCount:0,lastRefreshAt:0,now:NOW};

test('ảnh vỡ ở chế độ quản trị thì xin lứa link mới',()=>{
  assert.equal(ctx.decide(base),'refresh');
});

test('không xin link mới khi sinh viên tự xem hồ sơ của mình',()=>{
  // Ảnh của sinh viên là data URL trong máy, hỏng vì lý do khác, xin link vô nghĩa.
  assert.equal(ctx.decide({...base,adminMode:false}),'skip-not-admin');
});

test('ảnh thuộc lứa link cũ báo vỡ thì bỏ qua, không xin thêm lần nữa',()=>{
  // Lứa link mới đã về rồi; các thẻ ảnh cũ vẫn kịp bắn lỗi và sẽ gây vòng lặp.
  assert.equal(ctx.decide({...base,imageGeneration:0,currentGeneration:1}),'skip-stale');
});

test('hỏng liên tiếp đủ số lần thì dừng, vì lúc đó kho ảnh mới thật sự có vấn đề',()=>{
  const vuaXin={lastRefreshAt:NOW-1000};
  assert.equal(ctx.decide({...base,...vuaXin,refreshCount:ctx.MAX}),'skip-exhausted');
  assert.equal(ctx.decide({...base,...vuaXin,refreshCount:ctx.MAX+5}),'skip-exhausted');
});

test('còn lượt trong chuỗi hỏng liên tiếp thì vẫn xin',()=>{
  assert.equal(ctx.decide({...base,lastRefreshAt:NOW-1000,refreshCount:ctx.MAX-1}),'refresh');
});

test('phiên chấm dài vẫn xin lại được sau mỗi lần link hết hạn',()=>{
  // Link sống 15 phút, phiên chấm sống 8 giờ nên có thể hết hạn hàng chục lần.
  // Lần hỏng cách lần trước đủ lâu là chuyện bình thường, không phải kho ảnh hỏng.
  const lanTruocDaLau={lastRefreshAt:NOW-ctx.RESET-1,refreshCount:99};
  assert.equal(ctx.decide({...base,...lanTruocDaLau}),'refresh');
});

test('cửa sổ tính hỏng liên tiếp ngắn hơn nhiều so với hạn của link',()=>{
  assert.ok(ctx.RESET>0&&ctx.RESET<15*60*1000,'phải ngắn hơn 15 phút thì mới phân biệt được hai tình huống');
});

test('số lần cho phép là hữu hạn và nhỏ',()=>{
  assert.ok(Number.isInteger(ctx.MAX)&&ctx.MAX>0&&ctx.MAX<=5,'giới hạn phải nhỏ để không lặp vô hạn');
});
