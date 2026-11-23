# Tóm tắt điều hành

MicroBiz là giải pháp SaaS hỗ trợ số hóa toàn diện cho tiểu thương (như
quán ăn, tiệm tạp hóa). Sản phẩm bao gồm các module chính như
**onboarding**, **danh mục sản phẩm**, **menu/website đặt hàng**, **giỏ
hàng & thanh toán**, **quản lý đơn hàng**, **kho/hàng tồn**, **bán hàng
POS**, **khách hàng & loyalty**, **báo cáo & phân tích**, **quản trị nền
tảng**, **tích hợp thanh toán -- hóa đơn**, **tích hợp vận chuyển**,
cùng **bảo mật & phân quyền**. Hệ thống vận hành đa vai trò (chủ cửa
hàng, nhân viên, thu ngân, khách, admin, kỹ thuật) với các luồng nghiệp
vụ chính: đặt hàng tại chỗ, giao hàng, mang về, bán tại quầy, nhập hàng,
trả/hoàn tiền. MVP cần tập trung tính năng cơ bản để vận hành ngay (ví
dụ: tạo menu/sản phẩm, nhận đơn và thanh toán, báo cáo cơ bản), tính
năng nâng cao bổ sung sau (ví dụ: loyalty, tích hợp đa kênh, phân tích
nâng cao, tự động hóa đối soát). Phân biệt nghiệp vụ và UI/UX giữa quán
ăn -- tạp hóa được làm rõ trong bảng so sánh bên dưới.

**Nguồn:** Nhiều mô hình thực tiễn và báo cáo ngành tại Việt Nam cho
thấy tiểu thương hiện quản lý dữ liệu kinh doanh rời rạc (qua nhiều ví
điện tử, ứng dụng) nên cần công cụ tự động hoá số liệu thu/chi và tổng
hợp doanh thu【3†L51-L58】【27†L81-L87】.

## 1. Các module, vai trò và luồng nghiệp vụ chính

- **Onboarding (Đăng ký -- Khai báo cửa hàng):** Cho phép chủ cửa hàng
  đăng ký tài khoản, khai báo thông tin cửa hàng (tên, địa chỉ, danh mục
  kinh doanh, giờ mở cửa, các kênh bán hàng có sẵn) và cấu hình bước đầu
  (thiết lập logo, ngôn ngữ, ca làm việc). Ví dụ: tự động tạo cửa hàng
  mẫu và mời nhân viên qua email/SMS. (Vai trò: chủ cửa hàng, admin nền
  tảng)
- **Danh mục sản phẩm (Sản phẩm / Catalog):** Quản lý danh mục sản phẩm
  hoặc thực đơn (tên món/quả/kênh, hình ảnh, giá, đơn vị, mô tả). Với
  quán ăn là "món ăn -- đồ uống" chia theo nhóm (cơm, lẩu, món nhậu...),
  tạp hóa là SKU theo nhóm (thực phẩm, đồ hộp...). Hỗ trợ variant (size,
  thêm/bớt topping). (Vai trò: chủ, nhân viên nhập liệu)
- **Menu QR:** Dành riêng cho quán ăn: tự động sinh mã QR ở mỗi bàn cho
  phép khách quét gọi món/Thanh toán. QR tĩnh hoặc động tùy luồng (kết
  hợp POS)【19†L98-L107】. Tạp hóa ít dùng (có thể dùng QR quảng cáo
  khuyến mãi). (Vai trò: khách, nhân viên)
- **Website/Mobile đặt hàng:** Giao diện đặt hàng trực tuyến thân thiện
  cho cả quán ăn và tạp hóa: Danh mục, lọc tìm kiếm sản phẩm, giỏ hàng,
  đăng nhập/khách. Quán ăn cần thêm chức năng chọn bàn hoặc
  pickup/delivery, tích hợp bản đồ giao hàng. Tạp hóa cần giao diện
  giống siêu thị online, có thanh toán liền và chọn giao hàng hoặc đến
  lấy tại quầy. (Vai trò: khách, thu ngân tiếp nhận đơn hàng)
