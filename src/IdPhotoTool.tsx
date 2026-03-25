import { useState, useRef } from 'react';
import "./assets/cropper.css";
import Cropper from "react-cropper";

export default function IdPhotoTool() {
  const [image, setImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const cropperRef = useRef<any>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    let files;
    if (e.target) {
      files = e.target.files;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setCroppedImage(null); // Reset cropped image on new upload
    };
    if (files && files.length > 0) {
      reader.readAsDataURL(files[0]);
    }
  };

  const getCropData = () => {
    if (typeof cropperRef.current?.cropper !== "undefined") {
      const croppedCanvas = cropperRef.current?.cropper.getCroppedCanvas({
        width: 354,
        height: 472,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });
      
      generatePrintSheet(croppedCanvas);
    }
  };

  const generatePrintSheet = (sourceCanvas: HTMLCanvasElement) => {
    const sheetCanvas = document.createElement('canvas');
    // 4x6 inch at 300 DPI is 1800x1200
    sheetCanvas.width = 1800;
    sheetCanvas.height = 1200;
    const ctx = sheetCanvas.getContext('2d');
    
    if (!ctx) return;

    // Fill white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

    // Layout configuration: 2 rows, 4 columns
    const imgWidth = 354;
    const imgHeight = 472;
    const marginX = (1800 - (4 * imgWidth)) / 5;
    const marginY = (1200 - (2 * imgHeight)) / 3;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const x = marginX + col * (imgWidth + marginX);
        const y = marginY + row * (imgHeight + marginY);
        ctx.drawImage(sourceCanvas, x, y, imgWidth, imgHeight);
        
        // Add a subtle cutting guide border
        ctx.strokeStyle = '#EEEEEE';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, imgWidth, imgHeight);
      }
    }

    setCroppedImage(sheetCanvas.toDataURL("image/jpeg", 0.95));
  };

  // Helper controls for the cropper
  const rotate = () => cropperRef.current?.cropper.rotate(90);
  const zoomIn = () => cropperRef.current?.cropper.zoom(0.1);
  const zoomOut = () => cropperRef.current?.cropper.zoom(-0.1);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      
      {/* Step 1: Upload */}
      <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-sm">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span> 
          Upload Portrait
        </h2>
        <input 
          type="file" 
          accept="image/png, image/jpeg, image/jpg"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 dark:text-gray-400
            file:mr-4 file:py-2.5 file:px-5
            file:rounded-xl file:border-0
            file:text-sm file:font-bold file:transition-colors
            file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-400
            hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 cursor-pointer"
        />
      </div>

      {/* Step 2: Crop */}
      <div className={`transition-all duration-500 ${image ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none translate-y-2'}`}>
        <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-sm flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span> 
              Crop & Align
            </h2>
            
            {/* Toolbar */}
            <div className="flex gap-2">
              <button onClick={zoomOut} className="p-2 text-xs bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition" title="Zoom Out">➖</button>
              <button onClick={zoomIn} className="p-2 text-xs bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition" title="Zoom In">➕</button>
              <button onClick={rotate} className="p-2 text-xs bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition" title="Rotate">🔃</button>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-black/10 dark:bg-black/40">
            {image ? (
              <Cropper
                ref={cropperRef}
                src={image}
                style={{ height: 400, width: "100%" }}
                aspectRatio={354 / 472}
                guides={true}
                viewMode={1}
                dragMode="move"
                background={false}
                responsive={true}
                checkOrientation={false}
              />
            ) : (
              <div className="h-[400px] flex items-center justify-center text-gray-400 font-mono text-sm">
                Waiting for image...
              </div>
            )}
          </div>

          <button 
            onClick={getCropData}
            disabled={!image}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate 4x6 Print Sheet
          </button>
        </div>
      </div>

      {/* Step 3: Result */}
      {croppedImage && (
        <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-sm animate-fade-in">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <span className="bg-green-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">3</span> 
            Ready to Print
          </h2>
          
          <div className="border border-gray-200 dark:border-gray-700 p-2 rounded-xl bg-white dark:bg-gray-950 shadow-inner mb-4">
            <img src={croppedImage} alt="Print Sheet Preview" className="w-full h-auto rounded-lg" />
          </div>
          
          <a 
            href={croppedImage} 
            download="id_photo_sheet_4x6.jpg"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
          >
            <span>⬇️</span> Download High-Res Image
          </a>
          <p className="text-xs text-center text-gray-500 mt-3 font-mono">
            Print on standard 4x6 inch photo paper at any kiosk.
          </p>
        </div>
      )}
    </div>
  );
}