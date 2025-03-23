import * as React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Button,
  ScrollView,
  TextInput,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import FtpHandler, { type ProgressInfo } from 'react-native-ftp-handler';
import RNFS from 'react-native-fs';

export default function App() {
  const [status, setStatus] = React.useState('');
  const [files, setFiles] = React.useState<any[]>([]);
  const [host, setHost] = React.useState('eu-central-1.sftpcloud.io');
  const [port, setPort] = React.useState('21');
  const [username, setUsername] = React.useState(
    '1802df535b144cfdab9d727c18f772e0'
  );
  const [password, setPassword] = React.useState(
    'w2T8JQceROSYlEaD19debUJjO68PzWtn'
  );
  const [remotePath, setRemotePath] = React.useState('/');
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [newDirName, setNewDirName] = React.useState('');
  const [showNewDirInput, setShowNewDirInput] = React.useState(false);

  React.useEffect(() => {
    // Set up progress listener
    const removeListener = FtpHandler.addProgressListener(
      (info: ProgressInfo) => {
        setProgress(info.progress);
      }
    );

    // Clean up listener on unmount
    return () => {
      removeListener();
    };
  }, []);

  const connect = async () => {
    try {
      const result = await FtpHandler.connect(host, parseInt(port, 10));
      setStatus('Kết nối: ' + result);
    } catch (error: any) {
      setStatus('Lỗi kết nối: ' + error.message);
    }
  };

  const login = async () => {
    try {
      const result = await FtpHandler.login(username, password);
      setStatus('Đăng nhập: ' + result);
    } catch (error: any) {
      setStatus('Lỗi đăng nhập: ' + error.message);
    }
  };

  const listFiles = async () => {
    try {
      const result = await FtpHandler.listFiles(remotePath);
      setFiles(result);
      setStatus('Đã lấy danh sách file từ: ' + remotePath);
    } catch (error: any) {
      setStatus('Lỗi lấy danh sách: ' + error.message);
    }
  };

  const createDirectory = async () => {
    try {
      if (!newDirName) {
        setShowNewDirInput(true);
        return;
      }

      const newDirPath =
        remotePath === '/' ? '/' + newDirName : remotePath + '/' + newDirName;

      const result = await FtpHandler.makeDirectory(newDirPath);
      setStatus(result);
      setNewDirName('');
      setShowNewDirInput(false);
      await listFiles(); // Refresh file list
    } catch (error: any) {
      setStatus('Lỗi tạo thư mục: ' + error.message);
    }
  };

  const deleteSelectedItem = async (path: string, isDirectory: boolean) => {
    try {
      const result = isDirectory
        ? await FtpHandler.deleteDirectory(path)
        : await FtpHandler.deleteFile(path);
      setStatus(result);
      await listFiles(); // Refresh file list
    } catch (error: any) {
      setStatus(
        `Lỗi xóa ${isDirectory ? 'thư mục' : 'tệp tin'}: ` + error.message
      );
    }
  };

  // Hàm xin quyền truy cập bộ nhớ
  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true; // iOS không cần xin quyền riêng
    }

    try {
      // Chuyển đổi phiên bản Android thành số
      const androidVersion = parseInt(Platform.Version.toString(), 10);

      if (androidVersion >= 33) {
        // Android 13 (API 33) trở lên sử dụng quyền riêng
        return true; // Không cần xin quyền nữa vì scoped storage
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
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Quyền đọc bộ nhớ',
            message: 'Ứng dụng cần quyền để đọc file trong bộ nhớ',
            buttonNeutral: 'Hỏi lại sau',
            buttonNegative: 'Từ chối',
            buttonPositive: 'Đồng ý',
          }
        );

        const writeGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Quyền ghi bộ nhớ',
            message: 'Ứng dụng cần quyền để lưu file tải về',
            buttonNeutral: 'Hỏi lại sau',
            buttonNegative: 'Từ chối',
            buttonPositive: 'Đồng ý',
          }
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

  const downloadFile = async (remoteFilePath: string) => {
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

      const result = await FtpHandler.downloadFile(
        remoteFilePath,
        downloadPath
      );

      // Thông báo thành công và hiển thị đường dẫn
      Alert.alert(
        'Tải xuống hoàn tất',
        `File đã được lưu tại: ${downloadPath}`,
        [{ text: 'OK' }]
      );

      setStatus(`Tải xuống hoàn tất: ${result}`);
    } catch (error: any) {
      setStatus('Lỗi tải xuống: ' + error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const uploadFile = async () => {
    try {
      // For this example, let's use a test file that we'll create temporarily
      const fileName = 'test_upload.txt';
      const localPath = `${RNFS.CachesDirectoryPath}/${fileName}`;

      // Create a test file
      await RNFS.writeFile(
        localPath,
        'This is a test file for FTP upload',
        'utf8'
      );

      const uploadPath =
        remotePath === '/' ? '/' + fileName : remotePath + '/' + fileName;

      setProgress(0);
      setIsUploading(true);
      const result = await FtpHandler.uploadFile(localPath, uploadPath);
      setStatus(`Tải lên hoàn tất: ${result}`);
      await listFiles(); // Refresh file list
    } catch (error: any) {
      setStatus('Lỗi tải lên: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const stopTransfer = async () => {
    try {
      const result = await FtpHandler.stopCurrentTask();
      setStatus(result);
    } catch (error: any) {
      setStatus('Lỗi dừng tác vụ: ' + error.message);
    }
  };

  const disconnect = async () => {
    try {
      const result = await FtpHandler.disconnect();
      setStatus('Ngắt kết nối: ' + result);
      setFiles([]);
    } catch (error: any) {
      setStatus('Lỗi ngắt kết nối: ' + error.message);
    }
  };

  const navigateToDirectory = async (dirPath: string) => {
    setRemotePath(dirPath);
    try {
      const result = await FtpHandler.listFiles(dirPath);
      setFiles(result);
      setStatus('Đã mở thư mục: ' + dirPath);
    } catch (error: any) {
      setStatus('Lỗi mở thư mục: ' + error.message);
    }
  };

  const renderProgressBar = () => {
    if (isUploading || isDownloading) {
      return (
        <View style={styles.progressContainer}>
          <Text>
            {isUploading ? 'Đang tải lên' : 'Đang tải xuống'}: {progress}%
          </Text>
          <View style={styles.progressBackground}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Button title="Dừng" onPress={stopTransfer} />
        </View>
      );
    }
    return null;
  };

  const renderFileItem = (file: any, index: number) => {
    const isDirectory = file.type === 'directory';
    const filePath =
      remotePath === '/' ? '/' + file.name : remotePath + '/' + file.name;

    return (
      <View key={index} style={styles.fileItem}>
        <Text
          style={[styles.fileName, isDirectory && styles.directoryName]}
          onPress={() => isDirectory && navigateToDirectory(filePath)}
        >
          {isDirectory ? '📁 ' : '📄 '} {file.name}
        </Text>
        <Text style={styles.fileSize}>
          {isDirectory ? '' : `${Math.round(file.size / 1024)} KB`}
        </Text>
        <View style={styles.fileActions}>
          {!isDirectory && (
            <Button title="Tải về" onPress={() => downloadFile(filePath)} />
          )}
          <Button
            title="Xóa"
            color="red"
            onPress={() => deleteSelectedItem(filePath, isDirectory)}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FTP Client</Text>

      <ScrollView style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Host"
          value={host}
          onChangeText={setHost}
        />
        <TextInput
          style={styles.input}
          placeholder="Port"
          value={port}
          onChangeText={setPort}
          keyboardType="number-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <View style={styles.buttonContainer}>
          <Button title="Kết nối" onPress={connect} />
          <Button title="Đăng nhập" onPress={login} />
          <Button title="Ngắt kết nối" onPress={disconnect} />
        </View>

        <Text style={styles.status}>{status}</Text>

        {renderProgressBar()}

        <View style={styles.pathContainer}>
          <Text>Đường dẫn hiện tại: {remotePath}</Text>
          {remotePath !== '/' && (
            <Button
              title="Quay lại"
              onPress={() => {
                const parentPath = remotePath.substring(
                  0,
                  remotePath.lastIndexOf('/')
                );
                navigateToDirectory(parentPath || '/');
              }}
            />
          )}
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Liệt kê files" onPress={listFiles} />
          <Button
            title="Tạo thư mục"
            onPress={() => setShowNewDirInput(true)}
          />
          <Button title="Tải lên file" onPress={uploadFile} />
        </View>

        {showNewDirInput && (
          <View style={styles.newDirContainer}>
            <TextInput
              style={styles.input}
              placeholder="Tên thư mục mới"
              value={newDirName}
              onChangeText={setNewDirName}
            />
            <View style={styles.dirButtons}>
              <Button title="Tạo" onPress={createDirectory} />
              <Button
                title="Hủy"
                color="gray"
                onPress={() => {
                  setShowNewDirInput(false);
                  setNewDirName('');
                }}
              />
            </View>
          </View>
        )}

        <Text style={styles.listHeader}>Danh sách tệp tin:</Text>
        <View style={styles.fileList}>
          {files.length === 0 ? (
            <Text>Không có tệp tin nào</Text>
          ) : (
            files.map(renderFileItem)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
  form: {
    flex: 1,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 5,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
    flexWrap: 'wrap',
  },
  status: {
    marginVertical: 10,
    padding: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  progressContainer: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
  },
  progressBackground: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    marginVertical: 8,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 5,
  },
  pathContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    padding: 5,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  newDirContainer: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  dirButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  listHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  fileList: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 5,
    padding: 5,
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  fileName: {
    flex: 2,
  },
  directoryName: {
    fontWeight: 'bold',
    color: '#2050b0',
  },
  fileSize: {
    flex: 1,
    textAlign: 'right',
  },
  fileActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
