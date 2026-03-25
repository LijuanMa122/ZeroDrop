import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Peer } from 'peerjs';
import type { DataConnection } from 'peerjs';
import { FileUploader } from "react-drag-drop-files";
import { QRCodeSVG } from 'qrcode.react';
import PdfTool from './PdfTool';
import IdPhotoTool from './IdPhotoTool';

const QrScanner = lazy(() => import('./QrScanner'));

const CHUNK_SIZE = 64 * 1024; // 64KB for high-speed transfer

// --- Sub-component: Mission Impossible Secret Text ---
const SecretTextItem = ({ content }: { content: string }) => {
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [destroyed, setDestroyed] = useState(false);
  const [actualContent, setActualContent] = useState(content);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (revealed && timeLeft > 0 && !destroyed) {
      timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && !destroyed) {
      setDestroyed(true);
      setActualContent(''); // Memory wipe
    }
    return () => clearTimeout(timer);
  }, [revealed, timeLeft, destroyed]);

  if (destroyed) {
    return (
      <div className="bg-gray-900 text-red-500 rounded-lg p-3 my-1 self-start shadow-inner border border-red-900 animate-pulse font-mono text-sm">
        🛑 Message physically erased.
      </div>
    );
  }

  if (!revealed) {
    return (
      <button 
        onClick={() => setRevealed(true)}
        className="bg-black text-yellow-400 rounded-lg p-3 my-1 self-start shadow-lg border border-yellow-600 hover:bg-gray-900 transition-colors font-bold text-sm flex items-center gap-2"
      >
        <span>⚠️</span> 
        <span>Secret message received. Click to reveal (10s)</span>
      </button>
    );
  }

  return (
    <div className="bg-black text-green-400 rounded-lg p-3 my-1 self-start shadow-lg border border-gray-700 font-mono text-sm min-w-[200px] max-w-sm">
      {/* Changed layout: separated header for timer to prevent overlap */}
      <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-2">
        <span className="text-gray-500 text-xs">🔒 Top Secret</span>
        <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded font-bold animate-pulse">
          {timeLeft}s
        </span>
      </div>
      <p className="whitespace-pre-wrap break-all">{actualContent}</p>
    </div>
  );
};

