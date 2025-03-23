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

> **Lưu ý**: Thư viện yêu cầu React Native >=0.60.0 để hỗ trợ autolinking.

## Yêu cầu hệ thống

- iOS 11 trở lên
- Android API 21 (Android 5.0 Lollipop) trở lên
- React Native 0.60.0 trở lên

## Cách sử dụng

```typescript
import FtpHandler, {
  ProgressInfo,
  makeProgressToken,
} from 'react-native-ftp-handler';

// Kết nối đến máy chủ FTP
const connect = async () => {
  try {
    await FtpHandler.setup('ftp.example.com', 21, 'username', 'password');
    console.log('Đã kết nối và đăng nhập thành công');

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
    const token = FtpHandler.makeProgressToken(localPath, remotePath);

    const removeListener = FtpHandler.addProgressListener(
      (info: ProgressInfo) => {
        if (info.token === token) {
          console.log(`Tiến trình tải lên: ${info.percentage}%`);
        }
      }
    );

    const success = await FtpHandler.uploadFile(localPath, remotePath);
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
    const token = FtpHandler.makeProgressToken(localPath, remotePath, true);

    const removeListener = FtpHandler.addProgressListener(
      (info: ProgressInfo) => {
        if (info.token === token) {
          console.log(`Tiến trình tải xuống: ${info.percentage}%`);
        }
      }
    );

    const success = await FtpHandler.downloadFile(localPath, remotePath);
    removeListener();
    console.log(success ? 'Tải xuống thành công' : 'Tải xuống thất bại');
  } catch (error) {
    console.error('Lỗi tải xuống:', error);
  }
};

// Hủy tác vụ đang diễn ra
const cancelOperations = (token) => {
  FtpHandler.cancelUploadFile(token); // Hủy tải lên
  FtpHandler.cancelDownloadFile(token); // Hủy tải xuống
};

// Xóa file và thư mục
const deleteExample = async () => {
  try {
    const deleteFile = await FtpHandler.deleteFile('/path/to/file.txt');
    const deleteDir = await FtpHandler.deleteDirectory('/path/to/directory');
  } catch (error) {
    console.error('Lỗi xóa:', error);
  }
};
```

## API Reference

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
| `deleteFile`          | Xóa file                          | path: string                                                        | Promise<boolean>                   |
| `deleteDirectory`     | Xóa thư mục                       | path: string                                                        | Promise<boolean>                   |
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

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
