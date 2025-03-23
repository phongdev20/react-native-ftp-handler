# React Native FTP Handler

Thư viện React Native cho phép xử lý các thao tác FTP trên cả nền tảng Android và iOS. Thư viện này cung cấp API đồng nhất để kết nối đến máy chủ FTP, tải lên/tải xuống file và quản lý thư mục.

## Tính năng

- ✅ Kết nối đến máy chủ FTP
- ✅ Đăng nhập bằng thông tin xác thực
- ✅ Liệt kê các file và thư mục
- ✅ Tải file lên/xuống với theo dõi tiến trình
- ✅ Hủy tác vụ tải lên/xuống đang chạy
- ✅ Xóa thư mục và file
- ✅ Hỗ trợ đầy đủ cho cả iOS và Android
- ✅ API Promise-based dễ sử dụng
- ✅ Đa luồng, không chặn UI thread

## Cài đặt

```sh
# Sử dụng npm
npm install react-native-ftp-handler

# Hoặc sử dụng yarn
yarn add react-native-ftp-handler
```

### Cài đặt cho iOS

```sh
cd ios && pod install
```

### Cài đặt cho Android

Không cần bước bổ sung nào cho Android.

> **Lưu ý**: Thư viện yêu cầu React Native >=0.60.0 để hỗ trợ autolinking.

## Yêu cầu hệ thống

- iOS 11 trở lên
- Android API 21 (Android 5.0 Lollipop) trở lên
- React Native 0.60.0 trở lên

## Ứng dụng ví dụ

Để chạy ứng dụng ví dụ, clone repository này:

```sh
git clone https://github.com/phongdev20/react-native-ftp-handler.git
cd react-native-ftp-handler
```

Cài đặt dependencies:

```sh
yarn bootstrap
# hoặc
npm run bootstrap
```

Chạy ứng dụng:

```sh
# iOS
cd example && yarn ios
# hoặc
cd example && npm run ios

# Android
cd example && yarn android
# hoặc
cd example && npm run android
```

## Cách sử dụng

```typescript
import FtpHandler, {
  ProgressInfo,
  makeProgressToken,
} from 'react-native-ftp-handler';

// Kết nối đến máy chủ FTP
const connect = async () => {
  try {
    // Phương thức setup kết hợp cả connect và login
    await FtpHandler.setup('ftp.example.com', 21, 'username', 'password');
    console.log('Đã kết nối và đăng nhập thành công');

    // Liệt kê files trong thư mục root
    const files = await FtpHandler.listFiles('/');
    console.log('Danh sách files:', files);
  } catch (error) {
    console.error('Lỗi kết nối:', error);
  }
};

// Tải file lên
const uploadFile = async () => {
  try {
    const localPath = '/path/to/local/file.txt';
    const remotePath = '/remote/path/file.txt';

    // Tạo token để theo dõi tiến trình
    const token = FtpHandler.makeProgressToken(localPath, remotePath);

    // Theo dõi tiến trình
    const removeListener = FtpHandler.addProgressListener(
      (info: ProgressInfo) => {
        if (info.token === token) {
          console.log(`Tiến trình tải lên: ${info.percentage}%`);
        }
      }
    );

    // Tải file lên
    const success = await FtpHandler.uploadFile(localPath, remotePath);

    // Xóa listener khi không cần nữa
    removeListener();

    console.log(success ? 'Tải lên thành công' : 'Tải lên thất bại');
  } catch (error) {
    console.error('Lỗi tải lên:', error);
  }
};

// Tải file xuống
const downloadFile = async () => {
  try {
    const remotePath = '/remote/path/file.txt';
    const localPath = '/path/to/local/destination.txt';

    // Tạo token để theo dõi tiến trình (lưu ý tham số isDownload = true)
    const token = FtpHandler.makeProgressToken(localPath, remotePath, true);

    // Theo dõi tiến trình
    const removeListener = FtpHandler.addProgressListener(
      (info: ProgressInfo) => {
        if (info.token === token) {
          console.log(`Tiến trình tải xuống: ${info.percentage}%`);
        }
      }
    );

    // Lưu ý thứ tự tham số: (localPath, remotePath)
    const success = await FtpHandler.downloadFile(localPath, remotePath);

    // Xóa listener khi không cần nữa
    removeListener();

    console.log(success ? 'Tải xuống thành công' : 'Tải xuống thất bại');
  } catch (error) {
    console.error('Lỗi tải xuống:', error);
  }
};

// Hủy tải lên đang diễn ra
const cancelUpload = (token) => {
  FtpHandler.cancelUploadFile(token);
};

// Hủy tải xuống đang diễn ra
const cancelDownload = (token) => {
  FtpHandler.cancelDownloadFile(token);
};

// Xóa file
const deleteFileExample = async () => {
  try {
    const success = await FtpHandler.deleteFile('/path/to/file.txt');
    console.log(success ? 'Xóa file thành công' : 'Xóa file thất bại');
  } catch (error) {
    console.error('Lỗi xóa file:', error);
  }
};

// Xóa thư mục
const deleteDirectoryExample = async () => {
  try {
    const success = await FtpHandler.deleteDirectory('/path/to/directory');
    console.log(success ? 'Xóa thư mục thành công' : 'Xóa thư mục thất bại');
  } catch (error) {
    console.error('Lỗi xóa thư mục:', error);
  }
};
```

