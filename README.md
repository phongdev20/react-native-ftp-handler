# react-native-ftp-handler

A React Native library for FTP operations. It provides a simple interface to connect to FTP servers, upload and download files, list directories, and more.

## Installation

```sh
npm install react-native-ftp-handler
# or
yarn add react-native-ftp-handler
```

## Android Setup

No additional setup required for Android.

## iOS Setup

Coming soon.

## Usage

```javascript
import FtpHandler from 'react-native-ftp-handler';

// Connect to FTP server
FtpHandler.connect('ftp.example.com', 21)
  .then((result) => {
    console.log('Connected:', result);

    // Login
    return FtpHandler.login('username', 'password');
  })
  .then((result) => {
    console.log('Logged in:', result);

    // List files in a directory
    return FtpHandler.listFiles('/');
  })
  .then((files) => {
    console.log('Files:', files);

    // Upload a file
    return FtpHandler.uploadFile('/path/to/local/file.txt', '/remote/file.txt');
  })
  .then((result) => {
    console.log('Upload result:', result);

    // Download a file
    return FtpHandler.downloadFile(
      '/remote/file.txt',
      '/path/to/local/file.txt'
    );
  })
  .then((result) => {
    console.log('Download result:', result);

    // Create a directory
    return FtpHandler.makeDirectory('/remote/new-directory');
  })
  .then((result) => {
    console.log('Directory created:', result);

    // Delete a file
    return FtpHandler.deleteFile('/remote/file-to-delete.txt');
  })
  .then((result) => {
    console.log('File deleted:', result);

    // Disconnect
    return FtpHandler.disconnect();
  })
  .then((result) => {
    console.log('Disconnected:', result);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
```

## API

### connect(host: string, port: number = 21): Promise<string>

Connect to an FTP server.

### login(username: string, password: string): Promise<string>

Login to the FTP server.

### listFiles(directory: string): Promise<FileInfo[]>

List files in a directory.

### uploadFile(localPath: string, remotePath: string): Promise<string>

Upload a file to the FTP server.

### downloadFile(remotePath: string, localPath: string): Promise<string>

Download a file from the FTP server.

### disconnect(): Promise<string>

Disconnect from the FTP server.

### makeDirectory(path: string): Promise<string>

Create a new directory on the FTP server.

### deleteFile(path: string): Promise<string>

Delete a file from the FTP server.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
