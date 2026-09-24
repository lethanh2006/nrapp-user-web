# NRApp User Web

Cổng nhân viên độc lập xây dựng bằng Next.js 16, React 19 và TypeScript. Các phân hệ sử dụng NRApp Gateway làm nguồn dữ liệu thật và không còn phụ thuộc vào dữ liệu tĩnh cục bộ.

## Khởi chạy

Yêu cầu Node.js 20.9 trở lên.

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) và đăng nhập bằng tài khoản NRApp có vai trò `user` hoặc `vip`. Nếu một dịch vụ khác đang dùng cổng 3000, có thể chạy web bằng `npm run dev -- --port 3002` rồi mở [http://localhost:3002](http://localhost:3002).

Khi truy cập qua LAN, mở `http://192.168.0.108:3000` (hoặc cổng web đang dùng). IP này đã được khai báo trong `allowedDevOrigins` tại `next.config.ts` để Next.js cho phép tải JavaScript/CSS và kết nối HMR khi chạy dev. Nếu IP máy thay đổi, cập nhật danh sách này bằng IP mới, không kèm `http://` hoặc cổng, rồi khởi động lại `npm run dev`. Lỗi 403 ở `/_next/static/*` và lỗi socket `/_next/hmr` liên quan tới dev server, không phụ thuộc `NRAPP_API_URL`.

Mặc định BFF kết nối tới `https://api.thanhlelmtp2006.id.vn/api`. Có thể đổi bằng biến môi trường `NRAPP_API_URL`; tài liệu endpoint nằm tại [NRApp Swagger](https://api.thanhlelmtp2006.id.vn/api-docs).

### Chạy cùng backend Docker trên máy local

Khi Next.js chạy trực tiếp trên cùng máy với backend Docker, đặt trong `.env.local`:

```env
NRAPP_API_URL=http://127.0.0.1:3000/api
NRAPP_API_TIMEOUT_MS=10000
```

Gateway Docker dùng cổng `3000`, Grafana dùng `3001` và Loki dùng `3100`; chạy web bằng `npm run dev -- --port 3002`. BFF sẽ gọi trực tiếp cổng Gateway được Docker publish, tránh phụ thuộc kết nối Internet và domain API khi phát triển local. Nếu đổi `GATEWAY_HOST_PORT` trong backend, cập nhật cổng trong `NRAPP_API_URL` tương ứng. Khởi động lại Next.js nếu cấu hình mới chưa được nạp.

Lỗi `GATEWAY_UNAVAILABLE` được BFF trả về khi không kết nối được tới Gateway. Container `healthy` chỉ xác nhận Gateway hoạt động trong Docker; hãy kiểm tra cả URL mà `NRAPP_API_URL` đang trỏ tới từ máy chạy Next.js.

## Kiến trúc xác thực và API

```text
Trình duyệt → Next.js /api/auth/* hoặc /api/gateway/* → NRApp Gateway
```

- Đăng ký, đăng nhập bằng mật khẩu/OTP hoặc Google, khôi phục phiên và đăng xuất đi qua các route BFF cùng origin.
- Google Identity Services chỉ trả ID token cho trình duyệt; BFF chuyển token tới Gateway, kiểm tra vai trò rồi lưu access/refresh token vào cookie `HttpOnly` giống luồng OTP.
- Email chờ OTP, access token và refresh token chỉ nằm trong cookie `HttpOnly`; JavaScript phía trình duyệt không đọc được token.
- Khi access token hết hạn, BFF làm mới phiên một lần và lưu refresh token mới sau khi Gateway xoay vòng.
- Proxy chỉ cho phép các nhóm API đã khai báo: auth, user, todo, workschedule, canteen, payment và chat.
- Chỉ vai trò `user` và `vip` được vào khu vực nhân viên.

## Các route chính

- `/dang-nhap`, `/dang-ky`, `/xac-thuc`: xác thực email, mật khẩu và OTP với NRApp.
- `/trang-chu`: tổng hợp công việc và lịch làm gần nhất.
- `/lich-lam`: đọc lịch, tạo/lưu lại và gửi đăng ký lịch tuần.
- `/cong-viec`: đọc, lọc và cập nhật trạng thái công việc của người dùng.
- `/can-tin`: đọc thực đơn, tạo đơn, tạo VietQR, kiểm tra thanh toán và xem lịch sử đơn.
- `/danh-ba`: đọc danh bạ tài khoản và mở hội thoại.
- `/tro-chuyen`: đọc hội thoại, tải lịch sử và gửi tin nhắn văn bản.
- `/tien-ich`: tổng quan tháng, chấm công và tạo/hủy đơn nhân sự.
- `/ho-so`: cập nhật tên/email, đăng xuất và xóa tài khoản.

Những khả năng backend chưa có endpoint tương ứng (đổi mật khẩu, số điện thoại, tải avatar, gọi thoại/video và gửi ảnh qua proxy JSON) được vô hiệu hóa hoặc ghi chú rõ trên giao diện.

## Hệ giao diện

- Toàn bộ khu vực xác thực và 8 phân hệ nhân viên dùng chung palette navy–cobalt của NRApp; màu đỏ chỉ dành cho lỗi, ưu tiên cao hoặc thao tác nguy hiểm.
- Token màu, bề mặt, bo góc, đổ bóng, trạng thái focus và các nút dùng chung được khai báo tại `app/globals.css`.
- Giao diện có bố cục riêng cho desktop, tablet và mobile; thanh điều hướng đáy giữ các thao tác quan trọng trong tầm tay trên màn hình nhỏ.

## Biến môi trường

```env
NRAPP_API_URL=https://api.thanhlelmtp2006.id.vn/api
NRAPP_API_TIMEOUT_MS=10000
NRAPP_COOKIE_SECURE=false
NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=779200897119-2m0amhfd2prcpuuec18502f14vlfbh3f.apps.googleusercontent.com
```

`NRAPP_API_URL` là biến phía máy chủ, không dùng tiền tố `NEXT_PUBLIC_`. Ở production, cookie tự bật cờ `Secure`; chỉ đặt `NRAPP_COOKIE_SECURE=false` khi chạy HTTP cục bộ.

`NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` là định danh công khai và phải trùng với `GOOGLE_WEB_CLIENT_ID` của Auth service. Trong Google Cloud Console, thêm URL chạy web (ví dụ `http://localhost:3002` và domain production) vào **Authorized JavaScript origins** của OAuth Web Client.

## Kiểm tra chất lượng

```bash
npm run lint
npm run typecheck
npm run build
```
