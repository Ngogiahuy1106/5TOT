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
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, PageOrientation, convertInchesToTwip, VerticalAlign, UnderlineType, BorderStyle, HeightRule, TableLayoutType } = docx;

  const p = state.personal;
  const mssvCheck = validateMSSV(p.mssv);
  const email = genEmail(p.fullName, p.mssv);
  const FONT = "Times New Roman";
  const T = (text, opts) => new TextRun(Object.assign({text, font:FONT, size:20}, opts||{}));
  const Ppar = (children, opts) => new Paragraph(Object.assign({children}, opts||{}));
  // Đoạn đệm mỏng: cỡ chữ 1pt nên gần như không chiếm chiều cao, khoảng cách do
  // spacing quyết định. Dùng thay đoạn trống cỡ chữ thường để báo cáo vừa một trang.
  const Dem = (after) => Ppar([T("", {size:2})], {spacing:{before:0, after}});

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

  function mkCell(children, cotIndex, opts){
    return new TableCell(Object.assign({
      width:{size: COT_RONG[cotIndex], type: WidthType.DXA},
      margins:{top:60, bottom:60, left:120, right:100},
      children: children.length ? children : [Ppar([T("")])]
    }, opts||{}));
  }
  function headerCell(text, cotIndex){
    return mkCell([Ppar([T(text, {bold:true})], {alignment:AlignmentType.CENTER})], cotIndex);
  }

  // ---- Khối tiêu đề: MỘT bảng 3 cột không viền (ảnh 4x6 | tên tổ chức | HSV VN).
  //      Trước đây dùng 3 khung nổi neo tuyệt đối; Word đọc đúng nhưng Google Docs
  //      không hỗ trợ khung nổi nên khi mở trên Drive cả 3 khối rơi xuống xếp chồng
  //      dọc. Bảng thì Word và Google Docs dựng giống hệt nhau. ----
  const CM_TWIP = 566.929;
  const PHOTO_W_CM = 2.35;
  const PHOTO_H_CM = 3.05;
  const PAGE_CONTENT_WIDTH = convertInchesToTwip(11.69) - 720 - 720; // khổ ngang trừ lề

  // Google Docs bỏ qua chiều rộng dạng phần trăm khi nhập .docx rồi co bảng về bề
  // rộng tối thiểu theo nội dung, khiến mỗi cột chỉ còn vừa một ký tự. Vì vậy mọi
  // chiều rộng ở đây đều tính ra twip (DXA) và bảng khoá layout FIXED.
  const COT_TY_LE = [14, 14.3, 14.3, 14.3, 14.3, 14.3, 14.3];
  const COT_RONG = (() => {
    const tong = COT_TY_LE.reduce((a, b) => a + b, 0);
    const w = COT_TY_LE.map(x => Math.round(PAGE_CONTENT_WIDTH * x / tong));
    w[0] += PAGE_CONTENT_WIDTH - w.reduce((a, b) => a + b, 0); // bù sai số làm tròn
    return w;
  })();

  const photoWidthTwip = Math.round(PHOTO_W_CM * CM_TWIP);
  const headerHeightTwip = Math.round(PHOTO_H_CM * CM_TWIP);
  const orgTextWidth = Math.round((PAGE_CONTENT_WIDTH - photoWidthTwip) * 0.52);
  const hsvWidth = PAGE_CONTENT_WIDTH - photoWidthTwip - orgTextWidth;

  const KHONG_VIEN = {
    top:{style:BorderStyle.NONE, size:0, color:"FFFFFF"},
    bottom:{style:BorderStyle.NONE, size:0, color:"FFFFFF"},
    left:{style:BorderStyle.NONE, size:0, color:"FFFFFF"},
    right:{style:BorderStyle.NONE, size:0, color:"FFFFFF"},
    insideHorizontal:{style:BorderStyle.NONE, size:0, color:"FFFFFF"},
    insideVertical:{style:BorderStyle.NONE, size:0, color:"FFFFFF"}
  };
  const VIEN_DEN = {
    top:{style:BorderStyle.SINGLE, size:4, color:"000000"},
    bottom:{style:BorderStyle.SINGLE, size:4, color:"000000"},
    left:{style:BorderStyle.SINGLE, size:4, color:"000000"},
    right:{style:BorderStyle.SINGLE, size:4, color:"000000"}
  };

  const headerTable = new Table({
    width:{size: PAGE_CONTENT_WIDTH, type: WidthType.DXA},
    columnWidths: [photoWidthTwip, orgTextWidth, hsvWidth],
    layout: TableLayoutType.FIXED,
    borders: KHONG_VIEN,
    rows:[ new TableRow({
      height:{ value: headerHeightTwip, rule: HeightRule.ATLEAST },
      children:[
        new TableCell({
          width:{size: photoWidthTwip, type: WidthType.DXA},
          borders: VIEN_DEN,
          verticalAlign: VerticalAlign.CENTER,
          children:[ Ppar([T("Ảnh 4x6", {bold:true})], {alignment:AlignmentType.CENTER, spacing:{before:0,after:0}}) ]
        }),
        new TableCell({
          width:{size: orgTextWidth, type: WidthType.DXA},
          verticalAlign: VerticalAlign.TOP,
          children:[
            Ppar([T("HỘI SINH VIÊN VIỆT NAM THÀNH PHỐ HÀ NỘI", {size:26})], {alignment:AlignmentType.CENTER, spacing:{before:0,after:0}}),
            Ppar([T("BCH ĐH BÁCH KHOA HÀ NỘI", {bold:true, size:26})], {alignment:AlignmentType.CENTER, spacing:{before:0,after:0}}),
            Ppar([T("***", {bold:true, size:26})], {alignment:AlignmentType.CENTER, spacing:{before:0,after:0}})
          ]
        }),
        new TableCell({
          width:{size: hsvWidth, type: WidthType.DXA},
          verticalAlign: VerticalAlign.TOP,
          children:[
            Ppar([T("HỘI SINH VIÊN VIỆT NAM", {bold:true, size:28, underline:{type:UnderlineType.SINGLE}})], {alignment:AlignmentType.CENTER, spacing:{before:0,after:0}})
          ]
        })
      ]
    })]
  });

  const thanhTichRow = new TableRow({children:[
    new TableCell({columnSpan:7, width:{size:PAGE_CONTENT_WIDTH, type:WidthType.DXA}, margins:{top:60,bottom:60,left:120,right:100}, children:[
      Ppar([T("THÀNH TÍCH", {bold:true, size:20})], {alignment:AlignmentType.CENTER})
    ]})
  ]});

  const headerRow = new TableRow({children:[
    mkCell([Ppar([T("")])], 0),
    headerCell("Đạo đức", 1), headerCell("Học tập", 2), headerCell("Thể lực", 3),
    headerCell("Tình nguyện", 4), headerCell("Hội nhập", 5), headerCell("Các thành tích khác", 6)
  ]});

  const dataRow = new TableRow({children:[
    mkCell(personalLines, 0),
    mkCell(cellParagraphs(numberLines(getDaoDucLines())), 1),
    mkCell(cellParagraphs(numberLines(getHocTapLines())), 2),
    mkCell(cellParagraphs(numberLines(getTheLucLines())), 3),
    mkCell(cellParagraphs(numberLines(getTinhNguyenLines())), 4),
    mkCell(cellParagraphs(numberLines(getHoiNhapLines())), 5),
    mkCell(cellParagraphs(numberLines(getSimpleLines(state.khac.items))), 6),
  ]});

  const mainTable = new Table({
    width:{size: PAGE_CONTENT_WIDTH, type: WidthType.DXA},
    columnWidths: COT_RONG,
    layout: TableLayoutType.FIXED,
    rows:[thanhTichRow, headerRow, dataRow]
  });

  // ---- Khối xác nhận + chữ ký (giữ đúng nội dung file mẫu, cỡ chữ 11) ----
  const XN_RONG = [Math.round(PAGE_CONTENT_WIDTH*0.33), Math.round(PAGE_CONTENT_WIDTH*0.34), 0];
  XN_RONG[2] = PAGE_CONTENT_WIDTH - XN_RONG[0] - XN_RONG[1];
  const confirmTable = new Table({
    width:{size: PAGE_CONTENT_WIDTH, type: WidthType.DXA},
    columnWidths: XN_RONG,
    layout: TableLayoutType.FIXED,
    borders: KHONG_VIEN,
    rows:[ new TableRow({children:[
      new TableCell({width:{size:XN_RONG[0], type:WidthType.DXA}, children:[
        Ppar([T("XÁC NHẬN CỦA BAN CHẤP HÀNH", {bold:true, size:22})], {alignment:AlignmentType.CENTER}),
        Ppar([T("HỘI SINH VIÊN TRƯỜNG " + (p.khoaTruong||"").toUpperCase(), {bold:true, size:22})], {alignment:AlignmentType.CENTER})
      ]}),
      new TableCell({width:{size:XN_RONG[1], type:WidthType.DXA}, children:[
        Ppar([T("XÁC NHẬN CỦA BAN THƯ KÝ HỘI SINH VIÊN ĐẠI HỌC", {bold:true, size:22})], {alignment:AlignmentType.CENTER})
      ]}),
      new TableCell({width:{size:XN_RONG[2], type:WidthType.DXA}, children:[
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
        // Google Docs tự chèn một đoạn trống cỡ 11pt khi thân tài liệu mở đầu
        // bằng bảng. Tự đặt sẵn một đoạn mỏng ở đây để nó không chèn nữa.
        Dem(0),
        headerTable,
        Dem(120),
        Ppar([T("BÁO CÁO THÀNH TÍCH", {bold:true, size:32})], {alignment:AlignmentType.CENTER, spacing:{before:0, after:0}}),
        Ppar([T("ĐỀ NGHỊ CÔNG NHẬN DANH HIỆU SINH VIÊN 5 TỐT CẤP ĐẠI HỌC", {bold:true, size:28})], {alignment:AlignmentType.CENTER, spacing:{before:0, after:0}}),
        Ppar([T("NĂM " + REPORT_YEAR, {bold:true, size:28})], {alignment:AlignmentType.CENTER, spacing:{before:0, after:0}}),
        Dem(100),
        mainTable,
        Dem(140),
        confirmTable,
        // Sau một bảng ở cuối thân tài liệu, trình đọc luôn cần một đoạn văn.
        // Tự đặt đoạn mỏng để không bị thêm một đoạn cỡ chữ thường đẩy sang trang mới.
        Dem(0)
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
