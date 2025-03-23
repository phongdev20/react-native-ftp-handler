import { NativeModules, Platform, NativeEventEmitter } from 'react-native';

const LINKING_ERROR =
  `The package 'react-native-ftp-handler' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const FtpHandler = NativeModules.FtpHandler
  ? NativeModules.FtpHandler
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

// Create event emitter for progress events
const eventEmitter = new NativeEventEmitter(NativeModules.FtpHandler);

export interface FileInfo {
  name: string;
  type: 'file' | 'directory';
  size: number;
  timestamp: string;
}

export interface ProgressInfo {
  type: 'upload' | 'download';
  path: string;
  progress: number;
}

// Progress listener type
export type ProgressListener = (info: ProgressInfo) => void;

// Map to store progress listeners
const progressListeners: Set<ProgressListener> = new Set();

// Setup the event listener
eventEmitter.addListener('FtpTransferProgress', (event: ProgressInfo) => {
  // Notify all registered listeners
  progressListeners.forEach((listener) => listener(event));
});

/**
 * Add a progress listener for upload/download operations
 * @param listener Function to call with progress updates
 * @returns Function to remove the listener
 */
export function addProgressListener(listener: ProgressListener): () => void {
  progressListeners.add(listener);

  // Return function to remove the listener
  return () => {
    progressListeners.delete(listener);
  };
}

/**
 * Connect to an FTP server
 * @param host The FTP server hostname or IP address
 * @param port The FTP server port (default: 21)
 * @returns A promise that resolves when connected
 */
export function connect(host: string, port: number = 21): Promise<string> {
  return FtpHandler.connect(host, port);
}

/**
 * Login to the FTP server
 * @param username The username
 * @param password The password
 * @returns A promise that resolves when logged in
 */
export function login(username: string, password: string): Promise<string> {
  return FtpHandler.login(username, password);
}

/**
 * List files in a directory
 * @param directory The directory path
 * @returns A promise that resolves with an array of FileInfo objects
 */
export function listFiles(directory: string): Promise<FileInfo[]> {
  return FtpHandler.listFiles(directory);
}

/**
 * Upload a file to the FTP server
 * @param localPath The local file path
 * @param remotePath The remote file path
 * @returns A promise that resolves when the file is uploaded
 */
export function uploadFile(
  localPath: string,
  remotePath: string
): Promise<string> {
  return FtpHandler.uploadFile(localPath, remotePath);
}

/**
 * Download a file from the FTP server
 * @param remotePath The remote file path
 * @param localPath The local file path
 * @returns A promise that resolves when the file is downloaded
 */
export function downloadFile(
  remotePath: string,
  localPath: string
): Promise<string> {
  return FtpHandler.downloadFile(remotePath, localPath);
}

/**
 * Stop the current running task (upload/download)
 * @returns A promise that resolves when the stop request is acknowledged
 */
export function stopCurrentTask(): Promise<string> {
  return FtpHandler.stopCurrentTask();
}

/**
 * Disconnect from the FTP server
 * @returns A promise that resolves when disconnected
 */
export function disconnect(): Promise<string> {
  return FtpHandler.disconnect();
}

/**
 * Create a new directory on the FTP server
 * @param path The directory path
 * @returns A promise that resolves when the directory is created
 */
export function makeDirectory(path: string): Promise<string> {
  return FtpHandler.makeDirectory(path);
}

/**
 * Delete a file from the FTP server
 * @param path The file path
 * @returns A promise that resolves when the file is deleted
 */
export function deleteFile(path: string): Promise<string> {
  return FtpHandler.deleteFile(path);
}

/**
 * Delete a directory from the FTP server
 * @param path The directory path
 * @returns A promise that resolves when the directory is deleted
 */
export function deleteDirectory(path: string): Promise<string> {
  return FtpHandler.deleteDirectory(path);
}

/**
 * Rename a file or directory on the FTP server
 * @param oldPath The current path
 * @param newPath The new path
 * @returns A promise that resolves when the file/directory is renamed
 */
export function renameFile(oldPath: string, newPath: string): Promise<string> {
  return FtpHandler.renameFile(oldPath, newPath);
}

export default {
  connect,
  login,
  listFiles,
  uploadFile,
  downloadFile,
  stopCurrentTask,
  disconnect,
  makeDirectory,
  deleteFile,
  deleteDirectory,
  renameFile,
  addProgressListener,
};
