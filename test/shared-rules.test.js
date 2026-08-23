const test=require('node:test');
const assert=require('node:assert/strict');
const rules=require('../public/js/shared-rules.js');

function completeGroups(ids){return Object.fromEntries(ids.map(id=>[id,{yes:false,pending:false}]));}
function validData(){
  return {
    daoDuc:{renLuyenKy1:80,renLuyenKy2:80,khongViPham:true,groups:completeGroups(rules.REQUIRED_GROUPS.daoDuc)},
    hocTap:{dien:'thuong',diemKy1:2.8,diemKy2:2.8,tinChiKy1:15,tinChiKy2:15,groups:completeGroups(rules.REQUIRED_GROUPS.hocTap)},
    theLuc:{hoanThanhDuGDTC:false,khongDiemF:true,groups:completeGroups(rules.REQUIRED_GROUPS.theLuc)},
    hoiNhap:{fixed:completeGroups(rules.REQUIRED_GROUPS.hoiNhapFixed),groups:completeGroups(rules.REQUIRED_GROUPS.hoiNhap)}
  };
}

test('DRL và GPA đạt đúng tại ngưỡng',()=>{
  const result=rules.evaluateAcademicMinimum(validData());
  assert.equal(result.drlMet,true);assert.equal(result.gpaMet,true);
});
test('DRL dưới 80 bị chặn',()=>{
  const data=validData();data.daoDuc.renLuyenKy2=79;
  assert.equal(rules.evaluateAcademicMinimum(data).drlMet,false);
});
test('GPA có trọng số dưới ngưỡng diện xét bị chặn',()=>{
  const data=validData();data.hocTap.diemKy1=2.7;data.hocTap.diemKy2=2.7;
  assert.equal(rules.evaluateAcademicMinimum(data).gpaMet,false);
  data.hocTap.dien='canBoDoan';assert.equal(rules.evaluateAcademicMinimum(data).gpaMet,true);
});
test('vi phạm và điểm F GDTC là điều kiện cứng',()=>{
  const violation=validData();violation.daoDuc.khongViPham=false;
  assert.equal(rules.evaluateHardEligibility(violation).noViolationMet,false);
  const physical=validData();physical.theLuc.khongDiemF=false;
  assert.equal(rules.evaluateHardEligibility(physical).physicalMet,false);
  physical.theLuc.hoanThanhDuGDTC=true;
  assert.equal(rules.evaluateHardEligibility(physical).physicalMet,true);
});
test('không được bỏ nhóm tiêu chí khỏi payload',()=>{
  const data=validData();delete data.daoDuc.groups['DD-G3'];
  assert.ok(rules.missingRequiredDeclarations(data).some(x=>x.includes('DD-G3')));
});
test('Không đạt và Bổ sung sau là trạng thái đã khai báo',()=>{
  assert.equal(rules.groupStateComplete({yes:false,pending:false},'DD-G1'),true);
  assert.equal(rules.groupStateComplete({yes:null,pending:true},'DD-G1'),true);
  assert.equal(rules.groupStateComplete({yes:null,pending:false},'DD-G1'),false);
});
test('không cần chọn trước phương án bù cho tiêu chí phụ',()=>{
  assert.deepEqual(rules.missingRequiredDeclarations(validData()),[]);
});
test('không thể duyệt khi còn flags',()=>{
  assert.equal(rules.reviewStatusAllowed('Đã duyệt',{'evidence:x':'Thiếu'}),false);
  assert.equal(rules.reviewStatusAllowed('Đã duyệt',{}),true);
  assert.equal(rules.reviewStatusAllowed('Cần bổ sung',{'evidence:x':'Thiếu'}),true);
});

// Bốn mục dưới đây in ra báo cáo bằng đúng nội dung sinh viên tự điền. Nếu luật
// dùng chung để 'yesno' thì giao diện (evaluateGroupState) chặn còn máy chủ lại
// cho gửi - đúng kiểu lệch luật mà cả file này sinh ra để ngăn.
test('mục chỉ in nội dung tự điền phải bắt buộc có detail ở cả hai phía',()=>{
  for(const id of ['DD-G5','TL-G1','TL-G3','TL-G4']){
    assert.equal(rules.groupStateComplete({yes:true,detail:''},id),false,`${id} bỏ trống phải là chưa khai xong`);
    assert.equal(rules.groupStateComplete({yes:true,detail:'nội dung'},id),true,`${id} có nội dung phải là đã khai xong`);
    assert.equal(rules.groupStateComplete({yes:false},id),true,`${id} khai không đạt vẫn là đã khai xong`);
  }
});
