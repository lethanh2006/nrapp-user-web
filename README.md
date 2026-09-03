# NRApp User Web

Web nhân viên độc lập được khởi tạo từ luồng user của `Nrapp`, dùng Next.js 16, React 19 và TypeScript. Giao diện giữ nhận diện xanh của app user, đồng thời được tổ chức lại cho dashboard desktop và responsive mobile.

Project không import source trực tiếp từ `Nrapp` hoặc `nrapp-admin-web`. Asset nhận diện cần dùng được sao chép vào `public/images` và `app/icon.png`, vì vậy ba ứng dụng có thể build/deploy độc lập.

## Chạy dự án

Yêu cầu Node.js 20.9 trở lên.

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Route `/` chuyển tới `/trang-chu`.

Luồng đăng nhập demo:

1. Mở `/dang-nhap`; tài khoản mẫu đã được điền sẵn.
2. Gửi form để tới `/xac-thuc`.
3. Mã OTP mẫu `123456` đã được điền sẵn; xác nhận để vào `/trang-chu`.

## Route chính

| Route | Nội dung |
| --- | --- |
| `/dang-nhap`, `/dang-ky`, `/xac-thuc` | Auth hai bước theo hợp đồng login → OTP của NRApp |
| `/trang-chu` | Lịch hôm nay, truy cập nhanh, công việc và tin tức nội bộ |
| `/lich-lam` | Chọn tuần, văn phòng/remote, lưu nháp và gửi duyệt demo |
| `/cong-viec` | Tìm/lọc và chuyển trạng thái `todo → in_progress → done` |
| `/can-tin` | Thực đơn, giỏ hàng, giờ nhận, tiền mặt/VietQR mô phỏng |
| `/danh-ba` | Tìm kiếm, lọc phòng ban, liên hệ và mở cuộc trò chuyện |
| `/tro-chuyen` | Danh sách hội thoại và gửi tin nhắn cục bộ |
| `/tien-ich` | Chấm công, tổng quan tháng, lịch sử và tạo đơn nhân sự |
| `/ho-so` | Chỉnh hồ sơ, thông báo, bảo mật và phiên đăng nhập |

Hai alias `/dashboard` và `/nhan-su` lần lượt chuyển tới `/trang-chu` và `/danh-ba` để thuận tiện khi đi giữa hai web.

## Dữ liệu và Gateway

Phiên bản khởi tạo dùng dữ liệu demo trong `lib/mock-data.ts`, giống chiến lược hiện tại của `nrapp-admin-web`. DTO và trạng thái quan trọng bám theo source `Nrapp`; cấu hình cùng bản đồ endpoint đã được tách sẵn tại:

- `lib/api/config.ts`
- `lib/api/endpoints.ts`
- `.env.example`

Để chuẩn bị tích hợp Gateway:

```bash
cp .env.example .env.local
```

Sau đó cấu hình:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_API_TIMEOUT_MS=10000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_PATH=/socket.io
```

Biến `NEXT_PUBLIC_*` được đóng gói vào JavaScript phía trình duyệt, không đặt secret trong các biến này.

Khi nối backend thật cần giữ các quy tắc từ `Nrapp`: login chỉ gửi OTP, verify mới tạo phiên; refresh các lỗi 401 đồng thời bằng một request; web user chỉ nhận role `user`/`vip`; đơn căn tin phân biệt `paymentStatus=PAID` với giao dịch `status=SUCCESS`; chat dùng Socket.IO; lịch đã pending/approved là chỉ đọc.

## Kiểm tra chất lượng

```bash
npm run lint
npm run typecheck
npm run build
```
