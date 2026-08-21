const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync(require.resolve('../public/js/admin.js'),'utf8');

test('thoát màn admin khôi phục form cũ thay vì để lại dữ liệu sinh viên',()=>{
  const classes=new Set(['admin-review-mode']);
  const context={
    structuredClone,
    state:{step:2,personal:{fullName:'Bản nháp của admin'},evidenceImages:{x:{name:'x.jpg',dataUrl:'data:image/jpeg;base64,AA=='}}},
    _hasUnsavedChanges:true,
    _persistedDraftImageVersions:new Map([['x','v1']]),
    window:{_adminReviewSubmission:null,_adminReviewFlags:{}},
    document:{body:{classList:{remove:value=>classes.delete(value)}},getElementById:()=>null},
    render(){context.rendered=(context.rendered||0)+1;},
    updateAutoSaveIndicator(status){context.autoSaveStatus=status;},
    fetch(){throw new Error('không được gọi fetch trong test state');},
    console
  };
  vm.createContext(context);
  vm.runInContext(source+'\nglobalThis.audit={captureAdminFormSnapshot,exitAdminReviewMode};',context);
  context.audit.captureAdminFormSnapshot();
  context.state.personal.fullName='Hồ sơ sinh viên đang xem';
  context.state.step=0;
  context.window._adminReviewSubmission={id:'student'};
  context.audit.exitAdminReviewMode();
  assert.equal(context.state.personal.fullName,'Bản nháp của admin');
  assert.equal(context.state.step,2);
  assert.equal(context._hasUnsavedChanges,true);
  assert.equal(context._persistedDraftImageVersions.get('x'),'v1');
  assert.equal(classes.has('admin-review-mode'),false);
  assert.equal(context.rendered,1);
  assert.equal(context.autoSaveStatus,'pending');
});
