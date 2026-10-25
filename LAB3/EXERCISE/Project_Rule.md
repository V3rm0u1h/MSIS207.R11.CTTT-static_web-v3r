Dưới đây là 4 quy tắc (Project Rules) cốt lõi kèm theo lý do chi tiết (giống như phần ghi chú trong sổ tay của bạn) dành cho dự án Mini-React này:

1. Quy tắc: Zero Div-Soup (Cấm lạm dụng thẻ Div)
Quy tắc: Bắt buộc sử dụng các thẻ HTML ngữ nghĩa chính xác cho từng thành phần giao diện (ví dụ: <main>, <header>, <section>, <h1, <p>, <button>), tuyệt đối không bọc mọi thứ bằng thẻ <div> vô nghĩa.
Lý do:
Giúp cấu trúc cây DOM sáng sủa, dễ đọc và dễ bảo trì.
Tăng tính khả dụng (Accessibility - a11y) để các trình đọc màn hình (Screen Readers) cho người khuyết tật có thể nhận diện đúng vai trò của từng thành phần.
Tối ưu hóa SEO và tuân thủ các chuẩn kỹ thuật phát triển web hiện đại.
2. Quy tắc: Strict Typeguard Verification (Kiểm tra kiểu dữ liệu nghiêm ngặt)
Quy tắc: Mọi tham số truyền vào hàm createElement (như kiểu của VNode, props, hoặc children) đều phải được kiểm tra và xử lý kiểu dữ liệu rõ ràng trước khi biên dịch sang DOM.
Lý do:
Ngăn chặn các lỗi thời gian chạy (runtime errors) đột ngột khi engine cố gắng render các giá trị không hợp lệ (như undefined, null, hoặc object lạ).
Giúp quá trình gỡ lỗi (debugging) trở nên nhanh chóng hơn vì các lỗi sai kiểu dữ liệu sẽ bị chặn lại ngay từ khâu khởi tạo VNode.
3. Quy tắc: XSS-Safe Rendering (Chống tấn công XSS tuyệt đối)
Quy tắc: Nghiêm cấm sử dụng innerHTML để gán nội dung text hoặc các thuộc tính từ người dùng; bắt buộc phải sử dụng textContent hoặc document.createTextNode().
Lý do:
Bảo mật ứng dụng trước các lỗ hổng Cross-Site Scripting (XSS), ví dụ như khi test với chuỗi độc hại <img onerror=alert(1)>.
Đảm bảo các đoạn mã độc không bị trình duyệt hiểu nhầm là mã thực thi JavaScript mà chỉ hiển thị dưới dạng chuỗi văn bản thuần túy an toàn.
4. Quy tắc: Single-Direction Recursive Mounting (Mounting đệ quy một chiều)
Quy tắc: Quá trình chuyển đổi từ cây VNode sang cây Real DOM (renderToDOM) phải được thực hiện bằng đệ quy chuẩn hóa đi từ gốc đến các node lá mà không làm rò rỉ hoặc tạo ra các node mồ côi (orphan nodes).
Lý do:
Đảm bảo thứ tự hiển thị trên giao diện khớp 100% với cấu trúc cây VNode được định nghĩa trong code.
Tránh tình trạng mất kết nối node hoặc lãng phí bộ nhớ do các node thừa không được gắn kết đúng vào gốc (root).

