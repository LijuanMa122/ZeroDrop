import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onCancel: () => void;
}

const QrScanner = ({ onScanSuccess, onCancel }: QrScannerProps) => {
  const [errorMsg, setErrorMsg] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // 使用底层的 Html5Qrcode 核心类，而非带有 UI 的 Scanner 类
    const html5QrCode = new Html5Qrcode("qr-reader");
    scannerRef.current = html5QrCode;

const startScanner = async () => {
      try {
        await html5QrCode.start(
          // 核心修改：只保留 facingMode，彻底删掉 width 和 height 的任何配置
          { facingMode: "environment" }, 
          {
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            disableFlip: false 
          },
          (decodedText) => {
            if (html5QrCode.isScanning) {
              html5QrCode.stop().then(() => {
                onScanSuccess(decodedText);
              }).catch(console.error);
            }
          },
          (_errorMessage) => {
            // 忽略逐帧解析失败的内部报错
          }
        );
      } catch (err: any) {
        setErrorMsg(err?.message || "Camera initialization failed.");
        console.error("Camera start error:", err);
      }
    };


    startScanner();

    // 组件卸载时清理物理硬件占用
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-center mb-4 text-gray-800 dark:text-gray-200">
          Scan Friend's QR Code
        </h3>
        
        {/* 视频流容器 */}
        <div 
          id="qr-reader" 
          className="w-full min-h-[250px] rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600 bg-black flex items-center justify-center"
        >
          {errorMsg && (
            <div className="text-red-500 text-sm text-center p-4">
              {errorMsg}
            </div>
          )}
        </div>
        
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