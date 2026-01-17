import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import type { ExplainResult, BundleResult } from '@/types';
import { cn } from '@/lib/utils';
import { synthesizeVoice, getAvatar, checkBackendHealth } from '@/lib/backendApi';

interface ExplainPanelProps {
  explanation: ExplainResult | null;
  bundle: BundleResult | null;
  isLoading: boolean;
  onExplain: () => void;
}

export function ExplainPanel({
  explanation,
  bundle,
  isLoading,
  onExplain,
}: ExplainPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load avatar on mount
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const isConnected = await checkBackendHealth();
        if (isConnected) {
          const data = await getAvatar();
          if (data.hasAvatar && data.avatarBase64) {
            setAvatarUrl(`data:image/jpeg;base64,${data.avatarBase64}`);
          }
        }
      } catch (e) {
        console.error('Failed to load avatar:', e);
      }
    };
    loadAvatar();
  }, []);

  const handlePlayPause = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (!explanation?.text) return;

    setIsLoadingVoice(true);
    try {
      // Try to use real voice API
      const response = await synthesizeVoice(explanation.text);
      
      if (response.success && response.audioBase64) {
        const audioSrc = `data:${response.contentType};base64,${response.audioBase64}`;
        
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = audioSrc;
        await audioRef.current.play();
        setIsPlaying(true);
        audioRef.current.onended = () => setIsPlaying(false);
      } else {
        // Fallback: simulate playback
        setIsPlaying(true);
        setTimeout(() => setIsPlaying(false), 5000);
      }
    } catch (e) {
      // Backend not available - simulate playback
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), 5000);
    } finally {
      setIsLoadingVoice(false);
    }
  };

  const canExplain = bundle && bundle.items.length > 0;
  const hasAudio = true; // Always show play button, will use backend or simulate

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Why Me-Agent chose this
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!explanation && !isLoading && (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              Get a detailed explanation of the agent's reasoning
            </p>
            <Button
              onClick={onExplain}
              disabled={!canExplain}
              variant="secondary"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Explain my choices
            </Button>
            {!canExplain && (
              <p className="text-xs text-muted-foreground mt-2">
                Generate a bundle first
              </p>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {explanation && !isLoading && (
          <div className="space-y-4 animate-fade-in">
            {/* Avatar + Text */}
            <div className="flex gap-4">
              {/* Bitmoji-style avatar - uses user's generated avatar or fallback */}
              <div 
                className={cn(
                  'h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden',
                  isPlaying && 'avatar-speaking ring-2 ring-primary animate-pulse'
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
                  <span className="text-2xl">🤖</span>
                )}
              </div>
              
              <div className="flex-1">
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {explanation.text}
                </p>
              </div>
            </div>

            {/* Audio controls */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPause}
                disabled={!hasAudio || isLoadingVoice}
                className="gap-2"
              >
                {isLoadingVoice ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : isPlaying ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Play
                  </>
                )}
              </Button>

              {hasAudio ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Volume2 className="h-4 w-4" />
                  Audio available
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <VolumeX className="h-4 w-4" />
                  Voice not generated
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
