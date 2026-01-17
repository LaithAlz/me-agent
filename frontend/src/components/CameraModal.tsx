/**
 * CameraModal - Camera capture, crop, and confirm interface
 */
import { useState, useRef, useEffect } from 'react';
import { Loader2, X, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface CameraModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (base64: string) => void;
  isLoading?: boolean;
}

export function CameraModal({ open, onClose, onConfirm, isLoading }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);

  // Start camera on mount
  useEffect(() => {
    if (!open) return;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error('Camera access failed:', error);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [open]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg');
    setCaptured(imageData);
  };

  const handleCropChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (e.target.name === 'zoom') {
      setZoom(value);
    } else if (e.target.name === 'x') {
      setCropX(value);
    } else if (e.target.name === 'y') {
      setCropY(value);
    }
  };

  const handleConfirm = () => {
    if (!captured || !canvasRef.current) return;

    // If cropping was applied, crop the image
    if (zoom !== 100 || cropX !== 0 || cropY !== 0) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const scale = zoom / 100;
        const croppedWidth = img.width / scale;
        const croppedHeight = img.height / scale;

        canvas.width = croppedWidth;
        canvas.height = croppedHeight;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, -cropX, -cropY);

        const croppedData = canvas.toDataURL('image/jpeg');
        const base64 = croppedData.split(',')[1];
        onConfirm(base64);
        setCaptured(null);
        setCropX(0);
        setCropY(0);
        setZoom(100);
      };
      img.src = captured;
    } else {
      const base64 = captured.split(',')[1];
      onConfirm(base64);
      setCaptured(null);
      setCropX(0);
      setCropY(0);
      setZoom(100);
    }
  };

  const handleRetake = () => {
    setCaptured(null);
    setCropX(0);
    setCropY(0);
    setZoom(100);
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCaptured(null);
    setCropX(0);
    setCropY(0);
    setZoom(100);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{captured ? 'Crop & Confirm' : 'Take a Photo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!captured ? (
            <>
              {/* Camera Preview */}
              <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Capture Button */}
              <Button
                onClick={handleCapture}
                className="w-full"
                size="lg"
              >
                Capture Photo
              </Button>
            </>
          ) : (
            <>
              {/* Captured Image Preview with Crop Controls */}
              <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                <img
                  src={captured}
                  alt="Captured"
                  className="w-full h-full object-cover"
                  style={{
                    transform: `scale(${zoom / 100}) translate(${cropX}px, ${cropY}px)`,
                  }}
                />
              </div>

              {/* Crop Controls */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Zoom: {zoom}%</label>
                  <input
                    type="range"
                    name="zoom"
                    min="100"
                    max="200"
                    value={zoom}
                    onChange={handleCropChange}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Horizontal: {cropX}px</label>
                  <input
                    type="range"
                    name="x"
                    min="-100"
                    max="100"
                    value={cropX}
                    onChange={handleCropChange}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Vertical: {cropY}px</label>
                  <input
                    type="range"
                    name="y"
                    min="-100"
                    max="100"
                    value={cropY}
                    onChange={handleCropChange}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleRetake}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  Retake
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Confirm'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Hidden Canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