## API Reference

### Core Methods

| Phương thức           | Mô tả                             | Tham số                                                             | Giá trị trả về                     |
| --------------------- | --------------------------------- | ------------------------------------------------------------------- | ---------------------------------- |
| `setup`               | Thiết lập kết nối FTP             | host: string, port: number = 21, username: string, password: string | Promise<boolean>                   |
| `connect`             | Kết nối đến máy chủ FTP           | host: string, port: number = 21                                     | Promise<string>                    |
| `login`               | Đăng nhập vào máy chủ FTP         | username: string, password: string                                  | Promise<string>                    |
| `listFiles`           | Liệt kê tệp trong thư mục         | directory: string                                                   | Promise<FileInfo[]>                |
| `uploadFile`          | Tải file lên                      | localPath: string, remotePath: string                               | Promise<boolean>                   |
| `cancelUploadFile`    | Hủy tải lên đang diễn ra          | token: TaskToken                                                    | Promise<boolean>                   |
| `downloadFile`        | Tải file xuống                    | localPath: string, remotePath: string                               | Promise<boolean>                   |
| `cancelDownloadFile`  | Hủy tải xuống đang diễn ra        | token: TaskToken                                                    | Promise<boolean>                   |
| `remove`              | Xóa file hoặc thư mục             | path: string                                                        | Promise<boolean>                   |
| `deleteFile`          | Xóa file (alias cho remove)       | path: string                                                        | Promise<boolean>                   |
| `deleteDirectory`     | Xóa thư mục (alias cho remove)    | path: string                                                        | Promise<boolean>                   |
| `addProgressListener` | Thêm callback theo dõi tiến trình | listener: (info: ProgressInfo) => void                              | () => void (hàm để gỡ bỏ listener) |
| `makeProgressToken`   | Tạo token theo dõi tiến trình     | localPath: string, remotePath: string, isDownload: boolean = false  | TaskToken                          |

### Types và Interfaces

```typescript
// Token theo dõi tiến trình
export type TaskToken = string;

// Thông tin về file/thư mục
interface FileInfo {
  name: string; // Tên file hoặc thư mục
  type: 'file' | 'directory'; // Loại (file hoặc thư mục)
  size: number; // Kích thước (byte)
  timestamp: string; // Thời gian tạo/sửa đổi
}

// Thông tin về tiến trình tải lên/xuống
interface ProgressInfo {
  token: string; // Token nhận dạng tác vụ
  percentage: number; // Tiến trình (0-100)
}
```

## Lưu ý

1. **Token tiến trình**: Sử dụng `makeProgressToken` để tạo token theo dõi tiến trình tải lên/xuống. Token này sẽ được trả về trong callback `ProgressInfo`.

2. **Thứ tự tham số đã thay đổi**: Trong `downloadFile`, thứ tự tham số là `localPath, remotePath` (khác với phiên bản trước).

3. **Hủy tác vụ**: Để hủy tác vụ tải lên/xuống, sử dụng `cancelUploadFile` hoặc `cancelDownloadFile` với token đã tạo từ `makeProgressToken`.

4. **Theo dõi tiến trình**: Sử dụng `addProgressListener` để nhận thông tin về tiến trình tải lên/xuống. So sánh `token` trong callback với token đã tạo để xác định đúng tác vụ cần theo dõi.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
