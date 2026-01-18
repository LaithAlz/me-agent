import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Play, Pause, Volume2, VolumeX, Loader2, RefreshCcw } from 'lucide-react'
import type { ExplainResult, BundleResult } from '@/types'
import { cn } from '@/lib/utils'
import { synthesizeVoice, getAvatar, checkBackendHealth } from '@/lib/backendApi'

interface ExplainPanelProps {
  explanation: ExplainResult | string | null
  bundle: BundleResult | any | null
  isLoading: boolean
  onExplain: () => void
  avatarUrl?: string;
}

function getBundleItemCount(bundle: any | null): number {
  if (!bundle) return 0
  const items = (bundle as any).items
  return Array.isArray(items) ? items.length : 0
}

function getExplanationText(explanation: ExplainResult | string | null): string | null {
  if (!explanation) return null
  if (typeof explanation === 'string') return explanation
  if (typeof (explanation as any).text === 'string') return (explanation as any).text
  return null
}

export function ExplainPanel({ explanation, bundle, isLoading, onExplain, avatarUrl }: ExplainPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoadingVoice, setIsLoadingVoice] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const text = useMemo(() => getExplanationText(explanation), [explanation])
  const itemCount = useMemo(() => getBundleItemCount(bundle), [bundle])

  const canExplain = itemCount > 0
  const hasAudio = Boolean(text) // show play only when we have text to speak

  // Ensure play state updates if audio ends or component unmounts
  useEffect(() => {
    console.log('avatarUrl', avatarUrl)
    const a = audioRef.current
    if (!a) return

    const onEnded = () => setIsPlaying(false)
    const onPause = () => setIsPlaying(false)

    a.addEventListener('ended', onEnded)
    a.addEventListener('pause', onPause)

    return () => {
      a.removeEventListener('ended', onEnded)
      a.removeEventListener('pause', onPause)
    }
  }, [])

  useEffect(() => {
    console.log('avatarUrl', avatarUrl)
  }, [avatarUrl])

  const handlePlayPause = useCallback(async () => {
    // Pause if currently playing
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      return
    }

    if (!text) return

    setIsLoadingVoice(true)

    try {
      // Attempt real voice synthesis
      const response = await synthesizeVoice(text)

      if (response?.success && response?.audioBase64 && response?.contentType) {
        const audioSrc = `data:${response.contentType};base64,${response.audioBase64}`

        if (!audioRef.current) {
          audioRef.current = new Audio()
        }

        audioRef.current.src = audioSrc
        await audioRef.current.play()
        setIsPlaying(true)
        return
      }

      // Fallback: simulate playback
      setIsPlaying(true)
      window.setTimeout(() => setIsPlaying(false), 5000)
    } catch {
      // Backend not available: simulate playback
      setIsPlaying(true)
      window.setTimeout(() => setIsPlaying(false), 5000)
    } finally {
      setIsLoadingVoice(false)
    }
  }, [isPlaying, text])

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
                  {text}
                </p>
              </div>
            </div>

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
  )
}
