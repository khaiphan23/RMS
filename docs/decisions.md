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

## 11. Hardening RLS sau audit

Migration `0021_security_hardening.sql` chốt thêm (chạy sau `0020_order_and_reporting_reliability.sql`):

- Anon không còn SELECT trực tiếp `menu_categories` / `menu_items`; menu khách chỉ đọc qua `get_table_menu`.
- `order_items` chỉ được insert/update/delete khi đơn ở `pending` hoặc `preparing`.
- Owner chỉ đọc được `plans` gắn với subscription của quán mình.
- Platform admin bị chặn `get_table_menu` và mọi insert/update trực tiếp trên `orders` (bao gồm `place_order`).

Thứ tự deploy: `0020_order_and_reporting_reliability.sql` trước, `0021_security_hardening.sql` sau. Kiểm tra `supabase_migrations.schema_migrations` trên staging; nếu đã có version `0020` từ file security cũ, repair/revert version đó trước khi push, nếu không CLI có thể coi `0020` đã áp dụng và bỏ qua migration mới.

## 12. Doanh thu và đơn đã huỷ

Doanh thu báo cáo tính theo **tiền đã thu** (`payments.payment_status = 'paid'`, theo ngày `paid_at`), không tự động trừ khi đơn chuyển sang `cancelled`. Đơn huỷ không tính vào số đơn và top món.

Nếu khách đã trả tiền rồi huỷ đơn, kế toán phải ghi nhận hoàn tiền bằng `payments.payment_status = 'refunded'` để khoản đó không còn trong doanh thu. MVP chưa có nút hoàn tiền trên UI; bổ sung khi làm luồng hoàn tiền, không sửa số liệu đã chốt.