- **Giỏ hàng & Thanh toán:** Tính tổng đơn, xử lý mã giảm giá, thuế, phí
  vận chuyển. Hỗ trợ đa phương thức: tiền mặt, thẻ, ví điện tử (VNPay,
  Momo, ZaloPay...)【27†L38-L46】【27†L47-L55】. Cho phép xác nhận đơn,
  đóng/gộp bill; với quán ăn có thêm phần tip, chia hoá đơn. (Vai trò:
  khách, thu ngân)
- **Quản lý đơn hàng:** Dashboard tổng hợp đơn theo trạng thái (mới,
  đang chuẩn bị, sẵn sàng giao, hoàn tất, huỷ). Quán ăn cần in phiếu bếp
  (order ticket), cập nhật trạng thái (đang nấu, đã xong); tạp hóa cần
  in hóa đơn (POS). Cả hai có mục lịch sử đơn, cho phép đổi/trả/mở lại
  đơn. (Vai trò: nhân viên bếp, thu ngân, quản lý)
- **Kho và tồn:** Theo dõi nhập xuất kho: Quản lý tồn nguyên liệu (quán
  ăn) hoặc hàng hoá (tạp hóa). Cảnh báo tồn thấp, hỗ trợ tính định lượng
  (ví dụ, quán ăn nhập gạo/nuôi, tạp hóa quản lý từng SKU). Quản lý đơn
  mua hàng, đối soát số lượng. (Vai trò: chủ, nhân viên kho)
- **Bán hàng POS:** Giao diện bán tại quầy (máy POS hoặc tablet): cho
  phép quét mã vạch hoặc chọn sản phẩm nhanh. Quán ăn có thể dùng POS ở
  quầy thu ngân để thanh toán suất ăn, không cần qua web. Tạp hóa cần
  POS đơn giản, in hóa đơn. Kết hợp quét QR thanh toán tại quầy. (Vai
  trò: thu ngân, nhân viên bán hàng)
- **Khách hàng & Loyalty:** Quản lý thông tin khách (họ tên, điện thoại,
  lịch sử mua hàng). Chương trình thân thiết (điểm tích lũy, thẻ khách
  hàng) để kích cầu. Quán ăn gắn thẻ cho khách lặp lại, cá nhân hóa
  khuyến mãi theo sở thích. Tạp hóa tích điểm theo doanh số, gửi thông
  báo khuyến mãi qua SMS/Email. (Vai trò: chủ, nhân viên)
- **Báo cáo & phân tích:** Báo cáo doanh thu (theo ngày/ca/tuần/tháng),
  đơn hàng, sản phẩm bán chạy. Quán ăn đặc thù thêm báo cáo lượt khách
  (covers), doanh thu theo bàn/nhóm món. Tạp hóa báo cáo tồn kho, tỷ
  suất lợi nhuận (doanh thu -- vốn). Đánh giá KPI: số khách hàng lặp
  lại, thời gian giao hàng trung bình, doanh thu mỗi 1m² cửa hàng...
  (Vai trò: chủ, admin)
- **Quản trị nền tảng:** Cấu hình chung của hệ thống SaaS: phân quyền
  người dùng (RBAC), quản lý chi nhánh, thay đổi logo, ngôn ngữ, backup
  dữ liệu, xem nhật ký sự kiện. Admin nền tảng giám sát tổng thể (số
  lượng cửa hàng, API key, cấu hình hỗ trợ, quản lý gói dịch vụ). (Vai
  trò: admin kỹ thuật, support)
- **Thanh toán & Hóa đơn:** Tích hợp cổng thanh toán VNPay, Momo,
  ZaloPay (ví dụ ZaloPay Gateway【19†L98-L107】), thanh toán qua QR đa
  ngân hàng, thẻ tín dụng quốc tế (qua VNPay/OnePay)【27†L47-L55】. Hỗ
  trợ sinh hóa đơn điện tử (đáp ứng quy định thuế) và lưu trữ hoá đơn
  bán hàng. Có thể tích hợp loa thông báo số tiền vào quầy (như giải
  pháp Loa MoMo) để tự động thông báo khi có tiền thanh toán
  nhập【3†L89-L93】. (Vai trò: thu ngân, khách, chủ cửa hàng)
