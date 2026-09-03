# NRApp User Web

Cổng nhân viên độc lập được xây dựng từ các luồng user của `Nrapp`, sử dụng Next.js 16, React 19 và TypeScript. Ứng dụng có giao diện responsive cho desktop/mobile và không import source trực tiếp từ `Nrapp` hay `nrapp-admin-web`.

## Trạng thái triển khai

Luồng xác thực đã kết nối theo đúng hợp đồng của NRApp:

```text
Trình duyệt → Next.js /api/auth/* → NRApp Gateway
```

- Đăng ký, đăng nhập, xác thực OTP, khôi phục phiên và đăng xuất đã có API BFF.
- Email đang chờ OTP được giữ trong cookie `HttpOnly` trong 5 phút, không xuất hiện trên URL.
- Access token và refresh token chỉ nằm trong cookie `HttpOnly`; JavaScript phía trình duyệt không đọc được token.
- Access token hết hạn sẽ được refresh đúng một lần và token refresh mới được lưu sau khi Gateway xoay vòng.
- Chỉ role `user` và `vip` được vào khu vực nhân viên.
- Các module công việc, lịch làm, căn tin, danh bạ, chat, tiện ích và hồ sơ hiện vẫn dùng dữ liệu demo; chúng được tách để nối API ở các lát cắt tiếp theo.

## Chạy chế độ demo

Yêu cầu Node.js 20.9 trở lên.

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Mặc định ứng dụng mở tại [http://localhost:3000](http://localhost:3000). Nếu NRApp Gateway cũng đang chạy ở cổng `3000`, hãy dùng cổng khác cho web:

```bash
npm run dev -- --port 3100
```

Tài khoản mẫu đã được điền sẵn:

- Email: `minhanh@hdg.vn`
- Mật khẩu: `HDG@2026`
- OTP: `123456`

Truy cập `/trang-chu` khi chưa có phiên sẽ tự chuyển về `/dang-nhap`. Sau khi xác thực OTP, người dùng được đưa trở lại đường dẫn ban đầu.

## Kết nối Gateway thật

Đặt các biến sau trong `.env.local` hoặc phần Environment Variables của nền tảng triển khai:

```env
NEXT_PUBLIC_APP_MODE=live
NRAPP_API_URL=https://gateway.example.com/api
NRAPP_API_TIMEOUT_MS=10000
```

`NRAPP_API_URL` là biến phía máy chủ, không dùng tiền tố `NEXT_PUBLIC_`. Ở production, cookie tự bật cờ `Secure`, vì vậy website cần chạy qua HTTPS. Chỉ đặt `NRAPP_COOKIE_SECURE=false` khi kiểm thử `next start` cục bộ qua HTTP.

Nếu không khai báo `NEXT_PUBLIC_APP_MODE`, development dùng `demo` còn production mặc định dùng `live` để tránh vô tình phát hành tài khoản mẫu.

Các endpoint Next.js đang cung cấp:

| Endpoint | Mục đích |
| --- | --- |
| `POST /api/auth/register` | Tạo tài khoản |
| `POST /api/auth/login` | Kiểm tra mật khẩu và yêu cầu Gateway gửi OTP |
| `POST /api/auth/verify` | Xác thực OTP và tạo cookie phiên |
| `GET /api/auth/session` | Lấy người dùng hiện tại, tự refresh một lần khi cần |
| `POST /api/auth/logout` | Xóa phiên trên thiết bị hiện tại |

Backend hiện chưa có endpoint gửi lại OTP riêng hoặc thu hồi phiên khi logout. Người dùng cần quay lại trang đăng nhập để yêu cầu OTP mới; logout trên web chỉ xóa cookie của thiết bị hiện tại.

## Route chính

| Route | Nội dung |
| --- | --- |
| `/dang-nhap`, `/dang-ky`, `/xac-thuc` | Xác thực hai bước theo Gateway NRApp |
| `/trang-chu` | Lịch hôm nay, truy cập nhanh, công việc và tin tức nội bộ |
| `/lich-lam` | Chọn tuần, văn phòng/remote, lưu nháp và gửi duyệt demo |
| `/cong-viec` | Tìm/lọc và chuyển trạng thái `todo → in_progress → done` |
| `/can-tin` | Thực đơn, giỏ hàng, giờ nhận, tiền mặt/VietQR mô phỏng |
| `/danh-ba` | Tìm kiếm, lọc phòng ban, liên hệ và mở cuộc trò chuyện |
| `/tro-chuyen` | Danh sách hội thoại và gửi tin nhắn cục bộ |
| `/tien-ich` | Chấm công, tổng quan tháng, lịch sử và tạo đơn nhân sự |
| `/ho-so` | Hồ sơ, thông báo, bảo mật và phiên đăng nhập |

Hai alias `/dashboard` và `/nhan-su` lần lượt chuyển tới `/trang-chu` và `/danh-ba`.

## Build production

```bash
npm ci
npm run build
npm run start
```

## Kiểm tra chất lượng

```bash
npm run lint
npm run typecheck
npm run build
```
