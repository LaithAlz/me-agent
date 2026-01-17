import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Play, Pause, Volume2, VolumeX, Loader2, RefreshCcw } from 'lucide-react';
import type { ExplainResult, BundleResult } from '@/types';
import { cn } from '@/lib/utils';

interface ExplainPanelProps {
  // New backend returns a string explanation from /recommend
  // Old flow used ExplainResult { text, audioUrl? }
  explanation: ExplainResult | string | null;

  // BundleResult in old flow, cart-like objects in new flow
  bundle: BundleResult | any | null;

  isLoading: boolean;

  // Old: call /explain
  // New: can re-run /recommend to refresh explanation
  onExplain: () => void;
}

function getBundleItemCount(bundle: any | null): number {
  if (!bundle) return 0;
  const items = bundle.items;
  return Array.isArray(items) ? items.length : 0;
}

function getExplanationText(explanation: ExplainResult | string | null): string | null {
  if (!explanation) return null;
  if (typeof explanation === 'string') return explanation;
  if (typeof explanation.text === 'string') return explanation.text;
  return null;
}

function getAudioUrl(explanation: ExplainResult | string | null): string | null {
  if (!explanation) return null;
  if (typeof explanation === 'string') return null;
  const url = (explanation as any).audioUrl;
  return typeof url === 'string' && url.length ? url : null;
}

export function ExplainPanel({
  explanation,
  bundle,
  isLoading,
  onExplain,
}: ExplainPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const itemCount = useMemo(() => getBundleItemCount(bundle), [bundle]);
  const canExplain = itemCount > 0;

  const text = useMemo(() => getExplanationText(explanation), [explanation]);
  const audioUrl = useMemo(() => getAudioUrl(explanation), [explanation]);
  const hasAudio = !!audioUrl;

  const handlePlayPause = () => {
    if (!hasAudio) return;

    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 5000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Why Me-Agent chose this
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {!text && !isLoading && (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              Get a detailed explanation of the agent&apos;s reasoning
            </p>

            <Button onClick={onExplain} disabled={!canExplain} variant="secondary">
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

        {text && !isLoading && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Based on {itemCount} item{itemCount === 1 ? '' : 's'} in your cart
              </p>

              <Button
                variant="outline"
                size="sm"
                onClick={onExplain}
                disabled={!canExplain}
                className="gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>

            <div className="flex gap-4">
              <div
                className={cn(
                  'h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0',
                  isPlaying && 'avatar-speaking'
                )}
              >
                <span className="text-2xl">🤖</span>
              </div>

              <div className="flex-1">
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {text}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPause}
                disabled={!hasAudio}
                className="gap-2"
              >
                {isPlaying ? (
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