- **Tích hợp vận chuyển:** Kết nối API với các đơn vị giao hàng phổ biến
  tại VN (Giao Hàng Tiết Kiệm -- GHTK, Giao Hàng Nhanh -- GHN, Viettel
  Post...). Tự động tính phí ship, tạo vận đơn, theo dõi trạng thái. Ví
  dụ, GHTK/GHN cho phép shop đăng đơn, tự động nhận thông tin đơn từ hệ
  thống để giao hàng【41†L49-L58】. (Vai trò: thu ngân, quản lý đơn)
- **Bảo mật & quyền:** Hệ thống bảo mật chuẩn SaaS: xác thực đa yếu tố
  (MFA), mã hoá dữ liệu (TLS/SSL)【27†L81-L87】, phân quyền chi tiết
  theo vai trò. Cho phép chủ động sao lưu dữ liệu, xây dựng SLA cam kết
  uptime \~99% (đồng nghĩa với sao lưu/phục hồi sau thảm
  họa)【32†L338-L342】. Tuân thủ luật bảo vệ dữ liệu cá nhân mới tại VN
  (PDPL có hiệu lực từ 1/1/2026)【47†L75-L83】 và các tiêu chuẩn PCI DSS
  nếu xử lý thẻ quốc tế. Các biện pháp chống gian lận (fraud) bao gồm:
  mã hóa giao dịch, webhook xác thực từ cổng thanh toán và các quy trình
  xác thực chủ cửa hàng (giấy phép/CCCD).

#### Luồng nghiệp vụ chính

    flowchart LR
      subgraph Đặt hàng
        K(Khách hàng) -->|Đặt tại quầy| POS[Máy POS/Tablet]
        K -->|Quét QR menu| Menu[Menu QR trên điện thoại]
        K -->|Đặt online| Web[Website/App đặt hàng]
        Web -->|Xác nhận| Đơn[Đơn hàng mới]
        POS -->|Thanh toán| KhoảnThanh[Tổng số tiền]
        Menu -->|Chọn món - thanh toán| Đơn
      end
      subgraph Xử lý đơn
        Đơn -->|Tạo | Bếp[In Phiếu Bếp (Quán ăn)]    
        Đơn -->|Tạo | Kho[Đơn Xuất Kho (Tạp hóa)]    
        Bếp -->|Nấu xong| ChuẩnBị
        Kho -->|Hoàn thành chuẩn bị| ChuẩnBị
        ChuẩnBị -->|Phục vụ/Chuyển Giao| Hoàn[Hoàn thành]
      end
      subgraph Nhập/Xuất kho
        Mua[Đơn nhập hàng] -->|Kiểm tra| NhậpKho[Nhập kho]
        ĐơnXuất-->XuấtKho[Xuất kho]
        XuấtKho --> Tồn[Cập nhật tồn kho]
        NhậpKho --> Tồn
      end
      subgraph Hoàn tiền/Trả hàng
        HĐ[Đơn đã bán] -->|Khách trả hàng| Trả[Trả hàng] 
        Trả -->|Hoàn tiền/Nhập lại kho| Kho[Đơn Xuất Kho]
      end

## 2. Chức năng MVP & nâng cao (so sánh Quán ăn vs Tạp hóa)

- **Chức năng MVP (cần thiết để ra mắt):** Tất cả cửa hàng đều cần đăng
  ký, quản lý sản phẩm, tạo đơn và thanh toán cơ bản, báo cáo doanh thu.
  Cụ thể:
