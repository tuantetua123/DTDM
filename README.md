# Cloud TaskFlow – Render + Vercel + Neon PostgreSQL

Cùng một repository, hai website, một database. Không đăng nhập: chỉ dùng dữ liệu mẫu vì mọi người có URL đều có thể sửa/xóa.

## Local
1. Tạo project tại https://console.neon.tech, chọn Connect, sao chép connection string pooled thực tế. Dùng sslmode=verify-full (giữ các tham số khác).
2. PowerShell: `Copy-Item .env.example .env`. Mở .env, điền DATABASE_URL thật; không commit .env.
3. `npm ci`, `npm start`, mở http://localhost:3000. Kiểm tra /health và /items. Bảng được tạo/nâng cấp khi gọi /items lần đầu.

## GitHub
Tạo repository, upload nội dung thư mục gốc (kể cả render.yaml, vercel.json, .gitignore), không upload .env hoặc node_modules.

## Render (bắt buộc theo đề)
https://dashboard.render.com : New > Web Service > chọn repository. Runtime Node, Build Command `npm ci`, Start Command `npm start`. Environment: DATABASE_URL = chuỗi Neon thật. Không đặt PORT thủ công. Có thể dùng Blueprint với render.yaml thay thế. Deploy, mở URL onrender.com được cấp. Free service có thể ngủ và khởi động chậm.

## Vercel (bổ sung)
https://vercel.com/new : import cùng repository, root directory là thư mục gốc, không đặt output directory hoặc build command tùy chỉnh. Thêm DATABASE_URL trong Environment Variables với cùng giá trị Neon của Render, Deploy. vercel.json định tuyến Express và đóng gói public. Nếu dashboard báo lỗi cấu hình, xem build logs trước khi thay đổi. URL vercel.app do Vercel cấp.

## Demo
Mở URL Render trên máy tính, URL Vercel trên điện thoại. Thêm công việc, kiểm tra danh sách ở thiết bị còn lại sau khoảng 5 giây khi Auto Sync bật, tab đang hiển thị và không chỉnh sửa. Thử đánh dấu hoàn thành, sửa, xóa. /health hiển thị nền tảng, trạng thái DB, độ trễ, uptime và instance; uptime Vercel không phải uptime toàn hệ thống. Polling tiêu thụ hạn mức Cloud; tắt Auto Sync khi không demo. Không cần mở Firewall hoặc cùng Wi-Fi.

## Kiểm thử
Kiểm tra cú pháp JavaScript và JSON. Chưa chạy tích hợp với Neon hay deploy thực tế; cần tài khoản và chuỗi kết nối của người dùng.
