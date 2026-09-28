# Web ôn thi MIT + Liên kết đơn vị

## Chạy project
Mở Terminal tại thư mục project:

```bash
npm install
npm run dev
```

Sau đó mở địa chỉ Vite hiện ra, thường là http://localhost:5173

## Cấu trúc
- MIT: 30 đề
- Liên kết đơn vị: 12 đề
- Mỗi đề: 60 phút
- Random thứ tự câu hỏi mỗi lần bắt đầu đề
- Có nút Kết thúc bài
- Hết giờ tự động nộp
- Có trang kết quả

## Quan trọng
Câu hỏi hiện là dữ liệu MẪU ở `src/main.jsx`, trong biến `QUESTION_BANK`.
Khi có Excel xuất từ Microsoft Forms, có thể chuyển toàn bộ dữ liệu thật vào cấu trúc này.

## Lưu ý
Hiện chỉ đề mẫu 1-2 của mỗi môn có câu hỏi demo. Các đề còn lại đã được tạo sẵn trên giao diện nhưng sẽ báo "chưa nhập câu hỏi".