- **Quán ăn (Nhà hàng):** Tạo thực đơn (menu) với hình ảnh, nhóm món; mã
  QR tại bàn để khách tự gọi/mua hàng; website/app đặt bàn, đặt món
  online (có chọn hình thức ăn tại chỗ, mang về, giao hàng); quản lý đơn
  bếp (in phiếu bếp); quản lý bàn (assign order); thống kê doanh thu
  theo ngày/ca và theo món. Giao diện ưu tiên trực quan, sinh động (hình
  món ăn). (Ưu tiên: QR gọi món, POS in bếp, chia bàn/phiếu tính tiền,
  tích hợp thanh toán di động.)
- **Tạp hóa (Cửa hàng nhỏ):** Quản lý danh mục hàng hoá (SKU) theo ngành
  (tạp hóa, bánh kẹo...); giao diện đơn giản gọn nhẹ; POS cho tính tiền
  (hỗ trợ quét mã vạch); website đặt hàng cơ bản (chọn sản phẩm mua mang
  về hoặc giao hàng); theo dõi tồn kho đơn giản. Tập trung vào quy trình
  bán tại quầy và tồn kho. (Ưu tiên: POS thu ngân, quản lý nhập/xuất
  kho, in hoá đơn, tích hợp ví QR thanh toán phổ biến.)
- **Chức năng nâng cao (mở rộng):**
- **Chung:** Bán hàng đa chi nhánh, đa ngôn ngữ; loyalty (điểm thưởng,
  thẻ VIP); tích hợp marketing (SMS/Email, quảng cáo Google/Facebook),
  chat hỗ trợ khách; chatbot đặt hàng; phân tích nâng cao (AI dự đoán
  bán chạy, phân bổ kho); tích hợp ERP kế toán (sổ sách tự động).
- **Quán ăn:** Hẹn bàn, xem tình trạng bếp theo thời gian thực; combo
  món, đề xuất tự động; thanh toán nhiều phương thức (ví dụ tách bill
  cho từng khách); gọi món tại bàn (table ordering app) và gọi phục vụ;
  báo cáo khách hàng quay lại, đánh giá món. UI cần thân thiện, đẹp mắt
  với thực đơn đa dạng.
- **Tạp hóa:** Quản lý nhiều đơn vị đo lường (kg, hộp, gói); cân điện tử
  tích hợp; tự động đồng bộ tồn khi bán ra qua livestream/Facebook Shop;
  xuất hóa đơn GTGT (nếu kinh doanh); app mobile cho mua sắm nhanh qua
  mã QR trong cửa hàng (kiểu "tự quét tự tính"). UI đơn giản, tối ưu
  thao tác thanh toán nhanh.

