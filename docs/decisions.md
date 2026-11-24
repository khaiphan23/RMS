# Quyết định dự án

Các quyết định đã chốt. Quyết định mới thêm vào cuối, không sửa mục cũ (muốn đổi thì thêm mục mới ghi rõ thay thế mục nào).

## 1. Stack

Next.js App Router + TypeScript + Supabase + pnpm.

## 2. Tên gọi

RMS = Restaurant Management System (tên dự án/repo). Thương hiệu sản phẩm: MicroBiz.

## 3. Định tuyến đa cửa hàng

Mỗi cửa hàng là một path: `/q/{storeSlug}/{tableCode}`. QR in ra trỏ thẳng vào URL này.

## 4. Bàn và QR

Có bảng `tables` ngay từ MVP; mỗi bàn một QR riêng, kèm một QR chung của quán (không gắn bàn).

## 5. Thanh toán MVP

Chỉ ghi nhận thanh toán thủ công (tiền mặt / chuyển khoản), chưa tích hợp cổng thanh toán. Trạng thái đơn và trạng thái thanh toán là hai trường tách biệt.

## 6. Phạm vi MVP

Theo `docs/microbiz-tom-tat-cho-dong-doi.md`: menu QR, QR bàn, đặt món, màn hình nhận đơn, quản lý bàn, báo cáo cơ bản.
Chưa làm: kho, POS tạp hóa, loyalty, AI, ERP, đa chi nhánh, vận chuyển.

## 7. Vai trò

super_admin, owner, manager, cashier, waiter, kitchen, customer.

## 8. Ranh giới dữ liệu platform admin

Platform admin chỉ thấy dữ liệu phục vụ việc cho thuê dịch vụ: tên quán, chủ quán, liên hệ, gói dịch vụ, trạng thái, ngày đăng ký/hết hạn, phí thuê dịch vụ.
Platform admin KHÔNG được truy cập: đơn hàng, doanh thu, menu chi tiết, thông tin nhân viên, lương, khách hàng của quán. Dữ liệu quán chỉ chủ quán và nhân viên của quán đó xem được.

## 9. Đổi tên vai trò quản trị nền tảng

`platform_admin` là tên chính thức, thay cho `super_admin` ở mục 7.

## 10. Luồng khách qua hàm RPC

Khách đặt món và xem trạng thái đơn chỉ thông qua hàm RPC `public.place_order` / `public.get_order_status` trong migration `0018_customer_rpc.sql`. Không dùng `service_role` ở luồng khách. Không mở thêm quyền SELECT/INSERT trực tiếp cho anon trên bảng `orders`, `order_items`, `payments`, `menu_items`; khách chỉ gọi hàm RPC, hàm tự kiểm tra quyền/nghiệp vụ và chặn `platform_admin` đọc đơn qua `get_order_status`.
