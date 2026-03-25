import { useState } from 'react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';

interface PdfMeta {
  name: string;
  size: number;
  pages: number;
}

export default function PdfTool() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfMeta, setPdfMeta] = useState<PdfMeta | null>(null);
  
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [watermarkColor, setWatermarkColor] = useState<string>('#EF4444'); // Tailwind Red-500
  const [watermarkLayout, setWatermarkLayout] = useState<'single' | 'multi'>('multi');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? rgb(
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ) : rgb(1, 0, 0);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfFile(file);
    setPdfMeta(null);
    setIsProcessing(true);
    setProgress(15); 

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      setProgress(100);
      
      setPdfMeta({
        name: file.name,
        size: file.size,
        pages: pdfDoc.getPageCount(),
      });
    } catch (error) {
      console.error("Error reading PDF:", error);
      alert("Failed to read PDF file.");
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const applyWatermark = async () => {
    if (!pdfFile || !pdfMeta) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      const color = hexToRgb(watermarkColor);
      
      const totalPages = pages.length;

      for (let i = 0; i < totalPages; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        
        if (watermarkLayout === 'single') {
          page.drawText(watermarkText, {
            x: width / 2 - (watermarkText.length * 15),
            y: height / 2 - 20,
            size: 60,
            color: color,
            opacity: 0.3,
            rotate: degrees(-45),
          });
        } else {
          const xSpacing = 300;
          const ySpacing = 250;
          for (let x = -100; x < width + 100; x += xSpacing) {
            for (let y = -100; y < height + 100; y += ySpacing) {
              page.drawText(watermarkText, {
                x: x,
                y: y,
                size: 40,
                color: color,
                opacity: 0.2,
                rotate: degrees(-30),
              });
            }
          }
        }
        
        setProgress(Math.round(((i + 1) / totalPages) * 100));
        if (i % 5 === 0) await new Promise(resolve => setTimeout(resolve, 5));
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `Watermarked_${pdfMeta.name}`;
      a.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Error applying watermark:", error);
      alert("Error applying watermark.");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      
      {/* 1. Upload Section */}
      <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-sm">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
           <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span> 
           Select PDF Document
        </h2>
        <input 
          type="file" 
          accept="application/pdf"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 dark:text-gray-400
            file:mr-4 file:py-2.5 file:px-5
            file:rounded-xl file:border-0
            file:text-sm file:font-bold file:transition-colors
            file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-400
            hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 cursor-pointer"
        />
        
        {/* PDF Metadata Display */}
        {pdfMeta && !isProcessing && (
          <div className="mt-4 flex gap-4 text-xs font-mono bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-inner">
            <div className="flex flex-col"><span className="text-gray-500 uppercase tracking-wider mb-1">Pages</span><span className="font-bold text-blue-500 text-lg">{pdfMeta.pages}</span></div>
            <div className="w-px bg-gray-200 dark:bg-gray-800"></div>
            <div className="flex flex-col"><span className="text-gray-500 uppercase tracking-wider mb-1">Size</span><span className="font-bold text-blue-500 text-lg">{(pdfMeta.size / 1024 / 1024).toFixed(2)} <span className="text-sm">MB</span></span></div>
            <div className="w-px bg-gray-200 dark:bg-gray-800"></div>
            <div className="flex flex-col flex-1 overflow-hidden"><span className="text-gray-500 uppercase tracking-wider mb-1">File</span><span className="font-bold text-gray-700 dark:text-gray-300 truncate mt-1">{pdfMeta.name}</span></div>
          </div>
        )}
      </div>

      {/* 2. Configuration Section */}
      <div className={`transition-all duration-500 ${pdfMeta ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none translate-y-2'}`}>
        <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-sm flex flex-col gap-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span> 
            Watermark Settings
          </h2>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Text Content</label>
            <input 
              type="text" 
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-mono shadow-inner transition-shadow"
              placeholder="e.g. CONFIDENTIAL"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Layout</label>
              <select 
                value={watermarkLayout} 
                onChange={(e) => setWatermarkLayout(e.target.value as 'single' | 'multi')}
                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-mono shadow-inner appearance-none cursor-pointer"
              >
                <option value="multi">Tiled (Multi-row)</option>
                <option value="single">Center (Single)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Color</label>
              <input 
                type="color" 
                value={watermarkColor}
                onChange={(e) => setWatermarkColor(e.target.value)}
                className="h-[46px] w-20 p-1 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 cursor-pointer shadow-inner"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Action Section */}
      <div className="mt-2">
        {isProcessing && progress > 0 ? (
          <div className="mb-5 animate-pulse">
             <div className="flex justify-between mb-1.5">
                <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Processing Document...</span>
                <span className="text-xs font-bold text-blue-500">{progress}%</span>
             </div>
             <div className="w-full bg-blue-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-200" style={{ width: `${progress}%` }}></div>
             </div>
          </div>
        ) : null}

        <button 
          onClick={applyWatermark}
          disabled={!pdfMeta || isProcessing}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <span className="animate-spin text-xl">⚙️</span>
          ) : (
            <span className="text-xl">🛡️</span>
          )}
          {isProcessing ? 'Encrypting & Generating...' : 'Apply & Download PDF'}
        </button>
      </div>
    </div>
  );
}