Bảng dưới đây so sánh một số tính năng theo module giữa quán ăn và tạp
hóa:

  --------------------------------------------------------------
  Module               Quán ăn              Tạp hóa / Cửa hàng
                                            nhỏ
  -------------------- -------------------- --------------------
  **Onboarding**       Đăng ký khai báo     Đăng ký cửa hàng,
                       quán (món, bàn);     sản phẩm theo nhóm
                       hướng dẫn tạo menu   ngành;
                       QR;                  

                       tạo tài khoản nhân   hướng dẫn nhập hàng
                       viên (phục vụ, bếp)  mẫu;

  **Catalog/Sản phẩm** Danh mục món ăn/đồ   Danh mục hàng tạp
                       uống theo nhóm (cơm, hóa (trái cây, thực
                       lẩu, nước); support  phẩm); có mã vạch,
                       tùy chọn (size, số   đơn vị tính (gói,
                       lượng);              kg);

  **Menu QR**          Sinh QR cho từng     Thường không dùng
                       bàn/bàn trống, khách (có thể dùng QR
                       quét gọi món, thanh  quảng bá);
                       toán tại chỗ.        

  **Website đặt hàng** Có đặt hàng trực     Đơn giản: đặt
                       tuyến (online order) giao/mang về các sản
                       theo hình thức       phẩm có sẵn; không
                       giao/mang về; có bản cần chọn bàn/bếp.
                       đồ/chọn chi nhánh.   

  **Giỏ hàng & Thanh   Tính tiền món, thuế, Giỏ hàng tổng hóa
  toán**               phí phục vụ; chia    đơn; thanh toán
                       hoá đơn, tip; cổng   nhanh (POS), thường
                       thanh toán đa dạng.  có ghi chú đơn giản;

  **Quản lý đơn hàng** Phiếu bếp, trạng     In hoá đơn/phiếu
                       thái món (đang nấu,  xuất kho; theo dõi
                       sẵn sàng); quản lý   đơn giao/mang về, xử
                       bàn (điều phối       lý trả hàng;
                       order).              

  **Kho & Tồn**        Nhập nguyên liệu, sử Nhập hàng hóa, quản
                       dụng (theo công thức lý tồn kho nhiều
                       món); cảnh báo thiếu SKU; tích hợp cân
                       nguyên liệu.         điện tử; kiểm soát
                                            lãi lỗ từng đầu mục.

  **POS bán hàng**     POS bàn/phòng (theo  POS thu ngân (chọn
                       bàn, theo bill);     SKU/mã vạch); in hóa
                       nhận đơn tại quầy    đơn GTGT; tích hợp
                       (có in bếp).         máy in két tiền.

  **Khách hàng &       Tích hợp đặt bàn,    Tích điểm/chiết khấu
  Loyalty**            khách lặp lại (thân  cho khách quen; quản
                       thiết); thẻ thành    lý phiếu quà; nhắc
                       viên ăn uống; đánh   lịch nhập kho tự
                       giá món.             động;

  **Báo cáo & KPI**    Doanh thu theo ca,   Doanh thu theo nhóm
                       theo món, trung bình hàng, số mặt hàng
                       hóa đơn; lượng khách bán/ngày; lợi nhuận
                       (covers); thời gian  gộp; vòng quay kho;
                       bàn xoay.            tỷ lệ đổi trả.

  **Thanh toán & Hóa   Tích hợp ví QR       Tích hợp cổng tổng
  đơn**                (VNPay QR, Momo,     hợp (VNPay); QR cửa
                       Zalo); thanh toán    hàng (điểm thanh
                       thẻ tại bàn; hóa đơn toán); hóa đơn bán
                       điện tử.             hàng/GTTT.

  **Tích hợp vận       Tạo đơn giao hàng    Kết nối GHTK, GHN để
  chuyển**             (grab/giao đồ) qua   giao hàng; tự động
                       API; Theo dõi thu    tính cước theo cân
                       tiền hộ.             nặng/địa chỉ.

  **Bảo mật & Phân     Phân quyền chi tiết  Phân quyền (quản lý,
  quyền**              (quản lý, phục vụ,   thu ngân, kho); bảo
                       bếp); bảo mật giao   mật; sao lưu dữ
                       dịch; sao lưu định   liệu.
                       kỳ.                  
  --------------------------------------------------------------

## 3. Quản lý vận hành SaaS

- **Onboarding khách hàng:** Hướng dẫn từng bước (wizard) sau khi đăng
  ký: chủ cửa hàng hoàn thiện hồ sơ pháp lý/cấp giấy phép kinh doanh,
  chọn gói dịch vụ, tạo cửa hàng đầu tiên, nhập nhanh danh mục sản phẩm
  cơ bản (có thể import CSV). Hỗ trợ tư vấn/trợ giúp qua chatbox hoặc
  trợ lý ảo. Ví dụ: khi chủ quán đăng ký, hệ thống tự động kích hoạt tài
  khoản và tạo mẫu cửa hàng, sau đó cung cấp giao diện hướng dẫn đăng ký
  tên miền (nếu có) và liên kết cổng thanh toán.
- **Cấu hình cửa hàng:** Chủ có thể tuỳ chỉnh giao diện (logo, màu sắc),
  tùy chỉnh chính sách (giao nhận, hoàn tiền), cài đặt ca làm việc,
  thuế, phương thức thanh toán (ví dụ chọn cổng Ví điện tử hoặc thẻ). Hệ
  thống đám mây cho phép cấu hình linh hoạt từng cửa hàng hoặc nhiều chi
  nhánh.
