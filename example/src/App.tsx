import * as React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  PermissionsAndroid,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import FtpHandler, {
  type ProgressInfo,
  type FileInfo,
  type TaskToken,
} from 'react-native-ftp-handler';
import RNFS from 'react-native-fs';

function PlatformInfo() {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoTitle}>Thông tin hệ thống</Text>
      <Text style={styles.infoText}>Platform: {Platform.OS}</Text>
      <Text style={styles.infoText}>Version: {Platform.Version}</Text>
      <Text style={styles.infoText}>
        Default dir:{' '}
        {Platform.OS === 'ios'
          ? RNFS.DocumentDirectoryPath
          : RNFS.DownloadDirectoryPath}
      </Text>
    </View>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBackground}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>{Math.round(progress)}%</Text>
    </View>
  );
}

function FileListItem({
  item,
  currentPath,
  onNavigate,
  onDownload,
  onDelete,
}: {
  item: FileInfo;
  currentPath: string;
  onNavigate: (path: string) => void;
  onDownload: (path: string) => void;
  onDelete: (path: string, isDir: boolean) => void;
}) {
  const isDirectory = item.type === 'directory';
  const fullPath =
    currentPath === '/' ? '/' + item.name : currentPath + '/' + item.name;

  return (
    <View style={styles.fileItem}>
      <TouchableOpacity
        style={styles.fileButton}
        onPress={() =>
          isDirectory ? onNavigate(fullPath) : onDownload(fullPath)
        }
      >
        <Text
          style={[
            styles.fileIcon,
            isDirectory ? styles.folderIcon : styles.docIcon,
          ]}
        >
          {isDirectory ? '📁' : '📄'}
        </Text>
        <View style={styles.fileDetails}>
          <Text style={styles.fileName}>{item.name}</Text>
          <Text style={styles.fileInfo}>
            {isDirectory ? 'Thư mục' : `${(item.size / 1024).toFixed(1)} KB`}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => {
          Alert.alert(
            `Xóa ${isDirectory ? 'thư mục' : 'tệp tin'}`,
            `Bạn có chắc muốn xóa ${item.name}?`,
            [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'Xóa',
                onPress: () => onDelete(fullPath, isDirectory),
                style: 'destructive',
              },
            ]
          );
        }}
      >
        <Text style={styles.deleteButtonText}>Xóa</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const [status, setStatus] = React.useState('');
  const [files, setFiles] = React.useState<FileInfo[]>([]);
  const [host, setHost] = React.useState('eu-central-1.sftpcloud.io');
  const [port, setPort] = React.useState('21');
  const [username, setUsername] = React.useState(
    '938e49c1f9ee4eaead43105b3083ca24'
  );
  const [password, setPassword] = React.useState(
    'aRE3hA9UcJ3eS8fmV3KFc2ZbsDgG2kgN'
  );
  const [remotePath, setRemotePath] = React.useState('/');
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [newDirName, setNewDirName] = React.useState('');
  const [showNewDirModal, setShowNewDirModal] = React.useState(false);
  const [renameItem, setRenameItem] = React.useState<{
    path: string;
    name: string;
    isDir: boolean;
  } | null>(null);
  const [newFileName, setNewFileName] = React.useState('');
  const [pathHistory, setPathHistory] = React.useState<string[]>(['/']);

  // Thêm biến state cho chức năng tạm dừng
  const [isPaused, setIsPaused] = React.useState(false);
  const [currentUploadToken, setCurrentUploadToken] =
    React.useState<TaskToken | null>(null);
  const [currentDownloadToken, setCurrentDownloadToken] =
    React.useState<TaskToken | null>(null);
  const [pausedTransferData, setPausedTransferData] = React.useState<{
    type: 'upload' | 'download';
    localPath: string;
    remotePath: string;
  } | null>(null);

  // Theo dõi tiến trình tải lên/xuống
  React.useEffect(() => {
    const removeListener = FtpHandler.addProgressListener(
      (info: ProgressInfo) => {
        setProgress(info.percentage);
      }
    );

    // Xóa listener khi component unmount
    return () => {
      removeListener();
    };
  }, []);

  // Kiểm tra trạng thái kết nối
  const checkConnection = React.useCallback(async () => {
    try {
      // Thử liệt kê files để kiểm tra kết nối
      await FtpHandler.listFiles(remotePath);
      return true;
    } catch (error: any) {
      // Nếu có lỗi, giả định kết nối đã đóng
      if (isConnected) {
        setIsConnected(false);
        setStatus('Kết nối đã bị đóng: ' + error.message);

        // Hiển thị cảnh báo cho người dùng
        Alert.alert(
          'Kết nối bị ngắt',
          'Kết nối FTP đã bị đóng mà không có thông báo từ server. Vui lòng kết nối lại.',
          [{ text: 'OK' }]
        );
      }
      return false;
    }
  }, [remotePath, isConnected]);

  // Hàm xử lý lỗi kết nối
  const handleConnectionError = (error: any) => {
    const errorMsg = error.message || '';

    if (
      errorMsg.includes('connection') ||
      errorMsg.includes('timeout') ||
      errorMsg.includes('closed') ||
      errorMsg.includes('EOF')
    ) {
      if (isConnected) {
        setIsConnected(false);
        setStatus('Kết nối đã bị đóng: ' + errorMsg);

        // Hiển thị cảnh báo cho người dùng
        Alert.alert(
          'Kết nối bị ngắt',
          'Kết nối FTP đã bị đóng mà không có thông báo từ server. Vui lòng kết nối lại.',
          [{ text: 'OK' }]
        );
      }
      return true;
    }
    return false;
  };

  // Kết nối đến máy chủ FTP
  const connect = async () => {
    try {
      setIsConnecting(true);
      setStatus('Đang kết nối...');

      // Sử dụng phương thức setup mới
      await FtpHandler.setup(host, parseInt(port, 10), username, password);
      setStatus('Kết nối & đăng nhập thành công');
      setIsConnected(true);

      // Liệt kê files trong thư mục root
      await listFiles();
    } catch (error: any) {
      console.log(error.message);
      setStatus('Lỗi kết nối: ' + error.message);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // Ngắt kết nối
  const disconnect = async () => {
    try {
      // Không có phương thức disconnect() trong API mới, chỉ cần cập nhật UI
      setIsConnected(false);
      setFiles([]);
      setStatus('Đã ngắt kết nối');
    } catch (error: any) {
      setStatus('Lỗi ngắt kết nối: ' + error.message);
    }
  };

  // Liệt kê files trong thư mục
  const listFiles = async () => {
    try {
      setStatus('Đang tải danh sách...');
      const result = await FtpHandler.listFiles(remotePath);
      setFiles(result);
      setStatus('Đã lấy danh sách file từ: ' + remotePath);
    } catch (error: any) {
      console.log(error.message);
      setStatus('Lỗi lấy danh sách: ' + error.message);
      // Xử lý lỗi kết nối bằng hàm chung
      handleConnectionError(error);
    }
  };

  // Điều hướng đến thư mục
  const navigateToDirectory = async (path: string) => {
    // Kiểm tra kết nối trước khi thực hiện thao tác
    if (!(await checkConnection())) return;

    setRemotePath(path);
    setPathHistory((prev) => [...prev, path]);
  };

  // Quay lại thư mục trước đó
  const navigateBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory];
      newHistory.pop(); // Xóa path hiện tại
      const previousPath = newHistory[newHistory.length - 1];
      if (previousPath) {
        setRemotePath(previousPath);
        setPathHistory(newHistory);
      }
    }
  };

  // Tạo thư mục mới
  const createDirectory = async () => {
    try {
      if (!newDirName) {
        return;
      }

      // Không có phương thức makeDirectory(), thông báo lỗi
      setStatus('Tính năng tạo thư mục không được hỗ trợ trong phiên bản này');
      setNewDirName('');
      setShowNewDirModal(false);
    } catch (error: any) {
      setStatus('Lỗi tạo thư mục: ' + error.message);
    }
  };

  // Xóa file hoặc thư mục
  const deleteItem = async (path: string, isDirectory: boolean) => {
    // Kiểm tra kết nối trước khi thực hiện thao tác
    if (!(await checkConnection())) return;

    try {
      setStatus(`Đang xóa ${isDirectory ? 'thư mục' : 'tệp tin'}...`);

      let result;
      if (isDirectory) {
        // Xóa thư mục
        result = await FtpHandler.deleteDirectory(path);
      } else {
        // Xóa file
        result = await FtpHandler.deleteFile(path);
      }

      setStatus(result ? 'Xóa thành công' : 'Xóa thất bại');
      await listFiles(); // Cập nhật danh sách
    } catch (error: any) {
      setStatus(
        `Lỗi xóa ${isDirectory ? 'thư mục' : 'tệp tin'}: ` + error.message
      );
      // Xử lý lỗi kết nối bằng hàm chung
      handleConnectionError(error);
    }
  };

  // Đổi tên file hoặc thư mục
  const renameFileOrDir = async () => {
    try {
      if (!renameItem || !newFileName) {
        return;
      }

      setStatus('Đổi tên không được hỗ trợ trong phiên bản này');
      setRenameItem(null);
      setNewFileName('');
    } catch (error: any) {
      setStatus('Lỗi đổi tên: ' + error.message);
    }
  };

  // Xin quyền truy cập bộ nhớ
  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true; // iOS không cần xin quyền riêng
    }

    try {
      const androidVersion = parseInt(Platform.Version.toString(), 10);

      if (androidVersion >= 33) {
        // Android 13 (API 33) trở lên
        return true;
      } else if (androidVersion >= 29) {
        // Android 10 (API 29) trở lên
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: 'Quyền truy cập bộ nhớ',
              message: 'Ứng dụng cần quyền để lưu file tải về',
              buttonNeutral: 'Hỏi lại sau',
              buttonNegative: 'Từ chối',
              buttonPositive: 'Đồng ý',
            }
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
          console.warn(err);
          return false;
        }
      } else {
        // Android 9 và cũ hơn
        const readGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        const writeGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        return (
          readGranted === PermissionsAndroid.RESULTS.GRANTED &&
          writeGranted === PermissionsAndroid.RESULTS.GRANTED
        );
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  // Tạm dừng tác vụ hiện tại
  const pauseCurrentTask = async () => {
    try {
      // Kiểm tra xem có tác vụ nào đang chạy không
      if (isUploading && currentUploadToken) {
        // Lưu thông tin tác vụ upload để có thể khôi phục
        const localPathStr = currentUploadToken.split('=>')[0];
        const remotePathStr = currentUploadToken.split('=>')[1];

        if (localPathStr && remotePathStr) {
          setPausedTransferData({
            type: 'upload',
            localPath: localPathStr,
            remotePath: remotePathStr,
          });

          // Hủy tác vụ upload hiện tại
          await FtpHandler.cancelUploadFile(currentUploadToken);
          setCurrentUploadToken(null);
          setIsUploading(false);
          setIsPaused(true);
          setStatus('Đã tạm dừng tải lên');
        }
      } else if (isDownloading && currentDownloadToken) {
        // Lưu thông tin tác vụ download để có thể khôi phục
        const localPathStr = currentDownloadToken.split('<=')[0];
        const remotePathStr = currentDownloadToken.split('<=')[1];

        if (localPathStr && remotePathStr) {
          setPausedTransferData({
            type: 'download',
            localPath: localPathStr,
            remotePath: remotePathStr,
          });

          // Hủy tác vụ download hiện tại
          await FtpHandler.cancelDownloadFile(currentDownloadToken);
          setCurrentDownloadToken(null);
          setIsDownloading(false);
          setIsPaused(true);
          setStatus('Đã tạm dừng tải xuống');
        }
      } else {
        setStatus('Không có tác vụ nào đang chạy để tạm dừng');
      }
    } catch (error: any) {
      setStatus('Lỗi khi tạm dừng: ' + error.message);
    }
  };

  // Tiếp tục tác vụ đã tạm dừng
  const resumeTask = async () => {
    try {
      if (!isPaused || !pausedTransferData) {
        setStatus('Không có tác vụ nào đang tạm dừng');
        return;
      }

      // Extract paths to local variables to avoid shadowing
      const {
        localPath: localPathToUse,
        remotePath: remotePathToUse,
        type,
      } = pausedTransferData;

      // Khôi phục tác vụ dựa trên loại
      if (type === 'upload') {
        // Khởi động lại việc tải lên từ đầu
        const token = FtpHandler.makeProgressToken(
          localPathToUse,
          remotePathToUse
        );
        setCurrentUploadToken(token);
        setProgress(0);
        setIsUploading(true);
        setIsPaused(false);
        setStatus('Đang tiếp tục tải lên...');

        const result = await FtpHandler.uploadFile(
          localPathToUse,
          remotePathToUse
        );

        setStatus(`Tải lên hoàn tất: ${result}`);
        await listFiles(); // Cập nhật danh sách
        setIsUploading(false);
        setPausedTransferData(null);
      } else if (type === 'download') {
        // Khởi động lại việc tải xuống từ đầu
        const token = FtpHandler.makeProgressToken(
          localPathToUse,
          remotePathToUse,
          true
        );
        setCurrentDownloadToken(token);
        setProgress(0);
        setIsDownloading(true);
        setIsPaused(false);
        setStatus('Đang tiếp tục tải xuống...');

        const result = await FtpHandler.downloadFile(
          localPathToUse,
          remotePathToUse
        );

        // Thông báo thành công
        Alert.alert(
          'Tải xuống hoàn tất',
          `File đã được lưu tại: ${localPathToUse}`,
          [{ text: 'OK' }]
        );

        setStatus(result ? 'Tải xuống thành công' : 'Tải xuống thất bại');
        setIsDownloading(false);
        setPausedTransferData(null);
      }
    } catch (error: any) {
      setStatus('Lỗi khi tiếp tục: ' + error.message);
      // Xử lý lỗi kết nối
      handleConnectionError(error);
      setIsPaused(false);
      setIsUploading(false);
      setIsDownloading(false);
      setPausedTransferData(null);
    }
  };

  // Hủy tác vụ đã tạm dừng
  const cancelPausedTask = () => {
    setIsPaused(false);
    setPausedTransferData(null);
    setStatus('Đã hủy tác vụ tạm dừng');
  };

  // Tải file xuống
  const downloadFile = async (remoteFilePath: string) => {
    // Kiểm tra kết nối trước khi thực hiện thao tác
    if (!(await checkConnection())) return;

    try {
      // Xin quyền truy cập bộ nhớ
      const hasPermission = await requestStoragePermission();

      if (!hasPermission) {
        Alert.alert(
          'Quyền bị từ chối',
          'Bạn cần cấp quyền truy cập bộ nhớ để tải file',
          [{ text: 'OK' }]
        );
        setStatus('Không thể tải xuống: Quyền lưu trữ bị từ chối');
        return;
      }

      const fileName = remoteFilePath.split('/').pop();
      let downloadPath;

      if (Platform.OS === 'ios') {
        downloadPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      } else {
        downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
      }

      setProgress(0);
      setIsDownloading(true);
      setStatus('Đang tải xuống...');

      // Lưu token để có thể tạm dừng
      const token = FtpHandler.makeProgressToken(
        downloadPath,
        remoteFilePath,
        true
      );
      setCurrentDownloadToken(token);

      // LƯU Ý: Đối số đã thay đổi thứ tự trong API mới: downloadFile(localPath, remotePath)
      const result = await FtpHandler.downloadFile(
        downloadPath,
        remoteFilePath
      );

      // Thông báo thành công
      Alert.alert(
        'Tải xuống hoàn tất',
        `File đã được lưu tại: ${downloadPath}`,
        [{ text: 'OK' }]
      );

      setStatus(result ? 'Tải xuống thành công' : 'Tải xuống thất bại');
      setCurrentDownloadToken(null);
    } catch (error: any) {
      setStatus('Lỗi tải xuống: ' + error.message);
      // Xử lý lỗi kết nối bằng hàm chung
      handleConnectionError(error);
      setCurrentDownloadToken(null);
    } finally {
      setIsDownloading(false);
    }
  };

  // Tải file lên
  const uploadFile = async () => {
    // Kiểm tra kết nối trước khi thực hiện thao tác
    if (!(await checkConnection())) return;

    try {
      // Tạo file test để tải lên
      const fileName = 'test_upload.txt';
      const localPath = `${RNFS.CachesDirectoryPath}/${fileName}`;

      // Định nghĩa đường dẫn upload
      const uploadPath =
        remotePath === '/' ? `/${fileName}` : `${remotePath}/${fileName}`;

      // Lưu token để có thể tạm dừng
      const token = FtpHandler.makeProgressToken(localPath, uploadPath);
      setCurrentUploadToken(token);

      // Tạo nội dung file test
      await RNFS.writeFile(
        localPath,
        'Đây là file test để tải lên FTP server',
        'utf8'
      );

      setProgress(0);
      setIsUploading(true);
      setStatus('Đang tải lên...');

      const result = await FtpHandler.uploadFile(localPath, uploadPath);
      setStatus(`Tải lên hoàn tất: ${result}`);
      await listFiles(); // Cập nhật danh sách
      setCurrentUploadToken(null);
    } catch (error: any) {
      setStatus('Lỗi tải lên: ' + error.message);
      // Xử lý lỗi kết nối bằng hàm chung
      handleConnectionError(error);
      setCurrentUploadToken(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Hiển thị trạng thái kết nối
  const renderConnectionStatus = () => {
    if (isConnecting) {
      return (
        <View style={styles.statusIndicator}>
          <ActivityIndicator size="small" color="#0066cc" />
          <Text style={styles.statusText}>Đang kết nối...</Text>
        </View>
      );
    }

    if (isConnected) {
      return (
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, styles.connectedDot]} />
          <Text style={styles.statusText}>Đã kết nối</Text>
        </View>
      );
    }

    return (
      <View style={styles.statusIndicator}>
        <View style={[styles.statusDot, styles.disconnectedDot]} />
        <Text style={styles.statusText}>Chưa kết nối</Text>
      </View>
    );
  };

  // Thêm kiểm tra kết nối định kỳ
  React.useEffect(() => {
    let connectionCheck: NodeJS.Timeout;

    if (isConnected) {
      // Kiểm tra kết nối mỗi 30 giây
      connectionCheck = setInterval(async () => {
        await checkConnection();
      }, 30000);
    }

    return () => {
      if (connectionCheck) clearInterval(connectionCheck);
    };
  }, [isConnected, checkConnection, remotePath]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f0f0" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>FTP Handler</Text>
        {renderConnectionStatus()}
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Thông tin hệ thống */}
        <PlatformInfo />

        {/* Form kết nối FTP */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kết nối FTP</Text>

          <TextInput
            style={styles.input}
            placeholder="Host"
            value={host}
            onChangeText={setHost}
            editable={!isConnected}
          />

          <TextInput
            style={styles.input}
            placeholder="Port"
            value={port}
            onChangeText={setPort}
            keyboardType="numeric"
            editable={!isConnected}
          />

          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            editable={!isConnected}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            editable={!isConnected}
          />

          <View style={styles.buttonContainer}>
            {!isConnected ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={connect}
                disabled={isConnecting}
              >
                <Text style={styles.buttonText}>
                  {isConnecting ? 'Đang kết nối...' : 'Kết nối'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={disconnect}
              >
                <Text style={styles.buttonText}>Ngắt kết nối</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Hiển thị đường dẫn hiện tại */}
        {isConnected && (
          <View style={styles.pathContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={navigateBack}
              disabled={pathHistory.length <= 1}
            >
              <Text
                style={[
                  styles.backButtonText,
                  pathHistory.length <= 1 && styles.disabledText,
                ]}
              >
                ← Quay lại
              </Text>
            </TouchableOpacity>

            <Text style={styles.currentPath}>Đường dẫn: {remotePath}</Text>
          </View>
        )}

        {/* Danh sách files và thư mục */}
        {isConnected && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Danh sách file</Text>

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowNewDirModal(true)}
                >
                  <Text style={styles.actionButtonText}>Tạo thư mục</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={uploadFile}
                  disabled={isUploading}
                >
                  <Text style={styles.actionButtonText}>
                    {isUploading ? 'Đang tải lên...' : 'Tải lên'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={listFiles}
                >
                  <Text style={styles.actionButtonText}>Làm mới</Text>
                </TouchableOpacity>
              </View>
            </View>

            {files.length > 0 ? (
              <View style={styles.fileList}>
                {files.map((item, index) => (
                  <FileListItem
                    key={index}
                    item={item}
                    currentPath={remotePath}
                    onNavigate={navigateToDirectory}
                    onDownload={downloadFile}
                    onDelete={deleteItem}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.emptyMessage}>
                Không có file nào trong thư mục này
              </Text>
            )}
          </View>
        )}

        {/* Hiển thị tiến trình */}
        {(isUploading || isDownloading) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isUploading ? 'Tiến trình tải lên' : 'Tiến trình tải xuống'}
            </Text>
            <ProgressBar progress={progress} />

            <TouchableOpacity
              style={styles.pauseButton}
              onPress={pauseCurrentTask}
            >
              <Text style={styles.pauseButtonText}>Tạm dừng</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hiển thị tác vụ tạm dừng */}
        {isPaused && pausedTransferData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Tác vụ tạm dừng:{' '}
              {pausedTransferData.type === 'upload' ? 'Tải lên' : 'Tải xuống'}
            </Text>
            <Text style={styles.fileInfo}>
              {pausedTransferData.type === 'upload'
                ? `Tải lên: ${pausedTransferData.remotePath.split('/').pop()}`
                : `Tải xuống: ${pausedTransferData.remotePath.split('/').pop()}`}
            </Text>

            <View style={styles.pausedActions}>
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={resumeTask}
              >
                <Text style={styles.buttonText}>Tiếp tục</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelPausedTask}
              >
                <Text style={styles.buttonText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Hiển thị trạng thái */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trạng thái</Text>
          <Text style={styles.statusMessage}>{status}</Text>
        </View>
      </ScrollView>

      {/* Modal tạo thư mục mới */}
      <Modal
        visible={showNewDirModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNewDirModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tạo thư mục mới</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Nhập tên thư mục"
              value={newDirName}
              onChangeText={setNewDirName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setNewDirName('');
                  setShowNewDirModal(false);
                }}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={createDirectory}
                disabled={!newDirName}
              >
                <Text style={styles.modalButtonText}>Tạo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal đổi tên */}
      <Modal
        visible={renameItem !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRenameItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Đổi tên {renameItem?.isDir ? 'thư mục' : 'tệp tin'}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Nhập tên mới"
              value={newFileName}
              onChangeText={setNewFileName}
              defaultValue={renameItem?.name}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setRenameItem(null);
                  setNewFileName('');
                }}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={renameFileOrDir}
                disabled={!newFileName}
              >
                <Text style={styles.modalButtonText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectedDot: {
    backgroundColor: '#4CAF50',
  },
  disconnectedDot: {
    backgroundColor: '#F44336',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    margin: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#333',
  },
  input: {
    backgroundColor: '#f7f7f7',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  buttonContainer: {
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#FF5722',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  pathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 8,
    marginHorizontal: 8,
    borderRadius: 4,
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  backButtonText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  disabledText: {
    color: '#aaa',
  },
  currentPath: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  fileList: {
    marginTop: 8,
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
    paddingVertical: 8,
  },
  fileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  folderIcon: {
    color: '#2196F3',
  },
  docIcon: {
    color: '#FF5722',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: '#333',
  },
  fileInfo: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 12,
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBackground: {
    flex: 1,
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
    width: 40,
    textAlign: 'right',
  },
  statusMessage: {
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#f7f7f7',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    padding: 8,
    marginRight: 8,
  },
  modalConfirmButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 4,
    minWidth: 64,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    margin: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#0d47a1',
  },
  infoText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 2,
  },
  pauseButton: {
    backgroundColor: '#FF9800',
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  pauseButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  pausedActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  resumeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    padding: 8,
    flex: 1,
    alignItems: 'center',
    marginRight: 4,
  },
  cancelButton: {
    backgroundColor: '#F44336',
    borderRadius: 4,
    padding: 8,
    flex: 1,
    alignItems: 'center',
    marginLeft: 4,
  },
});
