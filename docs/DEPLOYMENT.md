# Đưa TLAi lên Render + Vercel

Repo: https://github.com/ngodaclam/QuizAi

Frontend chạy trên Vercel, API chạy trên Render, dữ liệu lưu trong MongoDB Atlas. Hai gói dùng Node.js 24.x. Chỉ đưa mã nguồn và logo vào Git; `.env`, file upload, bộ câu hỏi trong `outputs/` và database Docker là dữ liệu local.

## 1. MongoDB Atlas

Tạo cluster và database user cho ứng dụng, cấp quyền đọc/ghi vào database `tlai`. Lấy connection string từ **Connect → Drivers** và dùng database `tlai` trong URI. Nhập URI có mật khẩu trực tiếp vào biến `MONGODB_URI` trên Render.

Trong Atlas **Network Access**, thêm các dải IP outbound của dịch vụ Render (xem mục **Connect → Outbound** trên Render). Atlas chỉ nhận kết nối từ các IP được cho phép. Xem [MongoDB Atlas IP access list](https://www.mongodb.com/docs/atlas/security/ip-access-list/) và [Render outbound IP](https://render.com/docs/outbound-ip-addresses).

## 2. Backend trên Render

Chọn **New → Blueprint**, kết nối repo này và dùng `render.yaml` ở thư mục gốc. File này chọn gói Free và yêu cầu nhập `MONGODB_URI`, `GEMINI_API_KEY`; Render tự sinh `JWT_SECRET`. Cơ chế điền biến và sinh secret được mô tả trong [Render Blueprint](https://render.com/docs/blueprint-spec).

Nếu tạo **Web Service** thủ công, dùng:

| Thiết lập | Giá trị |
|---|---|
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

Các biến môi trường:

| Biến | Giá trị |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | URI MongoDB Atlas của bạn |
| `JWT_SECRET` | Secret ngẫu nhiên riêng cho bản online; Blueprint tự sinh |
| `JWT_EXPIRE` | `7d` |
| `GEMINI_API_KEY` | API key của bạn, chỉ đặt trên Render |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` hoặc model bạn được cấp quyền |
| `SERVER_URL` | URL HTTPS thực tế Render cấp cho backend |

Để dùng PDF, thêm `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Excel lưu câu hỏi vào MongoDB và không cần Cloudinary. PDF hiện được tải lên Cloudinary sau khi xử lý; cần kiểm tra URL đã chuyển sang Cloudinary để file tồn tại sau khi Render khởi động lại.

Đợi backend deploy xong, mở `/health` và xem log kết nối MongoDB thành công. Sao chép URL backend để dùng ở bước tiếp theo.

Gói Free ngủ sau 15 phút không có truy cập, lần mở tiếp theo có thể mất khoảng một phút. File lưu trên ổ đĩa tạm mất khi redeploy/khởi động lại; vì vậy dùng Atlas và Cloudinary cho dữ liệu cần giữ. Xem [giới hạn Render Free](https://render.com/docs/free). Import nhiều câu dùng tác vụ nền; tiến độ từng lô đã được lưu vào MongoDB để tiếp tục khi máy chủ khởi động lại.

## 3. Frontend trên Vercel

Chọn **Add New → Project**, import repo này:

| Thiết lập | Giá trị |
|---|---|
| Framework Preset | Vite |
| Root Directory | `frontend/quizai` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js | 24.x |

Thêm `VITE_API_URL` bằng URL HTTPS backend Render, **không thêm `/api`**. Đặt cho môi trường Production; nếu dùng Preview thì đặt cho Preview nữa. Sau khi đổi biến, redeploy frontend để cập nhật bản build. Không đặt Gemini key, JWT secret hoặc URI MongoDB vào frontend.

`vercel.json` đã có rewrite về `index.html` để tải lại các đường dẫn như `/documents/...` và `/quizzes/...` không bị 404, theo [hướng dẫn Vite trên Vercel](https://vercel.com/docs/frameworks/frontend/vite). Build trên Vercel sẽ báo lỗi nếu thiếu URL backend hợp lệ.

## 4. Kiểm tra bản online

1. Mở URL Vercel, tạo tài khoản và đăng nhập.
2. Import một file Excel mẫu, chờ xử lý rồi tạo bài test với số câu mong muốn.
3. Nộp bài, xem kết quả và gửi câu hỏi cho chatbot.
4. Tải lại trực tiếp đường dẫn bài test để kiểm tra routing.
5. Nếu dùng PDF, xác nhận file đã lưu ở Cloudinary và vẫn mở được sau redeploy backend.

Database Atlas mới không tự có tài khoản và bộ 232 câu trong Docker trên máy. Có thể đăng ký tài khoản online rồi import lại Excel, hoặc thực hiện một bước chuyển dữ liệu riêng. Mỗi người dùng hiện quản lý tài liệu của tài khoản mình.

## Khi gặp lỗi

- Build Vercel báo `VITE_API_URL`: kiểm tra giá trị HTTPS thực tế của Render, không dùng localhost, URL mẫu hoặc thêm `/api`.
- Render không kết nối Atlas: kiểm tra database user, mật khẩu đã URL-encode và danh sách IP cho phép.
- Gemini báo model/quota: kiểm tra `GEMINI_MODEL` và hạn mức của key trên Render.
- File PDF không còn sau redeploy: kiểm tra cấu hình Cloudinary và log upload; ổ đĩa tạm Render không phải nơi lưu lâu dài.