- **Quản lý gói cước & Thanh toán định kỳ:** Mô hình giá gồm **phí thiết
  lập** (setup fee một lần) và **phí duy trì hàng tháng**
  (subscriptions). Cung cấp nhiều gói Basic/Standard/Pro (ví dụ: Basic
  chỉ có website-QR, Standard thêm POS, Pro đầy đủ báo cáo nâng cao).
  Tích hợp cổng thanh toán tự động (billing) để thu phí định kỳ từ thẻ
  ngân hàng hoặc ví điện tử của khách hàng (NAPAS, QR Pay...). Quản lý
  nâng cấp/hạ cấp gói qua UI. (Ví dụ như nhiều SaaS, cấp quyền add-on,
  API extension dựa trên gói).
- **SLA, backup, monitoring:** Nhà cung cấp SaaS cam kết SLA (ví dụ
  99.9% uptime) và thường xuyên sao lưu dữ liệu khách hàng (snapshot
  hàng ngày). Hệ thống giám sát (monitoring) theo thời gian thực về hiệu
  suất máy chủ, API response, cảnh báo downtime. Cơ chế phục hồi sau
  thảm họa, backup dữ liệu (tối thiểu lưu trữ bản sao tại trung tâm
  khác). Theo kinh nghiệm, các SaaS uy tín đều đảm bảo đầu tư hạ tầng và
  giao thức an ninh mạng nghiêm ngặt【32†L338-L342】.
- **Hỗ trợ khách hàng:** Đảm bảo hỗ trợ kịp thời qua chat, email và
  hotline. Có bộ phận customer success giúp tối ưu sử dụng (hỗ trợ kỹ
  thuật, setup, training). Cung cấp tài liệu, video hướng dẫn sử dụng
  (FAQs). Cảnh báo và đôn đốc thanh toán cước trước ngày hết hạn.

## 4. Bảo mật & tuân thủ

- **Xác thực & Phân quyền:** Hỗ trợ đăng nhập nhiều lớp (mật khẩu + OTP
  qua SMS/email, 2FA); phân quyền chi tiết theo vai trò (ví dụ: thu ngân
  chỉ xem/ghi đơn, chủ xem báo cáo/toàn quyền cấu hình).
- **Mã hoá:** Toàn bộ dữ liệu truyền qua mạng được mã hoá TLS/SSL; mật
  khẩu lưu dạng băm (hash) tiêu chuẩn; dữ liệu nhạy cảm (chứng từ, hợp
  đồng) mã hoá ở rest. Theo hướng dẫn của các chuyên gia bảo mật, giao
  dịch phải được mã hoá tuyệt đối để ngăn chặn gian lận【27†L81-L87】.
- **Sao lưu & phục hồi:** Tự động sao lưu dữ liệu định kỳ
  (ngày/tuần/tháng), sao lưu incremental, đảm bảo có thể khôi phục toàn
  bộ hệ thống về thời điểm bất kỳ. Yêu cầu khách hàng giữ quyền sở hữu
  dữ liệu; hệ thống cho phép xuất dữ liệu (export CSV/Excel) mọi lúc.
- **Pháp lý & tuân thủ:** Tuân thủ GDPR/PDPA nếu xử lý dữ liệu khách
  EU/Châu Á (ví dụ nếu khách xuất hóa đơn cho doanh nghiệp nước ngoài),
  và **Luật bảo vệ dữ liệu cá nhân Việt Nam** (PDPL) có hiệu lực từ
  1/1/2026, yêu cầu bảo vệ quyền riêng tư người dùng và báo cáo vi phạm
  dữ liệu【47†L75-L83】. Luật này bắt buộc doanh nghiệp phải xin phép rõ
  ràng khi thu thập thông tin cá nhân, và cho phép người dùng truy
  cập/xóa thông tin của họ. Ngoài ra, vì tích hợp thanh toán, phải tuân
  thủ PCI DSS (cho thẻ quốc tế) và quy định hóa đơn điện tử theo Thuế.
