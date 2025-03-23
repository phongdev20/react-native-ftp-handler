package com.ftphandler

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.apache.commons.net.ftp.FTP
import org.apache.commons.net.ftp.FTPClient
import org.apache.commons.net.ftp.FTPFile
import java.io.*
import kotlin.concurrent.thread
import kotlin.math.roundToInt

class FtpHandlerModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val ftpClient = FTPClient()
    private var isConnected = false
    private var currentTask: Thread? = null
    private var isTaskCancelled = false
    
    override fun getName(): String {
        return "FtpHandler"
    }

    // Helper method to send progress events to React Native
    private fun sendProgressEvent(type: String, path: String, progress: Int) {
        val params = Arguments.createMap().apply {
            putString("type", type)
            putString("path", path)
            putInt("progress", progress)
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("FtpTransferProgress", params)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for React Native event emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for React Native event emitter
    }

    @ReactMethod
    fun connect(host: String, port: Int, promise: Promise) {
        isTaskCancelled = false
        currentTask = thread {
            try {
                ftpClient.connect(host, port)
                val reply = ftpClient.replyCode
                
                if (!org.apache.commons.net.ftp.FTPReply.isPositiveCompletion(reply)) {
                    ftpClient.disconnect()
                    promise.reject("CONNECTION_FAILED", "FTP server refused connection.")
                    return@thread
                }
                
                isConnected = true
                promise.resolve("Connected to $host:$port")
            } catch (e: Exception) {
                promise.reject("CONNECTION_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun login(username: String, password: String, promise: Promise) {
        if (!isConnected) {
            promise.reject("NOT_CONNECTED", "FTP client not connected. Call connect() first.")
            return
        }

        isTaskCancelled = false
        currentTask = thread {
            try {
                val success = ftpClient.login(username, password)
                if (success) {
                    // Set file type to binary for reliable transfers
                    ftpClient.setFileType(FTP.BINARY_FILE_TYPE)
                    // Enter passive mode for better compatibility with firewalls
                    ftpClient.enterLocalPassiveMode()
                    promise.resolve("Login successful")
                } else {
                    promise.reject("LOGIN_FAILED", "Invalid username or password")
                }
            } catch (e: Exception) {
                promise.reject("LOGIN_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun listFiles(directory: String, promise: Promise) {
        if (!isConnected) {
            promise.reject("NOT_CONNECTED", "FTP client not connected")
            return
        }

        isTaskCancelled = false
        currentTask = thread {
            try {
                val files = ftpClient.listFiles(directory)
                val result = Arguments.createArray()
                
                for (file in files) {
                    val fileMap = Arguments.createMap()
                    fileMap.putString("name", file.name)
                    fileMap.putString("type", if (file.isDirectory) "directory" else "file")
                    fileMap.putDouble("size", file.size.toDouble())
                    fileMap.putString("timestamp", file.timestamp.time.toString())
                    result.pushMap(fileMap)
                }
                
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("LIST_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun uploadFile(localPath: String, remotePath: String, promise: Promise) {
        if (!isConnected) {
            promise.reject("NOT_CONNECTED", "FTP client not connected")
            return
        }

        isTaskCancelled = false
        currentTask = thread {
            var inputStream: InputStream? = null
            try {
                val localFile = File(localPath)
                val fileSize = localFile.length()
                
                if (fileSize <= 0) {
                    promise.reject("UPLOAD_ERROR", "File is empty or doesn't exist")
                    return@thread
                }
                
                inputStream = ProgressInputStream(
                    FileInputStream(localFile),
                    fileSize,
                    { progress -> 
                        sendProgressEvent("upload", remotePath, progress)
                    }
                )
                
                val success = ftpClient.storeFile(remotePath, inputStream)
                
                if (isTaskCancelled) {
                    promise.reject("UPLOAD_CANCELLED", "Upload was cancelled")
                } else if (success) {
                    promise.resolve("File uploaded successfully")
                } else {
                    promise.reject("UPLOAD_FAILED", "Failed to upload file")
                }
            } catch (e: Exception) {
                if (isTaskCancelled) {
                    promise.reject("UPLOAD_CANCELLED", "Upload was cancelled")
                } else {
                    promise.reject("UPLOAD_ERROR", e.message, e)
                }
            } finally {
                try {
                    inputStream?.close()
                } catch (e: IOException) {
                    // Ignore
                }
            }
        }
    }

    @ReactMethod
    fun downloadFile(remotePath: String, localPath: String, promise: Promise) {
        if (!isConnected) {
            promise.reject("NOT_CONNECTED", "FTP client not connected")
            return
        }

        isTaskCancelled = false
        currentTask = thread {
            var outputStream: OutputStream? = null
            try {
                // Get file size first
                val fileSize = ftpClient.listFiles(remotePath)
                    .firstOrNull()?.size ?: -1
                
                if (fileSize <= 0) {
                    promise.reject("DOWNLOAD_ERROR", "Remote file doesn't exist or is empty")
                    return@thread
                }
                
                val localFile = File(localPath)
                outputStream = ProgressOutputStream(
                    FileOutputStream(localFile),
                    fileSize,
                    { progress -> 
                        sendProgressEvent("download", remotePath, progress)
                    }
                )
                
                val success = ftpClient.retrieveFile(remotePath, outputStream)
                
                if (isTaskCancelled) {
                    // Delete the partially downloaded file
                    localFile.delete()
                    promise.reject("DOWNLOAD_CANCELLED", "Download was cancelled")
                } else if (success) {
                    promise.resolve("File downloaded successfully")
                } else {
                    localFile.delete()
                    promise.reject("DOWNLOAD_FAILED", "Failed to download file")
                }
            } catch (e: Exception) {
                if (isTaskCancelled) {
                    promise.reject("DOWNLOAD_CANCELLED", "Download was cancelled")
                } else {
                    promise.reject("DOWNLOAD_ERROR", e.message, e)
                }
            } finally {
                try {
                    outputStream?.close()
                } catch (e: IOException) {
                    // Ignore
                }
            }
        }
    }

    @ReactMethod
    fun stopCurrentTask(promise: Promise) {
        if (currentTask != null && currentTask?.isAlive == true) {
            isTaskCancelled = true
            promise.resolve("Task stop requested")
        } else {
            promise.resolve("No task is currently running")
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        if (!isConnected) {
            promise.resolve("Not connected")
            return
        }

        isTaskCancelled = false
        currentTask = thread {
            try {
                ftpClient.logout()
                ftpClient.disconnect()
                isConnected = false
                promise.resolve("Disconnected successfully")
            } catch (e: Exception) {
                promise.reject("DISCONNECT_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun makeDirectory(path: String, promise: Promise) {
        if (!isConnected) {
            promise.reject("NOT_CONNECTED", "FTP client not connected")
            return
        }

        isTaskCancelled = false
        currentTask = thread {
            try {
                val success = ftpClient.makeDirectory(path)
                if (success) {
                    promise.resolve("Directory created successfully")
                } else {
                    promise.reject("MKDIR_FAILED", "Failed to create directory")
                }
            } catch (e: Exception) {
                promise.reject("MKDIR_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun deleteFile(path: String, promise: Promise) {
        if (!isConnected) {
            promise.reject("NOT_CONNECTED", "FTP client not connected")
            return
        }

        isTaskCancelled = false
        currentTask = thread {
            try {
                val success = ftpClient.deleteFile(path)
                if (success) {
                    promise.resolve("File deleted successfully")
                } else {
                    promise.reject("DELETE_FAILED", "Failed to delete file")
                }
            } catch (e: Exception) {
                promise.reject("DELETE_ERROR", e.message, e)
            }
        }
    }
    
    @ReactMethod
    fun deleteDirectory(path: String, promise: Promise) {
        if (!isConnected) {
            promise.reject("NOT_CONNECTED", "FTP client not connected")
            return
        }

        isTaskCancelled = false
        currentTask = thread {
            try {
                val success = ftpClient.removeDirectory(path)
                if (success) {
                    promise.resolve("Directory deleted successfully")
                } else {
                    promise.reject("DELETE_DIR_FAILED", "Failed to delete directory")
                }
            } catch (e: Exception) {
                promise.reject("DELETE_DIR_ERROR", e.message, e)
            }
        }
    }
    
    @ReactMethod
    fun renameFile(oldPath: String, newPath: String, promise: Promise) {
        if (!isConnected) {
            promise.reject("NOT_CONNECTED", "FTP client not connected")
            return
        }

        isTaskCancelled = false
        currentTask = thread {
            try {
                val success = ftpClient.rename(oldPath, newPath)
                if (success) {
                    promise.resolve("File/Directory renamed successfully")
                } else {
                    promise.reject("RENAME_FAILED", "Failed to rename file/directory")
                }
            } catch (e: Exception) {
                promise.reject("RENAME_ERROR", e.message, e)
            }
        }
    }
}

// InputStream wrapper for tracking upload progress
class ProgressInputStream(
    private val inputStream: InputStream,
    private val fileSize: Long,
    private val progressCallback: (Int) -> Unit
) : FilterInputStream(inputStream) {
    private var bytesRead: Long = 0
    private var lastProgress: Int = -1

    override fun read(): Int {
        val b = inputStream.read()
        if (b != -1) {
            updateProgress(1)
        }
        return b
    }

    override fun read(b: ByteArray): Int {
        return read(b, 0, b.size)
    }

    override fun read(b: ByteArray, off: Int, len: Int): Int {
        val bytesRead = inputStream.read(b, off, len)
        if (bytesRead != -1) {
            updateProgress(bytesRead.toLong())
        }
        return bytesRead
    }

    private fun updateProgress(readBytes: Long) {
        bytesRead += readBytes
        val progress = ((bytesRead.toDouble() / fileSize) * 100).roundToInt()
        if (progress != lastProgress) {
            lastProgress = progress
            progressCallback(progress)
        }
    }
}

// OutputStream wrapper for tracking download progress
class ProgressOutputStream(
    private val outputStream: OutputStream,
    private val fileSize: Long,
    private val progressCallback: (Int) -> Unit
) : FilterOutputStream(outputStream) {
    private var bytesWritten: Long = 0
    private var lastProgress: Int = -1

    override fun write(b: Int) {
        outputStream.write(b)
        updateProgress(1)
    }

    override fun write(b: ByteArray) {
        outputStream.write(b)
        updateProgress(b.size.toLong())
    }

    override fun write(b: ByteArray, off: Int, len: Int) {
        outputStream.write(b, off, len)
        updateProgress(len.toLong())
    }

    private fun updateProgress(writtenBytes: Long) {
        bytesWritten += writtenBytes
        val progress = ((bytesWritten.toDouble() / fileSize) * 100).roundToInt()
        if (progress != lastProgress) {
            lastProgress = progress
            progressCallback(progress)
        }
    }
}
