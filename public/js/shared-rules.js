(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.SV5TRules=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  // Chuẩn hoá tên hoạt động để so trùng: bỏ dấu, thường hoá, gộp khoảng trắng.
  // Dùng chung cho frontend (chặn đề xuất trùng) và backend (validate payload)
  // để hai bên không lệch luật so khớp.
  function normalizeActivityName(value){
    return String(value||'')
      .normalize('NFD').replace(/[̀-ͯ]/g,'')
      .replace(/đ/g,'d').replace(/Đ/g,'D')
      .toLowerCase().trim().replace(/\s+/g,' ');
  }

  const GPA_THRESHOLDS=Object.freeze({thuong:2.8,canBoDoan:2.5,traoDoi:2.8});
  const GROUP_VALIDATION_RULES=Object.freeze({
    'DD-G1':{kind:'list',min:1},'DD-G2':{kind:'rank'},'DD-G3':{kind:'rank'},'DD-G4':{kind:'list',min:1},'DD-G5':{kind:'yesno'},
    // HT-G1 vừa chọn được từ danh mục Excel vừa tự ghi, nên dùng listOrDetail:
    // hồ sơ cũ chỉ có `detail` vẫn hợp lệ, hồ sơ mới dùng `items`.
    'HT-G1':{kind:'listOrDetail',min:1},'HT-G2':{kind:'listOrDetail',min:1},'HT-G3':{kind:'list',min:1},'HT-G4':{kind:'listOrDetail',min:1},'HT-G5':{kind:'listOrDetail',min:1},'HT-G6':{kind:'listOrDetail',min:1},
    'TL-G1':{kind:'yesno'},'TL-G2':{kind:'list',min:2},'TL-G3':{kind:'yesno'},'TL-G4':{kind:'yesno'},
    'HN-KHOA-HOC':{kind:'list',min:1},'HN-CAP-DAI-HOC':{kind:'list',min:1},
    'HN-G1':{kind:'list',min:1},'HN-G2':{kind:'list',min:1}
  });
  const REQUIRED_GROUPS=Object.freeze({
    daoDuc:Object.freeze(['DD-G1','DD-G2','DD-G3','DD-G4','DD-G5']),
    hocTap:Object.freeze(['HT-G1','HT-G2','HT-G3','HT-G4','HT-G5','HT-G6']),
    theLuc:Object.freeze(['TL-G1','TL-G2','TL-G3','TL-G4']),
    hoiNhapFixed:Object.freeze(['HN-KHOA-HOC','HN-CAP-DAI-HOC']),
    hoiNhap:Object.freeze(['HN-G1','HN-G2'])
  });

  function isPlainObject(value){
    if(!value||typeof value!=='object'||Array.isArray(value)) return false;
    const proto=Object.getPrototypeOf(value);
    return proto===Object.prototype||proto===null;
  }
  function calculateWeightedGpa(hocTap){
    const h=hocTap||{},g1=Number(h.diemKy1),g2=Number(h.diemKy2),c1=Number(h.tinChiKy1),c2=Number(h.tinChiKy2);
    if(![g1,g2,c1,c2].every(Number.isFinite)||c1<=0||c2<=0) return null;
    return (g1*c1+g2*c2)/(c1+c2);
  }
  function getGpaThreshold(dien){ return GPA_THRESHOLDS[dien]??null; }
  function evaluateAcademicMinimum(data){
    const d=data?.daoDuc||{},h=data?.hocTap||{};
    const r1=Number(d.renLuyenKy1),r2=Number(d.renLuyenKy2);
    const drlAverage=[r1,r2].every(Number.isFinite)?(r1+r2)/2:null;
    const gpaAverage=calculateWeightedGpa(h);
    const gpaThreshold=getGpaThreshold(h.dien);
    return {
      drlAverage,drlRequired:80,drlMet:drlAverage!==null&&drlAverage>=80,
      gpaAverage,gpaThreshold,gpaMet:gpaAverage!==null&&gpaThreshold!==null&&gpaAverage>=gpaThreshold
    };
  }
  function evaluateHardEligibility(data){
    const academic=evaluateAcademicMinimum(data);
    const d=data?.daoDuc||{},t=data?.theLuc||{};
    const noViolationMet=d.khongViPham===true;
    const physicalMet=t.hoanThanhDuGDTC===true||t.khongDiemF===true;
    return {...academic,noViolationMet,physicalMet,allMet:academic.drlMet&&academic.gpaMet&&noViolationMet&&physicalMet};
  }
  function groupStateComplete(gs,groupId){
    if(!isPlainObject(gs)) return false;
    if(gs.pending===true||gs.yes===false||gs.notMet===true) return true;
    if(gs.yes!==true) return false;
    const rule=GROUP_VALIDATION_RULES[String(groupId||'')]||null;
    if(rule?.kind==='list') return Array.isArray(gs.items)&&gs.items.length>=rule.min;
    if(rule?.kind==='listOrDetail') return (Array.isArray(gs.items)&&gs.items.length>=rule.min)||Boolean(String(gs.detail||'').trim());
    if(rule?.kind==='rank') return Boolean(String(gs.rank||'').trim());
    if(rule?.kind==='detail') return Boolean(String(gs.detail||'').trim());
    if(rule?.kind==='yesno') return true;
    return false;
  }
  function missingRequiredDeclarations(data){
    const d=data?.daoDuc||{},h=data?.hocTap||{},t=data?.theLuc||{},hn=data?.hoiNhap||{};
    const sources=[
      ['Đạo đức',REQUIRED_GROUPS.daoDuc,d.groups],['Học tập',REQUIRED_GROUPS.hocTap,h.groups],
      ['Thể lực',REQUIRED_GROUPS.theLuc,t.groups],['Hội nhập - tiêu chí chính',REQUIRED_GROUPS.hoiNhapFixed,hn.fixed],
      ['Hội nhập - tiêu chí phụ',REQUIRED_GROUPS.hoiNhap,hn.groups]
    ];
    const missing=[];
    for(const [section,ids,states] of sources){
      if(!isPlainObject(states)){ missing.push(`${section}: thiếu toàn bộ nhóm khai báo`); continue; }
      for(const id of ids) if(!groupStateComplete(states[id],id)) missing.push(`${section}: ${id}`);
    }
    return missing;
  }
  function reviewStatusAllowed(status,flags){
    return status!=='Đã duyệt'||!flags||typeof flags!=='object'||Object.keys(flags).length===0;
  }

  /* ---------- Ngày tình nguyện ----------
     Mỗi hoạt động tình nguyện lưu thêm `dates`: mảng chuỗi ISO "YYYY-MM-DD".
     Số ngày quy đổi (`days`) vẫn tách riêng vì một buổi có thể tính 0,5 ngày,
     nên số mốc ngày không nhất thiết bằng số ngày quy đổi. */
  const MAX_VOLUNTEER_DATES=60;
  const VOLUNTEER_DATE_PATTERN=/^\d{4}-\d{2}-\d{2}$/;
  function isValidVolunteerDate(value){
    const text=String(value||'').trim();
    if(!VOLUNTEER_DATE_PATTERN.test(text)) return false;
    const [y,m,d]=text.split('-').map(Number);
    if(y<2000||y>2100) return false;
    const parsed=new Date(Date.UTC(y,m-1,d));
    return parsed.getUTCFullYear()===y&&parsed.getUTCMonth()===m-1&&parsed.getUTCDate()===d;
  }
  function normalizeVolunteerDates(dates){
    if(!Array.isArray(dates)) return [];
    const seen=new Set();
    for(const value of dates){
      const text=String(value||'').trim();
      if(isValidVolunteerDate(text)) seen.add(text);
    }
    return [...seen].sort();
  }
  // "19/10, 24/10, 26/10, 31/10/2025" - chỉ ghi năm ở mốc cuối cùng của mỗi năm,
  // đúng theo cách trình bày trong bản báo cáo thành tích mẫu.
  function formatVolunteerDates(dates){
    const list=normalizeVolunteerDates(dates);
    return list.map((iso,index)=>{
      const [year,month,day]=iso.split('-');
      const nextYear=index+1<list.length?list[index+1].slice(0,4):null;
      return nextYear===year?`${day}/${month}`:`${day}/${month}/${year}`;
    }).join(', ');
  }
  // "Tham gia X (2 ngày: 19/10, 24/10, 26/10, 31/10/2025)"
  function formatVolunteerItem(item){
    const text=String(item?.text||'').trim();
    const days=Number(item?.days);
    const daysText=Number.isFinite(days)?String(days):'0';
    const dates=formatVolunteerDates(item?.dates);
    return dates?`${text} (${daysText} ngày: ${dates})`:`${text} (${daysText} ngày)`;
  }
  function volunteerItemsMissingDates(items){
    return (Array.isArray(items)?items:[])
      .filter(item=>normalizeVolunteerDates(item?.dates).length===0)
      .map(item=>String(item?.text||'').trim()||'(hoạt động chưa đặt tên)');
  }

  return Object.freeze({GPA_THRESHOLDS,GROUP_VALIDATION_RULES,REQUIRED_GROUPS,isPlainObject,normalizeActivityName,calculateWeightedGpa,getGpaThreshold,evaluateAcademicMinimum,evaluateHardEligibility,groupStateComplete,missingRequiredDeclarations,reviewStatusAllowed,
    MAX_VOLUNTEER_DATES,isValidVolunteerDate,normalizeVolunteerDates,formatVolunteerDates,formatVolunteerItem,volunteerItemsMissingDates});
});