- **Chống gian lận thanh toán:** Kết hợp nhiều biện pháp như đối soát tự
  động (Webhook nhận tín hiệu thành công/không thành công từ cổng thanh
  toán), xác thực hai chiều callback (hmac/chuẩn mã hoá), giám sát bất
  thường (như đơn giá vượt ngưỡng, nhiều giao dịch thất bại liên tục).
  Dữ liệu giao dịch được lưu log chi tiết để tra cứu khi có tranh chấp.

## 5. Báo cáo & KPI

Ứng dụng cung cấp **báo cáo dashboard** và export theo yêu cầu. Các chỉ
số chính bao gồm:

- **Doanh thu:** Theo ngày, ca, tuần, tháng, theo sản phẩm/món hàng,
  theo kênh (tại chỗ, giao hàng, online). Cho biết lợi nhuận ước tính
  (doanh thu trừ giá vốn hàng bán).
- **Tồn kho:** Số lượng tồn kho hiện tại, giá trị hàng tồn (chi phí
  vốn), vòng quay tồn (bao lâu cần nhập thêm).
- **Lợi nhuận:** Tính lãi gộp theo từng mặt hàng, tỉ suất lợi nhuận trên
  doanh thu.
- **Khách hàng:** Số khách hàng mới vs lặp lại, tỉ lệ giữ chân (ví dụ %
  khách tái sử dụng app), giá trị trung bình đơn hàng (AOV).
- **Thời gian giao hàng:** Với đơn giao, báo cáo thời gian trung bình từ
  nhận đơn đến giao hàng; tỉ lệ giao trễ.
- **Hiệu suất nhân viên:** Số đơn/hóa đơn mỗi nhân viên (nhân viên bán
  hàng, bếp), doanh thu mỗi nhân viên.

## 6. Tích hợp ưu tiên

- **Cổng thanh toán VN:** Tích hợp các gateway phổ biến: **VNPay
  QR/OnePay** (thẻ ATM/NAPAS, Visa/Master, QR ngân hàng)【27†L47-L55】;
  **Ví điện tử**: **Momo, ZaloPay** (e-wallet QR)【27†L38-L46】; hỗ trợ
  **Apple Pay/Google Pay** nếu cần (qua ví/phương án tích hợp).
- **Giao vận:** Tích hợp API các đơn vị lớn: **GHTK, GHN, Viettel Post,
  NinjaVan**... để tạo vận đơn tự động, đối soát phí ship và theo dõi.
- **POS/ERP:** Kết nối với hệ thống POS phổ biến tại VN (Haravan POS,
  KiotViet, Sapo POS...) hoặc ERP (MISA, Fast) để đồng bộ hóa tồn kho,
  đơn hàng, kế toán.
- **SMS/Email:** Gửi thông báo đơn hàng, mã OTP, mã giảm giá cho khách
  qua SMS hoặc email (tích hợp Twilio/SendGrid hoặc đối tác VN như
  vnTimes, TPA).
- **Google/Facebook:** Đồng bộ cửa hàng lên Google My Business (để khách
  tìm kiếm menu, địa điểm) và tích hợp Facebook Pixel/Google Analytics
  để remarketing.
- **In hoá đơn:** Hỗ trợ máy in hóa đơn nhiệt (80mm) hoặc in bill A4
  (hóa đơn GTGT); xuất QR code VNPAY-QR trên hóa đơn thanh toán.

## 7. Lộ trình phát triển (6--12 tháng) & Mô hình thu phí

- **MVP (0--3 tháng):** Cơ bản để triển khai ra thị trường: Onboarding
  đơn giản, quản lý sản phẩm, tạo đơn đặt hàng, tính tiền và xuất hóa
  đơn, báo cáo doanh thu/đơn hàng, chức năng cơ bản quản lý kho/tồn. Hỗ
  trợ vai trò chủ và thu ngân. Tích hợp ít nhất một cổng thanh toán (ví
  dụ VNPAY-QR) và SMS OTP. **Nhân sự:** 1 PM/BA, 1--2 Frontend, 1--2
  Backend, 1 DevOps/QA. **Chi phí phát triển:** Đa phần dành cho việc
  xây dựng kiến trúc hệ thống, API thanh toán và UX cơ bản.

