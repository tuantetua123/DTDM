# Cloud TaskFlow – Monitoring & Auto Sync

Không có đăng ký/đăng nhập. Dữ liệu dùng chung; chỉ dùng dữ liệu mẫu khi demo công khai.

## Chạy
- Node.js 22+ và PostgreSQL; dùng cấu hình DATABASE_URL, DB_SSL, PORT của dự án cũ trong .env.
- npm install; npm start; mở http://localhost:3000 (hoặc PORT đã cấu hình).
- Không cần thay đổi schema ngoài các migration có sẵn của bản gốc.

## Demo
- Mở hai cửa sổ cùng địa chỉ server, thêm hoặc sửa việc ở một cửa sổ; cửa sổ kia tự tải lại sau khoảng 5 giây khi đang hiển thị và không chỉnh sửa. Đây là polling, không phải WebSocket.
- Cloud Monitoring gọi GET /health mỗi 10 giây; HTTP 503 khi database không phản hồi. Uptime là thời gian hoạt động của tiến trình Node.js. Độ trễ HTTP đo từ trình duyệt; databaseMs đo SELECT 1 gồm thời gian chờ kết nối.
- Khi mất mạng, giữ danh sách đã tải và thử lại tự động. Không hỗ trợ ghi offline.
- Endpoint health công khai cho demo; khi triển khai thực tế cần hạn chế truy cập số liệu và API chỉnh sửa. Không đưa mật khẩu vào Git. DB_SSL=true của source gốc không xác minh chứng chỉ; cần cấu hình CA tin cậy khi triển khai thật.

## Kiểm thử
Đã kiểm tra cú pháp JavaScript; chưa kiểm thử tích hợp với PostgreSQL hoặc trình duyệt thật.
