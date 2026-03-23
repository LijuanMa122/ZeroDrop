import { useState, useRef } from 'react';
import Cropper from 'react-cropper';
import './assets/cropper.css';

function IdPhotoTool() {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const cropperRef = useRef<HTMLImageElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const generateSheet = () => {
    if (!image || !cropperRef.current) return;
    
    setIsProcessing(true);
    try {
      // Get cropped canvas
      const croppedCanvas = (cropperRef.current as any).cropper.getCroppedCanvas({
        width: 354, // Standard 1-inch photo at 300 DPI
        height: 472, // Standard 1-inch photo at 300 DPI
      });

      // Create a 6x4 inch canvas at 300 DPI
      const sheetCanvas = document.createElement('canvas');
      sheetCanvas.width = 1800;
      sheetCanvas.height = 1200;
      const ctx = sheetCanvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

      // Draw 8 photos
      const photoWidth = croppedCanvas.width;
      const photoHeight = croppedCanvas.height;
      const padding = 20;

      const x_offset = 20;
      const y_offset = 20;

      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 4; j++) {
          const x = j * (photoWidth + padding) + x_offset;
          const y = i * (photoHeight + padding) + y_offset;
          ctx.drawImage(croppedCanvas, x, y);
        }
      }

      // Download
      const link = document.createElement('a');
      link.href = sheetCanvas.toDataURL('image/jpeg');
      link.download = 'id_photo_sheet.jpg';
      link.click();

    } catch (error) {
      console.error(error);
      alert('An error occurred while generating the photo sheet.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Left Column: Controls */}
      <div className="md:col-span-1 flex flex-col gap-6">
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {image ? '3. Adjust & Generate' : '1. Upload Photo'}
          </label>
          <input 
            type="file" 
            accept="image/*"
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-400
              hover:file:bg-blue-100 cursor-pointer" 
          />
        </div>
        
        {image && (
          <button 
            onClick={generateSheet}
            disabled={isProcessing}
            className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Generating...' : 'Generate & Download'}
          </button>
        )}
      </div>

      {/* Right Column: Cropper */}
      <div className="md:col-span-2">
        {image ? (
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">2. Crop to Fit (Standard 1-inch)</label>
            <div className="bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
              <Cropper
                ref={cropperRef}
                src={image}
                style={{ height: 400, width: '100%' }}
                aspectRatio={354 / 472}
                guides={true}
                viewMode={2}
                autoCropArea={1}
                background={false}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <div className="text-center text-gray-400">
              <span className="text-5xl">🖼️</span>
              <p className="mt-2 font-semibold">Image Preview</p>
              <p className="text-sm">Your photo will appear here to be cropped.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default IdPhotoTool;
