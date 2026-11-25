import Link from "next/link";

export default function SupportPage() {
  return (
    <>
      <h1>Hỗ trợ</h1>
      <p>Khi quán cần hỗ trợ, dùng mã quán để đối chiếu thông tin liên hệ và tình trạng dịch vụ.</p>
      <ul>
        <li><Link href="/admin/stores">Tra cứu mã quán, trạng thái và thông tin liên hệ</Link></li>
        <li><Link href="/admin/subscriptions">Kiểm tra gói, ngày hết hạn và hoá đơn thuê bao</Link></li>
      </ul>
    </>
  );
}
