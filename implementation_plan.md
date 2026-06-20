# Kế hoạch Triển khai: Server Metrics & Chat History (Java Backend)

Bản kế hoạch này giải quyết 2 yêu cầu lớn của bạn: 
1. Lấy thông số hệ thống (CPU, RAM, Disk) và trạng thái Online/Offline của máy chủ Linux.
2. Xử lý lỗi chưa lưu tin nhắn chat (giữa User và AI) vào Database PostgreSQL.

---

## Phần 1: Server Metrics & Remote Status (Linux OS)

Như đã đề cập trước đó, cách tốt nhất để Java có thể thao tác và lấy thông tin từ máy chủ Linux từ xa là sử dụng giao thức **SSH**.

### Cách hoạt động (Architecture)
1. **Thư viện Java**: Chúng ta sẽ tích hợp thư viện `JSch` (Java Secure Channel) vào dự án. Thư viện này giúp Java mô phỏng lại đúng hành vi của công cụ kết nối SSH.
2. **Database Update**: Bảng `servers` cần có thêm 2 cột mới để Java có thể đăng nhập vào Linux: `ssh_username` và `ssh_password`.
3. **Lấy Metrics (CPU, RAM, Disk)**: 
   - Java Backend gọi hàm mở kênh SSH tới máy chủ đích.
   - Chạy lệnh ngầm: `free -m` (lấy RAM), `df -h /` (lấy ổ cứng), và `top -bn1` (lấy CPU).
   - Java sẽ hứng kết quả chữ trả về, tách lấy con số và trả thành JSON `{"cpu": 15, "ram": 60, "disk": 45}` cho UI.
4. **Kiểm tra Online/Offline**: Nếu Java mở kết nối SSH thành công -> `ONLINE`. Nếu bị Timeout (tắt máy/mất mạng) -> `OFFLINE`.
5. **Gõ lệnh thay vì trên Linux (Terminal)**: UI gửi lệnh (VD: `ls -la`) gọi API Java. Java chạy lệnh đó qua SSH và hứng Output String trả về hiển thị lên màn hình đen của UI.

---

## Phần 2: Lưu trữ Chat History (ChatMessage & ChatSession)

Hiện tại, việc AI chat đang do Python đảm nhận (`run_api.py`), còn mã nguồn Java thì **chưa hề có API** nào để nhận và lưu tin nhắn xuống Database. Đó là lý do vì sao dữ liệu không được lưu!

### Kiến trúc giải quyết
Chúng ta cần xây dựng bộ API trên Java Backend để giao tiếp với Database:

1. **`ChatController` & `ChatService`**:
   - `POST /api/chat/sessions`: API để tạo một phiên chat mới (Sinh ra `session_id`).
   - `POST /api/chat/messages`: API để lưu 1 dòng tin nhắn. Giao diện (hoặc Python) mỗi khi gửi hoặc nhận tin nhắn đều sẽ gọi API này để lưu nội dung vào Database. (Có truyền lên `sender_role` là `user` hoặc `agent`).
   - `GET /api/chat/sessions/{sessionId}/messages`: API để Giao diện Web lấy lại toàn bộ lịch sử tin nhắn cũ hiển thị lên màn hình khi người dùng mở lại phiên chat.

2. **Cập nhật Logic tích hợp**:
   * Khi người dùng mở giao diện, gọi Java API lấy danh sách `ChatSession`.
   * Khi người dùng gõ tin nhắn: Giao diện gửi tin nhắn đó cho Java lưu lại. Đồng thời gửi cho Python AI để lấy câu trả lời. Nhận được câu trả lời, Giao diện lại gửi cho Java lưu lại nốt. (Hoặc cho Python gọi trực tiếp sang Java để lưu).

---

## Các bước thực hiện (Execution Steps)

1. Cập nhật `pom.xml` thêm thư viện `jsch`.
2. Sửa thực thể `Server.java` thêm `sshUsername` và `sshPassword`. (Chờ Hibernate tự chạy ddl-auto update).
3. Tạo Class `SshService.java` chuyên xử lý kết nối, chạy lệnh và lấy Metrics.
4. Tạo `ServerController.java` thêm các Endpoint lấy System Metrics.
5. Tạo `ChatService.java` và `ChatController.java` với các Endpoint CRUD cho Session và Message.
6. Viết DTO cho Chat và Metrics.

> [!IMPORTANT]
> **User Review Required**
> Vui lòng xác nhận xem bạn có đồng ý với kiến trúc SSH ở Phần 1 và luồng lưu tin nhắn ở Phần 2 không? Nếu OK, tôi sẽ tiến hành viết code cho toàn bộ các phần này ngay bây giờ!
