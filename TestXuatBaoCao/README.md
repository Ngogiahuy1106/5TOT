# TestXuatBaoCao

Bàn thử riêng cho phần xuất file Word của báo cáo thành tích. Không cần chạy máy
chủ, không cần đăng nhập, không cần điền biểu mẫu 9 bước - mở trang lên là bấm
xuất được ngay.

## Cách chạy

Mở `index.html` bằng Chrome (bấm đúp vào file là được), rồi bấm **Xuất file Word**.

Nếu trình duyệt chặn không cho nạp script từ `file://`, chạy một máy chủ tĩnh bất
kỳ ở thư mục gốc dự án rồi mở `/TestXuatBaoCao/index.html`.

## Ba file

| File | Vai trò |
|---|---|
| `xuat-bao-cao.js` | **Bản sao nguyên văn** khối xuất Word trong `public/js/app.js`. Đây là chỗ cần sửa. |
| `du-lieu-mau.js` | Dữ liệu mẫu cố định, cộng vài hàm thay thế để `exportDocx()` chạy được một mình. |
| `index.html` | Nút xuất file, bảng xem dữ liệu mẫu, và danh sách những chỗ cần soi. |

## Sửa xong thì chép ngược lại

`xuat-bao-cao.js` là bản sao, sửa ở đây **không** ảnh hưởng gì tới trang thật.
Khi đã ưng:

1. Chép phần đã sửa đè lại vào `public/js/app.js`, đúng khối bắt đầu bằng
   `/* ---------- Xuất Word (.docx) ... */`.
2. Chạy `npm test`.
3. Mở trang thật, điền một hồ sơ và xuất file để đối chiếu lần cuối.

Đầu `xuat-bao-cao.js` có ghi số commit gốc, dùng để `git diff` đối chiếu nếu
trong lúc sửa `app.js` có thay đổi.

## Vì sao là bản sao chứ không dùng chung một file

Cách sạch hơn là tách khối xuất Word thành module riêng cho cả hai bên cùng dùng,
như đã làm với `lib/r2-signing.js`. Chưa làm vậy vì phần xuất file đang còn phải
sửa nhiều; tách module lúc này thì mỗi lần thử nghiệm lại chạm thẳng vào trang
thật. Khi nào định hình xong thì tách, lúc đó bản sao này bỏ đi được.

## Dữ liệu mẫu cố ý chạm vào các chỗ hay vỡ

- Dòng phụ không đánh số (`plain: true`), ví dụ `+ Kỳ 1: 93`
- Chữ xanh lá cho hoạt động sinh viên tự đề xuất
- Chữ đỏ cho mục còn thiếu
- Câu rất dài để xem cách ngắt dòng trong ô hẹp
- Dấu ngoặc cong `“ ”` và dấu tiếng Việt
- Hai chức vụ Đoàn/Hội để kiểm khối nhiều dòng

## Chỗ đáng ngờ nhất khi mở bằng Google Docs

Khối tên tổ chức ở đầu trang (`HỘI SINH VIÊN VIỆT NAM THÀNH PHỐ HÀ NỘI` /
`BCH ĐH BÁCH KHOA HÀ NỘI` và ô `HỘI SINH VIÊN VIỆT NAM` bên phải) được dựng bằng
**khung nổi đặt tuyệt đối** (`frame` với `FrameAnchorType.MARGIN`). Word đọc đúng,
nhưng Google Docs thường không giữ được khung nổi và sẽ đẩy các khối này về dòng
chảy bình thường - rất có thể đây là gốc của những chỗ lệch mà bạn thấy.

Nếu đúng vậy thì hướng sửa là bỏ khung nổi, thay bằng một bảng 2 cột không viền ở
đầu trang. Word và Google Docs đều hiển thị bảng giống nhau.
