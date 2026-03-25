import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onCancel: () => void;
}

const QrScanner = ({ onScanSuccess, onCancel }: QrScannerProps) => {
  useEffect(() => {
    // 初始化扫描器，去掉了之前限制过严的配置参数
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear().then(() => {
          onScanSuccess(decodedText);
        }).catch(console.error);
      },
      (error) => {
        // 忽略持续扫描时的常规未找到二维码的报错
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-center mb-4 text-gray-800 dark:text-gray-200">
          Scan Friend's QR Code
        </h3>
        
        {/* 🚨 关键修复：去掉了 bg-black，改为 bg-white，确保库自带的授权按钮清晰可见 */}
        <div 
          id="qr-reader" 
          className="w-full rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600 bg-white"
        ></div>
        
        <button 
          onClick={onCancel} 
          className="mt-6 w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl hover:bg-red-600 hover:text-white transition-all font-bold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default QrScanner;