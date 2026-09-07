// Bản sao nguyên văn phần xuất file Word của báo cáo thành tích.
// Nguồn: public/js/app.js dòng 2459-2682, commit 85cbeea. Chép y nguyên, không
// sửa gì - sửa lỗi ở đây rồi chép ngược lại vào app.js đúng phạm vi đó.

/* ---------- Xuất Word (.docx) - giữ khối tiêu đề + xác nhận của file gốc ---------- */
async function exportDocx(){
  try{ await ensureDocx(); }
  catch(err){
    appAlert("Không tải được thư viện tạo file Word (cần kết nối mạng). Vui lòng kiểm tra lại kết nối mạng rồi thử lại.","Không thể xuất Word");
    return;
  }
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, PageOrientation, convertInchesToTwip, VerticalAlign, UnderlineType, FrameAnchorType, FrameWrap, BorderStyle, HeightRule } = docx;

  const p = state.personal;
  const mssvCheck = validateMSSV(p.mssv);
  const email = genEmail(p.fullName, p.mssv);
  const FONT = "Times New Roman";
  const T = (text, opts) => new TextRun(Object.assign({text, font:FONT, size:20}, opts||{}));
  const Ppar = (children, opts) => new Paragraph(Object.assign({children}, opts||{}));

  function cellParagraphs(lines){
    return lines.map(l => {
      const colorHex = l.color === "red" ? "B3261E" : l.color === "green" ? "1E7D4B" : undefined;
      const runOpts = colorHex ? {color: colorHex, bold:true} : {};
      return new Paragraph({
        children: l.plain
          ? [T(l.text, colorHex ? {color: colorHex, bold:true} : {})]
          : [T(l.num ? l.num+"." : "", Object.assign({bold:true}, colorHex ? {color: colorHex} : {})), T(" "+l.text, colorHex ? {color: colorHex, bold:true} : {})]
      });
    });
  }
  function numberLines(rawLines){
    let n = 1;
    return rawLines.map(l => {
      if(l.plain) return {text:l.text, plain:true, color:l.color};
      const withNum = {text:l.text, num:n, color:l.color};
      n++;
      return withNum;
    });
  }

  const positionsList = getPositionsList();
  const positionParagraphs = positionsList.length
    ? [
        Ppar([T("Chức vụ Đoàn, Hội:", {bold:true})]),
        ...positionsList.map(pos => Ppar([T("- " + pos)]))
      ]
    : [ Ppar([T("Chức vụ Đoàn, Hội: ", {bold:true}), T("")]) ];

  const personalLines = [
    Ppar([T("Họ và tên: ", {bold:true}), T(p.fullName)]),
    Ppar([T("MSSV: ", {bold:true}), T(p.mssv)]),
    Ppar([T("Giới tính: ", {bold:true}), T(p.gender)]),
    Ppar([T("Năm sinh: ", {bold:true}), T(p.birthYear)]),
    Ppar([T("Dân tộc: ", {bold:true}), T(p.ethnicity)]),
    Ppar([T("Sinh viên năm thứ: ", {bold:true}), T(mssvCheck.ok ? String(mssvCheck.year) : "")]),
    Ppar([T("Lớp: ", {bold:true}), T(p.className)]),
    Ppar([T("Khoa/Trường: ", {bold:true}), T(p.khoaTruong)]),
    ...positionParagraphs,
    Ppar([T("Đảng viên/Đoàn viên: ", {bold:true}), T(p.partyStatus)]),
    Ppar([T("Số điện thoại: ", {bold:true}), T(p.phone)]),
    Ppar([T("Email: ", {bold:true}), T(email)])
  ];

  function mkCell(children, widthPct, opts){
    return new TableCell(Object.assign({
      width:{size:widthPct, type:WidthType.PERCENTAGE},
      margins:{top:60, bottom:60, left:120, right:100},
      children: children.length ? children : [Ppar([T("")])]
    }, opts||{}));
  }
  function headerCell(text){
    return mkCell([Ppar([T(text, {bold:true})], {alignment:AlignmentType.CENTER})], 14.3);
  }

  // ---- Khối tiêu đề: dùng 3 KHUNG NỔI (frame) độc lập, neo tuyệt đối cùng y=0,
  //      thay vì dùng bảng - vì bảng KHÔNG chảy quanh khung nổi được (chỉ đoạn văn bản
  //      thường mới chảy quanh khung nổi), nên trước đây bảng bị đẩy xuống dưới khung ảnh
  //      thay vì nằm ngang hàng. Dùng frame cho cả 3 khối đảm bảo luôn cùng 1 hàng. ----
  const CM_TWIP = 566.929;
  const PHOTO_W_CM = 2.35; // ngang
  const PHOTO_H_CM = 3.05; // dọc
  const PAGE_CONTENT_WIDTH = convertInchesToTwip(11.69) - 720 - 720; // khổ ngang trừ lề trái/phải
  const photoGap = 150; // khoảng cách nhỏ giữa khung ảnh và khối tổ chức
  const photoWidthTwip = Math.round(PHOTO_W_CM * CM_TWIP);
  const headerHeightTwip = Math.round(PHOTO_H_CM * CM_TWIP);
  const orgTextX = photoWidthTwip + photoGap;
  const orgTextWidth = Math.round((PAGE_CONTENT_WIDTH - photoWidthTwip) * 0.52);
  const hsvX = orgTextX + orgTextWidth;
  const hsvWidth = PAGE_CONTENT_WIDTH - orgTextX - orgTextWidth;
  const HEADER_SPACER_AFTER = 260; // canh để có khoảng 1 dòng trống trước tiêu đề

  const photoFrame = Ppar([T("Ảnh 4x6", {bold:true})], {
    alignment: AlignmentType.CENTER,
    spacing: { before:0, after:0 },
    frame: {
      type: "absolute",
      position: { x: 0, y: 0 },
      width: photoWidthTwip,
      height: headerHeightTwip,
      anchor: { horizontal: FrameAnchorType.MARGIN, vertical: FrameAnchorType.MARGIN },
      wrap: FrameWrap.AROUND
    },
    border: {
      top:{style:BorderStyle.SINGLE, size:4, color:"000000"},
      bottom:{style:BorderStyle.SINGLE, size:4, color:"000000"},
      left:{style:BorderStyle.SINGLE, size:4, color:"000000"},
      right:{style:BorderStyle.SINGLE, size:4, color:"000000"}
    }
  });

  // Cả 3 đoạn văn bản của khối tên tổ chức dùng CHUNG 1 cấu hình frame (cùng x,y,w,h)
  // để Word gộp chúng vào cùng một khung nổi duy nhất.
  const orgFrameCfg = {
    type: "absolute",
    position: { x: orgTextX, y: 0 },
    width: orgTextWidth,
    height: headerHeightTwip,
    rule: HeightRule.AUTO,
    anchor: { horizontal: FrameAnchorType.MARGIN, vertical: FrameAnchorType.MARGIN },
    wrap: FrameWrap.AROUND
  };
  const orgLine1 = Ppar([T("HỘI SINH VIÊN VIỆT NAM THÀNH PHỐ HÀ NỘI", {size:26})], {alignment:AlignmentType.CENTER, spacing:{before:0,after:0}, frame: orgFrameCfg});
  const orgLine2 = Ppar([T("BCH ĐH BÁCH KHOA HÀ NỘI", {bold:true, size:26})], {alignment:AlignmentType.CENTER, spacing:{before:0,after:0}, frame: orgFrameCfg});
  const orgLine3 = Ppar([T("***", {bold:true, size:26})], {alignment:AlignmentType.CENTER, spacing:{before:0,after:0}, frame: orgFrameCfg});

  const hsvFrameCfg = {
    type: "absolute",
    position: { x: hsvX, y: 0 },
    width: hsvWidth,
    height: headerHeightTwip,
    rule: HeightRule.AUTO,
    anchor: { horizontal: FrameAnchorType.MARGIN, vertical: FrameAnchorType.MARGIN },
    wrap: FrameWrap.AROUND
  };
  const hsvLine = Ppar([T("HỘI SINH VIÊN VIỆT NAM", {bold:true, size:28, underline:{type:UnderlineType.SINGLE}})], {alignment:AlignmentType.CENTER, spacing:{before:0,after:0}, frame: hsvFrameCfg});

  // Đoạn trống để "đẩy" nội dung phía sau (tiêu đề báo cáo) xuống dưới, tránh đè lên
  // 3 khung nổi ở trên (vì khung nổi không chiếm chỗ trong dòng chảy văn bản bình thường).
  // Giá trị được đo & hiệu chỉnh thực nghiệm (xem ghi chú lúc build) để chỉ cách đúng ~1 dòng.
  const headerSpacer = Ppar([T("")], { spacing:{ before:0, after: HEADER_SPACER_AFTER } });

  const thanhTichRow = new TableRow({children:[
    new TableCell({columnSpan:7, margins:{top:60,bottom:60,left:120,right:100}, children:[
      Ppar([T("THÀNH TÍCH", {bold:true, size:20})], {alignment:AlignmentType.CENTER})
    ]})
  ]});

  const headerRow = new TableRow({children:[
    mkCell([Ppar([T("")])], 14),
    headerCell("Đạo đức"), headerCell("Học tập"), headerCell("Thể lực"),
    headerCell("Tình nguyện"), headerCell("Hội nhập"), headerCell("Các thành tích khác")
  ]});

  const dataRow = new TableRow({children:[
    mkCell(personalLines, 14),
    mkCell(cellParagraphs(numberLines(getDaoDucLines())), 14.3),
    mkCell(cellParagraphs(numberLines(getHocTapLines())), 14.3),
    mkCell(cellParagraphs(numberLines(getTheLucLines())), 14.3),
    mkCell(cellParagraphs(numberLines(getTinhNguyenLines())), 14.3),
    mkCell(cellParagraphs(numberLines(getHoiNhapLines())), 14.3),
    mkCell(cellParagraphs(numberLines(getSimpleLines(state.khac.items))), 14.3),
  ]});

  const mainTable = new Table({
    width:{size:100, type:WidthType.PERCENTAGE},
    rows:[thanhTichRow, headerRow, dataRow]
  });

  // ---- Khối xác nhận + chữ ký (giữ đúng nội dung file mẫu, cỡ chữ 11) ----
  const confirmTable = new Table({
    width:{size:100, type:WidthType.PERCENTAGE},
    borders:{ top:{style:"none",size:0,color:"FFFFFF"}, bottom:{style:"none",size:0,color:"FFFFFF"}, left:{style:"none",size:0,color:"FFFFFF"}, right:{style:"none",size:0,color:"FFFFFF"}, insideHorizontal:{style:"none",size:0,color:"FFFFFF"}, insideVertical:{style:"none",size:0,color:"FFFFFF"} },
    rows:[ new TableRow({children:[
      new TableCell({width:{size:33,type:WidthType.PERCENTAGE}, children:[
        Ppar([T("XÁC NHẬN CỦA BAN CHẤP HÀNH", {bold:true, size:22})], {alignment:AlignmentType.CENTER}),
        Ppar([T("HỘI SINH VIÊN TRƯỜNG " + (p.khoaTruong||"").toUpperCase(), {bold:true, size:22})], {alignment:AlignmentType.CENTER})
      ]}),
      new TableCell({width:{size:34,type:WidthType.PERCENTAGE}, children:[
        Ppar([T("XÁC NHẬN CỦA BAN THƯ KÝ HỘI SINH VIÊN ĐẠI HỌC", {bold:true, size:22})], {alignment:AlignmentType.CENTER})
      ]}),
      new TableCell({width:{size:33,type:WidthType.PERCENTAGE}, children:[
        Ppar([T("Hà Nội, ngày " + (state.reportDate.day || "......") + " tháng " + (state.reportDate.month || "......") + " năm " + (state.reportDate.year || String(new Date().getFullYear())), {italics:true, size:22})], {alignment:AlignmentType.CENTER}),
        Ppar([T("NGƯỜI BÁO CÁO", {bold:true, size:22})], {alignment:AlignmentType.CENTER})
      ]})
    ]})]
  });

  const doc = new Document({
    styles:{ default:{ document:{ run:{ font:FONT, size:20 } } } },
    sections:[{
      properties:{
        page:{
          size:{
            orientation: PageOrientation.LANDSCAPE,
            width: convertInchesToTwip(8.27),
            height: convertInchesToTwip(11.69)
          },
          margin:{ top:720, bottom:720, left:720, right:720 }
        }
      },
      children:[
        photoFrame,
        orgLine1,
        orgLine2,
        orgLine3,
        hsvLine,
        headerSpacer,
        Ppar([T("BÁO CÁO THÀNH TÍCH", {bold:true, size:32})], {alignment:AlignmentType.CENTER}),
        Ppar([T("ĐỀ NGHỊ CÔNG NHẬN DANH HIỆU SINH VIÊN 5 TỐT CẤP ĐẠI HỌC", {bold:true, size:28})], {alignment:AlignmentType.CENTER}),
        Ppar([T("NĂM " + REPORT_YEAR, {bold:true, size:28})], {alignment:AlignmentType.CENTER}),
        Ppar([T("")]),
        mainTable,
        Ppar([T("")]),
        confirmTable
      ]
    }]
  });

  Packer.toBlob(doc).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (p.fullName || "bao_cao") + "_5tot.docx";
    a.click();
    URL.revokeObjectURL(url);
  });
}