// --- Sub-component: Hold-to-Reveal Secret Image ---
const SecretImageItem = ({ url, name }: { url: string; name: string }) => {
  const [revealed, setRevealed] = useState(false);
  const [destroyed, setDestroyed] = useState(false);
  const [releaseCount, setReleaseCount] = useState(0);
  
  const viewTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const destroyImage = () => {
    setDestroyed(true);
    setRevealed(false);
    if (timerRef.current) clearInterval(timerRef.current);
    URL.revokeObjectURL(url); // Remove blob from memory
  };

  const startReveal = (e: React.SyntheticEvent) => {
    e.preventDefault(); // Prevent default touch/click behaviors
    if (destroyed) return;
    setRevealed(true);
    timerRef.current = setInterval(() => {
      viewTimeRef.current += 100;
      if (viewTimeRef.current >= 5000) { // Max 5 seconds total view time
        destroyImage();
      }
    }, 100);
  };

  const stopReveal = () => {
    if (destroyed || !revealed) return;
    setRevealed(false);
    if (timerRef.current) clearInterval(timerRef.current);
    
    setReleaseCount(c => {
      const newCount = c + 1;
      if (newCount >= 3) { // Max 3 peeks
        destroyImage();
      }
      return newCount;
    });
  };

  if (destroyed) {
    return (
      <div className="bg-gray-900 w-48 h-48 flex flex-col items-center justify-center text-red-500 rounded-lg my-1 self-start border border-red-900 shadow-inner">
        <span className="text-2xl mb-2">🛑</span>
        <span className="font-mono text-xs text-center px-2">Media destroyed to protect privacy.</span>
      </div>
    );
  }

  return (
    <div 
      className="my-1 self-start relative inline-block rounded-lg overflow-hidden border-2 border-gray-800 bg-black max-w-xs shadow-lg select-none cursor-pointer"
      onMouseDown={startReveal}
      onMouseUp={stopReveal}
      onMouseLeave={stopReveal}
      onTouchStart={startReveal}
      onTouchEnd={stopReveal}
      onContextMenu={(e) => e.preventDefault()} // Disable right-click
      onDragStart={(e) => e.preventDefault()}   // CRITICAL: Disable browser image drag
    >
      <img 
        src={url} 
        alt={name}
        // Custom inline style for EXTREME blur and darkness when not revealed
        style={{ filter: revealed ? 'blur(0px) brightness(1)' : 'blur(40px) brightness(0.5) contrast(1.2)' }}
        className="w-full h-auto object-cover transition-all duration-300 pointer-events-none scale-110"
      />
      
      {/* Interactive Overlay */}
      {!revealed && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-black/70 px-4 py-2 rounded-full text-white font-bold text-sm backdrop-blur-md flex items-center gap-2 border border-gray-500 shadow-xl">
            <span className="animate-bounce">👆</span> Hold to reveal
          </div>
          <div className="absolute bottom-2 text-xs text-gray-400 font-mono drop-shadow-md">
            Peeks left: {3 - releaseCount}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---
function App() {
  const [myId, setMyId] = useState<string>('Connecting...');
  const [remoteId, setRemoteId] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSecretMessage, setIsSecretMessage] = useState<boolean>(false);
  const [log, setLog] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  
  const [incomingFileMeta, setIncomingFileMeta] = useState<any>(null);
  const [progress, setProgress] = useState<number>(0);
  const [transferMode, setTransferMode] = useState<'sending' | 'receiving' | null>(null);
  const [activeTab, setActiveTab] = useState<'p2p' | 'pdf' | 'idphoto'>('p2p');
  
  const [burnAfterReading, setBurnAfterReading] = useState<boolean>(false);
  const [isSecretImage, setIsSecretImage] = useState<boolean>(false);

  const [showQR, setShowQR] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [qrTheme, setQrTheme] = useState({bgColor: '#ffffff', fgColor: '#000000'});

  useEffect(() => {
    if (showQR) {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setQrTheme({
        bgColor: isDarkMode ? '#1f2937' : '#ffffff',
        fgColor: isDarkMode ? '#ffffff' : '#000000',
      });
    }
  }, [showQR]);

  const peerInstance = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const handleDataRef = useRef<any>(null);

  const receiveBufferRef = useRef<ArrayBuffer[]>([]);
  const receivedCountRef = useRef<number>(0);

  const handleScanSuccess = useCallback((decodedText: string) => {
    setRemoteId(decodedText);
    setIsScanning(false);
  }, []);

  const handleScanCancel = useCallback(() => {
    setIsScanning(false);
  }, []);

  useEffect(() => {
    handleDataRef.current = handleData;
  });

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setFilePreview(previewUrl);
      return () => {
        URL.revokeObjectURL(previewUrl);
        setFilePreview(null);
      };
    } else {
      setFilePreview(null);
    }
  }, [file]);

  useEffect(() => {
    const peer = new Peer({
  config: {
    'iceServers': [
      { urls: 'stun:stun.l.google.com:19302' }, 
      { urls: 'stun:stun1.l.google.com:19302' }, 
      { urls: 'stun:global.stun.twilio.com:3478' } 
    ]
  }
});

    peer.on('open', (id) => setMyId(id));

    peer.on('connection', (conn) => {
      connRef.current = conn;
      setLog(prev => [...prev, { type: 'system', content: `Connected to ${conn.peer}` }]);
      
      conn.on('data', (data) => {
        if (handleDataRef.current) handleDataRef.current(data, conn);
      });

      conn.on('close', () => {
        setLog(prev => [...prev, { type: 'system', content: 'Connection closed.' }]);
        connRef.current = null;
      });
    });

    peerInstance.current = peer;
    return () => {
      peer.destroy();
    };
  }, []);

  const handleData = (data: any, conn: DataConnection) => {
    if (data.type === 'file-meta') {
      setIncomingFileMeta(data.payload);
      receiveBufferRef.current = new Array(data.payload.chunkCount);
      receivedCountRef.current = 0;
      
      setProgress(0);
      setTransferMode('receiving');
      setLog(prev => [...prev, { type: 'system', content: `Receiving file: ${data.payload.name} (${Math.round(data.payload.size / 1024)} KB)` }]);
    } 
    else if (data.type === 'chunk') {
      receiveBufferRef.current[data.index] = data.payload;
      receivedCountRef.current += 1;
      
      const currentCount = receivedCountRef.current;
      const totalCount = incomingFileMeta.chunkCount;

      if (currentCount % 20 === 0 || currentCount === totalCount) {
         setProgress((currentCount / totalCount) * 100);
      }

      if (currentCount === totalCount) {
        const fileBlob = new Blob(receiveBufferRef.current, { type: incomingFileMeta.type });
        const downloadUrl = URL.createObjectURL(fileBlob);
        
        setLog(prev => [...prev, { 
          type: 'file', 
          url: downloadUrl, 
          name: incomingFileMeta.name, 
          burn: incomingFileMeta.burn,
          isSecretImage: incomingFileMeta.isSecretImage 
        }]);
        
        conn.send({ type: 'file-received-ack' });
        
        if (incomingFileMeta.burn && !incomingFileMeta.isSecretImage) {
          setTimeout(() => conn.close(), 500);
        }
        
        setIncomingFileMeta(null);
        receiveBufferRef.current = [];
        setProgress(0);
        setTransferMode(null);
      }
    }
    else if (data.type === 'file-received-ack') {
        setLog(prev => [...prev, { type: 'system', content: 'File sent successfully!' }]);
        setProgress(100);
        setTimeout(() => {
            setProgress(0);
            setFile(null); 
            setTransferMode(null);
            if (burnAfterReading && !isSecretImage) {
               conn.close();
            }
        }, 1500);
    } 
    else if (data.type === 'secret-text') {
      setLog(prev => [...prev, { type: 'secret-text', content: data.content }]);
    }
    else if (typeof data === 'string') {
      setLog(prev => [...prev, { type: 'remote', content: data }]);
    }
  };

  const handleConnection = (callback: () => void) => {
    if (connRef.current && connRef.current.open) {
      callback();
    } else {
      if (!remoteId) return alert("Please enter a friend's ID.");
      const conn = peerInstance.current!.connect(remoteId);
      if (!conn) {
        alert("Connection failed.");
        return;
      }
      connRef.current = conn;
      
      conn.on('open', () => {
        setLog(prev => [...prev, { type: 'system', content: `Connected to ${conn.peer}` }]);
        conn.on('data', (data) => {
          if (handleDataRef.current) handleDataRef.current(data, conn);
        });
        conn.on('close', () => {
          setLog(prev => [...prev, { type: 'system', content: 'Connection closed.' }]);
          connRef.current = null;
        });
        callback();
      });
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    handleConnection(() => {
      if (isSecretMessage) {
        connRef.current!.send({ type: 'secret-text', content: message });
        setLog(prev => [...prev, { type: 'local', content: `[Secret sent] ${message}` }]);
      } else {
        connRef.current!.send(message);
        setLog(prev => [...prev, { type: 'local', content: message }]);
      }
      setMessage('');
      setIsSecretMessage(false);
    });
  };

  const sendFile = async () => {
    if (!file || !connRef.current || !connRef.current.open) return;

    setTransferMode('sending');
    setLog(prev => [...prev, { type: 'system', content: `Sending file: ${file.name} ...` }]);

    try {
      const buffer = await file.arrayBuffer();
      const totalChunks = Math.ceil(buffer.byteLength / CHUNK_SIZE);
      
      connRef.current.send({
        type: 'file-meta',
        payload: {
          name: file.name,
          size: file.size,
          type: file.type,
          burn: burnAfterReading,
          isSecretImage: isSecretImage && file.type.startsWith('image/'),
          chunkCount: totalChunks,
        },
      });

      for (let i = 0; i < totalChunks; i++) {
        const offset = i * CHUNK_SIZE;
        const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
        
        connRef.current.send({ type: 'chunk', payload: chunk, index: i });

        if (i % 20 === 0 || i === totalChunks - 1) {
            setProgress(((i + 1) / totalChunks) * 100);
            await new Promise(resolve => setTimeout(resolve, 2)); 
        }
      }
      
      setLog(prev => [...prev, { type: 'system', content: 'All data sent. Waiting for peer confirmation...' }]);
      
    } catch (error) {
      console.error("Error reading file:", error);
      setLog(prev => [...prev, { type: 'system', content: 'Error reading file.' }]);
      setTransferMode(null);
    }
  };

  const renderLog = (item: any, i: number) => {
    switch(item.type) {
      case 'system': 
        return <div key={i} className="text-xs text-gray-500 italic my-1">{item.content}</div>;
      case 'remote': 
        return <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 my-1 self-start shadow-sm">{item.content}</div>;
      case 'local': 
        return <div key={i} className="bg-blue-600 text-white rounded-lg p-2 my-1 self-end shadow-sm">{item.content}</div>;
      case 'secret-text':
        return <SecretTextItem key={i} content={item.content} />;
      case 'file': 
        if (item.isSecretImage) {
          return <SecretImageItem key={i} url={item.url} name={item.name} />;
        }
        return (
          <div key={i} className="my-1 self-start bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm flex items-center gap-2">
            <span className="text-xl">📄</span>
            <a href={item.url} download={item.name} className="text-blue-500 hover:underline font-bold text-sm">
              Download: {item.name}
            </a>
          </div>
        );
      default: return null;
    }
  }

  return (
    <>
      <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 text-white">Loading Scanner...</div>}>
        {isScanning && (
          <QrScanner
            onScanSuccess={handleScanSuccess}
            onCancel={handleScanCancel}
          />
        )}
      </Suspense>

      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowQR(false)}>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-center mb-4 text-gray-800 dark:text-gray-200">Scan to Connect</h3>
            <QRCodeSVG
              value={myId}
              size={256}
              bgColor={qrTheme.bgColor}
              fgColor={qrTheme.fgColor}
              level={"L"}
              includeMargin={true}
            />
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center break-all max-w-xs">{myId}</p>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
            <h1 className="text-3xl font-extrabold text-center mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              🛰️ ZeroDrop
            </h1>
            
            <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
              <ul className="flex flex-wrap -mb-px text-sm font-medium text-center justify-center gap-4">
                  <li>
                      <button onClick={() => setActiveTab('p2p')} className={`inline-block p-2 rounded-t-lg border-b-2 transition-all ${activeTab === 'p2p' ? 'text-blue-600 border-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>P2P Transfer</button>
                  </li>
                  <li>
                      <button onClick={() => setActiveTab('pdf')} className={`inline-block p-2 rounded-t-lg border-b-2 transition-all ${activeTab === 'pdf' ? 'text-blue-600 border-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>PDF Tools</button>
                  </li>
                  <li>
                      <button onClick={() => setActiveTab('idphoto')} className={`inline-block p-2 rounded-t-lg border-b-2 transition-all ${activeTab === 'idphoto' ? 'text-blue-600 border-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>ID Photo</button>
                  </li>
              </ul>
            </div>
            
            {activeTab === 'p2p' && (
              <div className="flex flex-col gap-4">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-xl flex items-center justify-between shadow-inner">
                  <span className="text-sm font-medium text-gray-500">Your ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 select-all">{myId}</span>
                    <button onClick={() => setShowQR(true)} className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition" title="Show QR Code">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1H4zM3 9a1 1 0 011-1h2a1 1 0 110 2H4a1 1 0 01-1-1zM4 13a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1H4zM9 3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zM9 9a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1H9zM9 15a1 1 0 100 2h2a1 1 0 100-2H9zM15 3a1 1 0 100 2h2a1 1 0 100-2h-2zM13 9a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zM13 15a1 1 0 100 2h2a1 1 0 100-2h-2z" /></svg>
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Paste Friend's ID here or Scan QR..."
                    className="flex-1 p-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-sm font-mono"
                    value={remoteId}
                    onChange={e => setRemoteId(e.target.value)}
                  />
                  <button onClick={() => setIsScanning(true)} className="px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-800 transition font-bold shadow-md hover:shadow-lg flex items-center" title="Scan QR Code">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h2a1 1 0 110 2H4a1 1 0 01-1-1zM3 9a1 1 0 011-1h2a1 1 0 110 2H4a1 1 0 01-1-1zM8 5a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zM8 9a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zM13 5a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zM13 9a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zM3 13a1 1 0 011-1h2a1 1 0 110 2H4a1 1 0 01-1-1zM8 13a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zM13 13a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                  </button>
                  <button 
                    onClick={() => handleConnection(() => {})}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-md hover:shadow-lg"
                  >
                    Connect
                  </button>
                </div>
                
                {progress > 0 && progress < 100 && (
                  <div className="mt-2 mb-2 animate-pulse">
                      <div className="flex justify-between mb-1">
                          <span className="text-xs font-bold text-blue-600">{transferMode === 'sending' ? 'Uploading...' : 'Downloading...'}</span>
                          <span className="text-xs font-bold text-blue-600">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-blue-100 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
                          <div className="bg-blue-600 h-2 rounded-full transition-all duration-75" style={{ width: `${progress}%` }}></div>
                      </div>
                  </div>
                )}

                {/* Chat Log Window */}
                <div className="h-72 overflow-y-auto bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-sm flex flex-col shadow-inner">
                  {log.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2 opacity-50">
                      <span className="text-4xl">💬</span>
                      <p>No messages yet. Connect to a peer!</p>
                    </div>
                  ) : log.map(renderLog)}
                </div>

                {/* Message Input Area */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder={isSecretMessage ? "Type secret message..." : "Type a message..."}
                      className={`flex-1 p-3 border rounded-xl focus:outline-none focus:ring-2 transition-all text-sm ${isSecretMessage ? 'border-red-500 bg-red-50 dark:bg-red-900/20 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-blue-500'}`}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && sendMessage()}
                    />
                    <button 
                      onClick={sendMessage}
                      className={`px-6 py-3 text-white rounded-xl transition font-bold shadow-md ${isSecretMessage ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                      Send
                    </button>
                  </div>
                  <div className="flex items-center ml-1">
                    <input 
                      id="secret-msg-checkbox" 
                      type="checkbox" 
                      checked={isSecretMessage} 
                      onChange={() => setIsSecretMessage(!isSecretMessage)} 
                      className="w-4 h-4 text-red-600 bg-gray-100 rounded border-gray-300 focus:ring-red-500 accent-red-600 cursor-pointer" 
                    />
                    <label htmlFor="secret-msg-checkbox" className="ml-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer flex items-center gap-1">
                      <span className="text-red-500">🔥</span> Mission Impossible Mode (10s auto-destruct)
                    </label>
                  </div>
                </div>
                
                <hr className="border-gray-200 dark:border-gray-800" />

                {/* File Upload Area */}
                <div>
                  <FileUploader
                    handleChange={(f: File) => setFile(f)}
                    name="file"
                    types={["JPG", "PNG", "GIF", "PDF", "ZIP", "MP4", "MOV"]}
                  >
                    <div 
                      className={`w-full h-28 border-2 border-dashed rounded-xl flex flex-col justify-center items-center cursor-pointer transition-all ${file ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      {filePreview ? (
                          <img src={filePreview} alt="Preview" className="h-full object-contain p-2 drop-shadow-md" />
                      ) : (
                          <div className="text-center text-gray-500 dark:text-gray-400">
                            <span className="text-2xl block mb-1">📁</span>
                            <span className="font-semibold text-sm">Click or Drag & Drop</span>
                          </div>
                      )}
                    </div>
                  </FileUploader>
                  
                  {file && (
                    <div className="mt-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold truncate mr-4" title={file.name}>
                          {file.name} <span className="text-xs text-gray-400 font-normal">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </p>
                        <button 
                          onClick={sendFile}
                          className="px-5 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition shadow-md"
                          disabled={transferMode !== null}
                        >
                          {transferMode === 'sending' ? 'Sending...' : 'Send File'}
                        </button>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center">
                          <input id="burn-checkbox" type="checkbox" checked={burnAfterReading} onChange={() => setBurnAfterReading(!burnAfterReading)} className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" />
                          <label htmlFor="burn-checkbox" className="ml-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                            Disconnect connection immediately after download
                          </label>
                        </div>
                        
                        {/* Only show image-specific secret options if it's an image */}
                        {file.type.startsWith('image/') && (
                          <div className="flex items-center">
                            <input 
                              id="secret-img-checkbox" 
                              type="checkbox" 
                              checked={isSecretImage} 
                              onChange={() => setIsSecretImage(!isSecretImage)} 
                              className="w-4 h-4 text-purple-600 bg-gray-100 rounded border-gray-300 focus:ring-purple-500 accent-purple-600 cursor-pointer" 
                            />
                            <label htmlFor="secret-img-checkbox" className="ml-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer flex items-center gap-1">
                              <span className="text-purple-500">👁️</span> Hold-to-Reveal Anti-Peep Mode
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {activeTab === 'pdf' && <PdfTool />}
            {activeTab === 'idphoto' && <IdPhotoTool />}

          </div>
        </div>
      </div>
    </>
  );
}

export default App;