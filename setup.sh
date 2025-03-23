#!/bin/bash

# Hiển thị tiêu đề
echo "=====================================================*"
echo "*  React Native FTP Handler - Setup và cài đặt  *"
echo "=====================================================*"

# Kiểm tra Node.js và Yarn/NPM
if ! command -v node &> /dev/null; then
    echo "❌ Node.js không được cài đặt. Vui lòng cài đặt Node.js trước."
    exit 1
fi

echo "✅ Node.js đã được cài đặt: $(node -v)"

# Kiểm tra React Native CLI
if ! command -v react-native &> /dev/null; then
    echo "⚠️ React Native CLI không được cài đặt globaly."
    echo "📝 Sẽ sử dụng npx react-native thay thế."
    RN_CMD="npx react-native"
else
    echo "✅ React Native CLI đã được cài đặt: $(react-native --version)"
    RN_CMD="react-native"
fi

# Xác định package manager (ưu tiên Yarn)
if command -v yarn &> /dev/null; then
    PKG_MGR="yarn"
    echo "✅ Sử dụng Yarn: $(yarn --version)"
else
    PKG_MGR="npm"
    echo "✅ Sử dụng NPM: $(npm --version)"
fi

# Cài đặt dependencies
echo ""
echo "📦 Cài đặt dependencies..."

# Cài đặt root dependencies
if [ "$PKG_MGR" = "yarn" ]; then
    yarn
else
    npm install
fi

# Vào thư mục example và cài đặt dependencies
cd example
echo "📦 Cài đặt dependencies cho ứng dụng mẫu..."
if [ "$PKG_MGR" = "yarn" ]; then
    yarn
else
    npm install
fi

# Cài đặt pod cho iOS nếu đang chạy trên macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Phát hiện macOS, cài đặt CocoaPods dependencies..."
    cd ios
    pod install
    cd ..
else
    echo "⚠️ Không phải macOS, bỏ qua bước cài đặt CocoaPods."
fi

# Hỏi người dùng muốn chạy ứng dụng không
echo ""
echo "🚀 Bạn có muốn chạy ứng dụng mẫu không? (y/n)"
read -r RUN_APP

if [[ "$RUN_APP" =~ ^[Yy]$ ]]; then
    # Hỏi người dùng muốn chạy trên nền tảng nào
    echo "📱 Chọn nền tảng để chạy ứng dụng:"
    echo "1) iOS"
    echo "2) Android"
    read -r PLATFORM_CHOICE

    if [ "$PLATFORM_CHOICE" = "1" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "🚀 Đang chạy ứng dụng trên iOS..."
            if [ "$PKG_MGR" = "yarn" ]; then
                yarn ios
            else
                npm run ios
            fi
        else
            echo "❌ Không thể chạy iOS trên hệ điều hành này. iOS chỉ hỗ trợ trên macOS."
        fi
    elif [ "$PLATFORM_CHOICE" = "2" ]; then
        echo "🚀 Đang chạy ứng dụng trên Android..."
        if [ "$PKG_MGR" = "yarn" ]; then
            yarn android
        else
            npm run android
        fi
    else
        echo "❌ Lựa chọn không hợp lệ."
    fi
else
    echo "👍 Quá trình cài đặt đã hoàn tất. Bạn có thể chạy ứng dụng sau bằng lệnh:"
    echo "   cd example && ${PKG_MGR} ${PKG_MGR == 'yarn' ? '' : 'run '}ios/android"
fi

echo ""
echo "✨ Hoàn tất! Hãy tìm hiểu thêm tại README.md ✨" 