- **Phiên bản v1 (3--6 tháng):** Bổ sung tính năng nâng cao: POS in hóa
  đơn nhiệt, loyalty cơ bản, quản lý kho nâng cao, báo cáo chi tiết hơn,
  tích hợp MoMo/ZaloPay, giao hàng. Thêm vai trò nhân viên bếp, quản lý
  kho. Hoàn thiện UI/UX (theme tùy chỉnh, đa ngôn ngữ). **Nhân sự:**
  Thêm mobile dev (nếu có app), 1 kỹ sư QA.

- **Phiên bản v2 (6--12 tháng):** Mở rộng toàn diện: Chương trình
  loyalty/phân tích AI, tích hợp ERP kế toán, marketing automation
  (SMS/email marketing), đa chi nhánh, tích hợp Google/Facebook. Hỗ trợ
  POS đa nền tảng (mobile/touchscreen). **Nhân sự:** Bổ sung 1 Product
  manager, thêm backend scaling (1-2 người), 1 chuyên viên DevOps
  (monitoring/microservices).

- **Phân chia công việc & ước lượng chi phí:**

- *Frontend/Web/Mobile:* Giao diện người dùng, thiết lập menu, tính năng
  giỏ hàng, báo cáo.

- *Backend/API:* Nghiệp vụ đặt hàng, kho, tích hợp thanh toán/ship, bảo
  mật.

- *Operations (DevOps):* Hạ tầng, CI/CD, giám sát, backup, triển khai
  cloud.

- *Product/QA:* Phân tích nghiệp vụ, lên kế hoạch roadmap, kiểm thử chức
  năng/sảo lỗi.

- **Mô hình giá và gói cước:**

- **Phí thiết lập (Setup):** Một lần khi đăng ký (bao gồm cài đặt ban
  đầu, tích hợp cổng thanh toán, training cơ bản).

- **Gói Basic:** Bao gồm website đặt hàng, menu QR, báo cáo doanh thu cơ
  bản, không giới hạn sản phẩm; không có POS, tích hợp thanh toán cơ bản
  (VNPAY-QR).

- **Gói Standard:** Thêm POS, quản lý tồn kho, phân quyền nhân viên, 1
  cổng ví điện tử (Momo/ZaloPay), báo cáo nâng cao (theo sản phẩm).

- **Gói Pro:** Toàn diện: thêm loyalty, SMS marketing, tích hợp ERP/Tài
  chính, API mở, báo cáo phân tích sâu, ưu tiên hỗ trợ 24/7.

- **Dịch vụ giá trị gia tăng:** Tư vấn marketing, thiết kế website
  riêng, hỗ trợ vận hành chuyên sâu (accounting setup, audit), hỗ trợ
  chuyên gia chuyển đổi số.

Các biểu đồ và bảng so sánh trên tóm tắt chi tiết chức năng giữa hai mô
hình cửa hàng, luồng nghiệp vụ điển hình và lộ trình phát triển, từ đó
giúp MicroBiz tập trung vào các tính năng thiết yếu để ra mắt nhanh
(MVP) và xây dựng gói dịch vụ linh hoạt sau này.

**Nguồn:** Tài liệu hướng dẫn tích hợp cổng thanh toán
ZaloPay【19†L98-L107】, đánh giá mô hình thanh toán tại
VN【27†L38-L46】【27†L47-L55】, báo cáo của MoMo về giải pháp số hóa cho
tiểu thương【3†L89-L93】, hướng dẫn SaaS (AWS) về SLA và bảo
mật【32†L338-L342】【32†L376-L384】, thông tin Luật Bảo vệ dữ liệu cá
nhân VN【47†L75-L83】.

------------------------------------------------------------------------
