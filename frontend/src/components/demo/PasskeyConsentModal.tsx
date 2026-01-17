import { Shield, Fingerprint, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PasskeyState } from '@/types';
import { cn } from '@/lib/utils';

interface PasskeyConsentModalProps {
  open: boolean;
  state: PasskeyState;
  onAuthorize: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

export function PasskeyConsentModal({
  open,
  state,
  onAuthorize,
  onCancel,
  onRetry,
}: PasskeyConsentModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && state !== 'prompting' && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Authorize Me-Agent
          </DialogTitle>
          <DialogDescription>
            Verify your identity to allow the agent to generate shopping recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Passkey Card */}
          <div
            className={cn(
              'passkey-card text-center',
              state === 'prompting' && 'passkey-card-prompting',
              state === 'success' && 'passkey-card-success',
              state === 'failed' && 'passkey-card-failed'
            )}
          >
            {state === 'idle' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Fingerprint className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold mb-1">Use your passkey</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Touch ID, Face ID, or security key
                </p>
                <Button onClick={onAuthorize} className="w-full">
                  Authorize with Passkey
                </Button>
              </>
            )}

            {state === 'prompting' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-ring">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                </div>
                <h3 className="font-semibold mb-1">Waiting for passkey...</h3>
                <p className="text-sm text-muted-foreground">
                  Complete the verification on your device
                </p>
              </>
            )}

            {state === 'success' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-verified/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-verified" />
                  </div>
                </div>
                <h3 className="font-semibold text-verified mb-1">Authorized</h3>
                <p className="text-sm text-muted-foreground">
                  Generating recommendations...
                </p>
              </>
            )}

            {state === 'failed' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-8 w-8 text-destructive" />
                  </div>
                </div>
                <h3 className="font-semibold text-destructive mb-1">Verification Failed</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Unable to verify your passkey. Please try again.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onCancel} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={onRetry} className="flex-1">
                    Retry
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Trust message */}
        <div className="text-center text-xs text-muted-foreground border-t pt-4">
          <Shield className="h-3 w-3 inline mr-1" />
          Your passkey never leaves your device. This consent is logged for audit.
        </div>
      </DialogContent>
    </Dialog>
  );
}
