/**
 * AvatarUpload - Component to capture user photo and generate bitmoji avatar
 * Uses the device camera to take a photo and sends it to Gemini API for processing.
 */
import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader2, User, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { generateAvatar, getAvatar } from '@/lib/backendApi';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  onAvatarGenerated?: (avatarBase64: string) => void;
  className?: string;
}

export function AvatarUpload({ onAvatarGenerated, className }: AvatarUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCapturing(true);
      }
    } catch (e) {
      setError('Could not access camera. Please allow camera permissions or upload a photo instead.');
      console.error('Camera error:', e);
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror the image horizontally for selfie-style
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCapturedImage(result);
    };
    reader.readAsDataURL(file);
  };

  const generateAvatarFromPhoto = async () => {
    if (!capturedImage) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Extract base64 data (remove data URL prefix)
      const base64Data = capturedImage.split(',')[1];
      
      const response = await generateAvatar(base64Data, 'bitmoji');
      
      if (response.success && response.avatarBase64) {
        const avatarUrl = `data:image/jpeg;base64,${response.avatarBase64}`;
        setGeneratedAvatar(avatarUrl);
        onAvatarGenerated?.(response.avatarBase64);
      } else {
        setError(response.error || 'Failed to generate avatar');
      }
    } catch (e) {
      setError('Failed to connect to backend. Is the server running?');
      console.error('Avatar generation error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setGeneratedAvatar(null);
    setError(null);
    stopCamera();
  };

  const handleClose = () => {
    reset();
    setIsOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) handleClose();
        else setIsOpen(true);
      }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className={cn('gap-2', className)}>
            <Camera className="h-4 w-4" />
            Create Avatar
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Create Your Avatar
            </DialogTitle>
            <DialogDescription>
              Take a photo or upload an image to generate your bitmoji-style avatar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Camera/Image Preview Area */}
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              {/* Hidden canvas for capture */}
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Video stream */}
              {isCapturing && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }} // Mirror for selfie
                />
              )}
              
              {/* Captured image preview */}
              {capturedImage && !isCapturing && (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              
              {/* Generated avatar preview */}
              {generatedAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="text-center">
                    <img
                      src={generatedAvatar}
                      alt="Generated Avatar"
                      className="w-32 h-32 rounded-full mx-auto border-4 border-primary"
                      style={{ filter: 'saturate(1.2) contrast(1.1)' }}
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Avatar generated!
                    </p>
                  </div>
                </div>
              )}
              
              {/* Placeholder */}
              {!isCapturing && !capturedImage && !generatedAvatar && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                  <User className="h-16 w-16 mb-2" />
                  <p className="text-sm">Take a photo or upload an image</p>
                </div>
              )}
              
              {/* Loading overlay */}
              {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Generating your avatar...
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Error message */}
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              {!isCapturing && !capturedImage && !generatedAvatar && (
                <>
                  <Button onClick={startCamera} className="gap-2">
                    <Camera className="h-4 w-4" />
                    Take Photo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </>
              )}
              
              {isCapturing && (
                <>
                  <Button onClick={capturePhoto} className="gap-2">
                    <Camera className="h-4 w-4" />
                    Capture
                  </Button>
                  <Button variant="outline" onClick={stopCamera}>
                    Cancel
                  </Button>
                </>
              )}
              
              {capturedImage && !generatedAvatar && !isGenerating && (
                <>
                  <Button onClick={generateAvatarFromPhoto} className="gap-2">
                    <User className="h-4 w-4" />
                    Generate Avatar
                  </Button>
                  <Button variant="outline" onClick={reset} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Retake
                  </Button>
                </>
              )}
              
              {generatedAvatar && (
                <>
                  <Button onClick={handleClose}>
                    Done
                  </Button>
                  <Button variant="outline" onClick={reset} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
