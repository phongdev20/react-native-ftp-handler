# Ứng dụng mẫu FTP Handler

Đây là ứng dụng mẫu để demo các tính năng của thư viện React Native FTP Handler.

## Cài đặt

Có 2 cách để cài đặt ứng dụng mẫu:

### Sử dụng script tự động (khuyến nghị)

Từ thư mục gốc của dự án:

```bash
# Cấp quyền chạy cho script
chmod +x setup.sh

# Chạy script
./setup.sh
```

Script này sẽ tự động:

- Cài đặt dependencies
- Cài đặt CocoaPods cho iOS (nếu đang sử dụng macOS)
- Cho phép bạn chọn chạy ứng dụng trên iOS hoặc Android

### Cài đặt thủ công

```bash
# Cài đặt dependencies từ thư mục gốc
yarn install # hoặc npm install

# Di chuyển vào thư mục example
cd example

# Cài đặt dependencies cho ứng dụng mẫu
yarn install # hoặc npm install

# Cài đặt CocoaPods cho iOS (chỉ trên macOS)
cd ios && pod install && cd ..
```

## Chạy ứng dụng

### iOS

```bash
yarn ios
# hoặc
npm run ios
```

### Android

```bash
yarn android
# hoặc
npm run android
```

## Các tính năng demo

Ứng dụng mẫu này demo các tính năng sau:

1. **Kết nối FTP**

   - Kết nối đến máy chủ FTP
   - Đăng nhập với thông tin xác thực
   - Ngắt kết nối

2. **Quản lý File**
   - Liệt kê files và thư mục
   - Điều hướng qua các thư mục
   - Tạo thư mục mới
   - Xóa file và thư mục
   - Tải file xuống với theo dõi tiến trình
   - Tải file lên với theo dõi tiến trình

## Lưu ý quan trọng

### iOS

- Ứng dụng mẫu lưu trữ file tải xuống trong thư mục `Documents` của ứng dụng.
- Không cần cấu hình quyền truy cập bổ sung.

### Android

- Ứng dụng mẫu lưu trữ file tải xuống trong thư mục `Downloads` của thiết bị.
- Cần quyền truy cập bộ nhớ (đã được cấu hình trong ứng dụng).
- Trên Android 10+ (API level 29+), ứng dụng sử dụng Scoped Storage.

## Xử lý lỗi

Nếu bạn gặp lỗi khi chạy ứng dụng mẫu:

1. **Lỗi kết nối FTP**

   - Kiểm tra thông tin máy chủ FTP, username và password
   - Kiểm tra kết nối internet của thiết bị

2. **Lỗi tải file**

   - Kiểm tra quyền truy cập bộ nhớ (Android)
   - Kiểm tra dung lượng trống của thiết bị
   - Đảm bảo đường dẫn lưu trữ hợp lệ

3. **Lỗi biên dịch**
   - Làm sạch build: `cd android && ./gradlew clean` (Android) hoặc xóa thư mục `ios/build` (iOS)
   - Cài đặt lại dependencies: `yarn install`
   - Cài đặt lại pods: `cd ios && pod install`
