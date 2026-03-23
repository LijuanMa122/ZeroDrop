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
  const [watermarkColor, setWatermarkColor] = useState<string>('#FF0000'); // Default Red
  const [watermarkLayout, setWatermarkLayout] = useState<'single' | 'multi'>('multi');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  // Helper to convert HEX to PDF-lib RGB format (0 to 1)
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
    setPdfMeta(null); // Reset meta while loading
    setIsProcessing(true);
    setProgress(10); // Initial loading state

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Load PDF to extract metadata (pages)
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      setProgress(100);
      
      setPdfMeta({
        name: file.name,
        size: file.size,
        pages: pdfDoc.getPageCount(),
      });
    } catch (error) {
      console.error("Error reading PDF:", error);
      alert("Failed to read PDF file. It might be corrupted or heavily encrypted.");
    } finally {
      setIsProcessing(false);
      setProgress(0);
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
          // Draw a single large watermark in the center
          page.drawText(watermarkText, {
            x: width / 2 - (watermarkText.length * 15), // Rough center estimation
            y: height / 2 - 20,
            size: 60,
            color: color,
            opacity: 0.3,
            rotate: degrees(-45),
          });
        } else {
          // Draw multiple watermarks tiled across the page
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
        
        // Update progress UI
        setProgress(Math.round(((i + 1) / totalPages) * 100));
        
        // Yield to main thread so UI can update
        if (i % 5 === 0) await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Serialize and download
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
    <div className="flex flex-col gap-8">
      
      {/* 1. Upload Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">1. Select PDF Document</h2>
        <input 
          type="file" 
          accept="application/pdf"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 dark:text-gray-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-400
            hover:file:bg-blue-100 cursor-pointer"
        />
        
        {/* PDF Metadata Display */}
        {pdfMeta && !isProcessing && (
          <div className="mt-4 flex gap-6 text-sm font-mono bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col"><span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Pages</span><span className="font-bold text-lg text-blue-600 dark:text-blue-400">{pdfMeta.pages}</span></div>
            <div className="flex flex-col"><span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Size</span><span className="font-bold text-lg text-blue-600 dark:text-blue-400">{(pdfMeta.size / 1024 / 1024).toFixed(2)} MB</span></div>
            <div className="flex flex-col flex-1 overflow-hidden"><span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Filename</span><span className="font-sans font-semibold text-gray-700 dark:text-gray-300 truncate mt-1">{pdfMeta.name}</span></div>
          </div>
        )}
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* 2. Configuration Section */}
      <div className={`transition-opacity ${pdfMeta ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">2. Watermark Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Side: Text Content */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Text Content</label>
              <input 
                type="text" 
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. CONFIDENTIAL"
              />
            </div>
          </div>

          {/* Right Side: Layout & Color */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Layout</label>
                <select 
                  value={watermarkLayout} 
                  onChange={(e) => setWatermarkLayout(e.target.value as 'single' | 'multi')}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="multi">Tiled (Multi-row)</option>
                  <option value="single">Center (Single)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Color</label>
                <input 
                  type="color" 
                  value={watermarkColor}
                  onChange={(e) => setWatermarkColor(e.target.value)}
                  className="h-12 w-full p-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* 3. Action Section */}
      <div>
        {isProcessing && progress > 0 ? (
          <div className="mb-4">
             <div className="flex justify-between mb-1">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">Processing Document...</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{progress}%</span>
             </div>
             <div className="w-full bg-blue-100 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-200" style={{ width: `${progress}%` }}></div>
             </div>
          </div>
        ) : null}

        <button 
          onClick={applyWatermark}
          disabled={!pdfMeta || isProcessing}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : 'Apply Watermark & Download'}
        </button>
      </div>

    </div>
  );
}