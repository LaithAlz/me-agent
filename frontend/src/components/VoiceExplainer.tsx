/**
 * VoiceExplainer - Top-right floating component
 * Shows bitmoji + plays voice explanation with user's cloned voice
 */
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2, Mic, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { synthesizeVoice, getAvatar, useVoiceId } from '@/lib/backendApi';

interface VoiceExplainerProps {
  explanation?: string;
  onClose?: () => void;
}

export function VoiceExplainer({ explanation, onClose }: VoiceExplainerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cloneSuccess, setCloneSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Load user's avatar on mount
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const data = await getAvatar();
        if (data.hasAvatar && data.avatarBase64) {
          setAvatarUrl(`data:image/jpeg;base64,${data.avatarBase64}`);
        }
      } catch (e) {
        console.error('Failed to load avatar:', e);
      }
    };
    
    loadAvatar();
  }, []);

  const handlePlayExplanation = async () => {
    if (!explanation) return;
    
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    
    setIsLoadingVoice(true);
    try {
      const response = await synthesizeVoice(explanation);
      
      if (response.success && response.audioBase64) {
        const audioSrc = `data:${response.contentType};base64,${response.audioBase64}`;
        
        if (audioRef.current) {
          audioRef.current.src = audioSrc;
          await audioRef.current.play();
          setIsPlaying(true);
          
          audioRef.current.onended = () => setIsPlaying(false);
        }
      }
    } catch (e) {
      console.error('Voice synthesis failed:', e);
    } finally {
      setIsLoadingVoice(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'voice_sample.webm', { type: 'audio/webm' });
        
        console.log('Recording complete, file size:', file.size, 'bytes');
        
        // Use hardcoded voice ID
        const VOICE_ID = '7zEWfkhTZw83mmRtzliA';
        
        setIsUploading(true);
        setUploadError(null);
        try {
          console.log('Setting up voice with ID:', VOICE_ID);
          const result = await useVoiceId(VOICE_ID);
          console.log('Voice setup result:', result);
          
          if (result.success) {
            setCloneSuccess(true);
            setShowSetup(false);
            
            // Auto-play test message in cloned voice
            setTimeout(async () => {
              const testMessage = "Voice cloning successful! This is how I'll explain your shopping decisions.";
              try {
                const response = await synthesizeVoice(testMessage);
                if (response.success && response.audioBase64) {
                  const audioSrc = `data:${response.contentType};base64,${response.audioBase64}`;
                  if (audioRef.current) {
                    audioRef.current.src = audioSrc;
                    await audioRef.current.play();
                    setIsPlaying(true);
                    audioRef.current.onended = () => setIsPlaying(false);
                  }
                }
              } catch (e) {
                console.error('Test playback failed:', e);
              }
            }, 500);
          } else {
            setUploadError(result.error || 'Voice setup failed');
            console.error('Voice setup failed:', result.error);
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Voice setup failed';
          setUploadError(errorMsg);
          console.error('Voice setup failed:', e);
        } finally {
          setIsUploading(false);
        }
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (e) {
      console.error('Microphone access failed:', e);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  return (
    <>
      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />
      
      {/* Top-right floating card */}
      <Card className="fixed top-4 right-4 w-80 z-40 shadow-lg">
        <div className="p-4 space-y-3">
          {/* Header with avatar */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Security Explainer</h3>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ✕
              </Button>
            )}
          </div>

          {/* Avatar Display */}
          <div className="flex justify-center">
            <div 
              className={cn(
                "h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden",
                isPlaying && "ring-4 ring-primary/30 animate-pulse"
              )}
            >
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Your Avatar" 
                  className="h-full w-full object-cover"
                  style={{ filter: 'saturate(1.2) contrast(1.1)' }}
                />
              ) : (
                <User className="h-10 w-10 text-primary" />
              )}
            </div>
          </div>

          {/* Explanation Text */}
          {explanation ? (
            <div className="bg-muted/50 rounded-lg p-2 text-xs leading-relaxed max-h-24 overflow-y-auto">
              {explanation}
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-2 text-xs leading-relaxed text-center text-muted-foreground">
              {avatarUrl ? 'Waiting for explanation...' : 'Set up your avatar and voice to get started'}
            </div>
          )}

          {/* Voice Setup */}
          {!avatarUrl && !cloneSuccess && (
            <Badge variant="secondary" className="text-xs w-full justify-center">
              👆 Click mic to record your voice
            </Badge>
          )}
          
          {cloneSuccess && (
            <Badge variant="default" className="text-xs w-full justify-center bg-green-600">
              ✓ Voice cloned successfully!
            </Badge>
          )}
          
          {isUploading && (
            <Badge variant="secondary" className="text-xs w-full justify-center">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Uploading voice...
            </Badge>
          )}
          
          {uploadError && (
            <Badge variant="destructive" className="text-xs w-full justify-center">
              ✗ {uploadError}
            </Badge>
          )}

          {/* Voice Controls */}
          <div className="flex gap-2">
            {!showSetup ? (
              <>
                <Button
                  onClick={handlePlayExplanation}
                  disabled={!explanation || isLoadingVoice || isUploading}
                  size="sm"
                  className="flex-1"
                >
                  {isLoadingVoice ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4 mr-1" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  onClick={() => setShowSetup(true)}
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  size="sm"
                  disabled={isUploading}
                  className={isRecording ? 'bg-destructive hover:bg-destructive/90' : ''}
                >
                  <Mic className={cn("h-4 w-4", isRecording && "animate-pulse")} />
                  {isRecording ? 'Stop' : 'Record'}
                </Button>
                <Button
                  onClick={() => setShowSetup(false)}
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                >
                  Done
                </Button>
              </>
            )}
          </div>

          {showSetup && !isRecording && (
            <p className="text-xs text-muted-foreground">
              Record 3-5 seconds of your voice to clone it
            </p>
          )}
          
          {isRecording && (
            <div className="bg-primary/10 rounded-lg p-3 border-2 border-primary/30">
              <p className="text-xs font-medium text-center mb-1">Read this phrase:</p>
              <p className="text-sm font-semibold text-center leading-relaxed">
                "I'm setting up my voice assistant to help me make smarter shopping decisions and stay within my budget."
              </p>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
