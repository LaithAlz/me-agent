import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Fingerprint, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { isPlatformAuthenticatorAvailable, registerAdditionalPasskey } from '@/lib/webauthn';

interface PasskeyRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  onSuccess?: () => void;
}

type RegistrationState = 'idle' | 'checking' | 'registering' | 'success' | 'error' | 'no-biometric';

export function PasskeyRegistrationModal({
  isOpen,
  onClose,
  username,
  onSuccess,
}: PasskeyRegistrationModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [state, setState] = useState<RegistrationState>('idle');
  const [error, setError] = useState('');
  const [hasBiometric, setHasBiometric] = useState(false);

  // Check for biometric hardware on mount
  if (isOpen && state === 'idle') {
    checkBiometric();
  }

  async function checkBiometric() {
    setState('checking');
    const available = await isPlatformAuthenticatorAvailable();
    setHasBiometric(available);
    if (!available) {
      setState('no-biometric');
    } else {
      setState('idle');
    }
  }

  async function handleRegister() {
    setState('registering');
    setError('');

    try {
      const result = await registerAdditionalPasskey(displayName);

      if (result.success) {
        setState('success');
        setTimeout(() => {
          onSuccess?.();
          onClose();
          setState('idle');
          setDisplayName('');
        }, 2000);
      } else {
        setState('error');
        setError(result.error || 'Failed to register passkey');
      }
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }

  function handleClose() {
    if (state !== 'registering') {
      onClose();
      setState('idle');
      setDisplayName('');
      setError('');
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register New Passkey</DialogTitle>
          <DialogDescription>
            Add another passkey to your account for backup or different devices
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Biometric Detection */}
          {state === 'checking' ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-600">Checking for biometric hardware...</span>
            </div>
          ) : state === 'no-biometric' ? (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-900">No biometric hardware detected</p>
                  <p className="text-sm text-orange-700 mt-1">
                    Your device doesn't have a fingerprint reader or Windows Hello.
                    Registration will use demo mode.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex gap-3">
                <Fingerprint className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Biometric sensor detected</p>
                  <p className="text-sm text-green-700 mt-1">
                    Your device supports secure biometric authentication
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Display Name Input */}
          {state === 'idle' || state === 'no-biometric' ? (
            <div>
              <label className="text-sm font-medium text-gray-700">
                Passkey Name (optional)
              </label>
              <Input
                placeholder={`e.g., "My iPhone" or "Work Laptop"`}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Help you identify this passkey later. Defaults to your username if empty.
              </p>
            </div>
          ) : null}

          {/* Registration States */}
          {state === 'registering' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium text-gray-600">
                Follow the prompt on your device...
              </p>
              <p className="text-xs text-gray-500 text-center">
                Touch your fingerprint sensor or use Face ID when prompted
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <p className="text-sm font-medium text-gray-900">
                Passkey registered successfully!
              </p>
              <Badge variant="default" className="mt-2">
                ✓ You can now use this device for authentication
              </Badge>
            </div>
          )}

          {state === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex gap-3">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Registration failed</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          {(state === 'idle' || state === 'no-biometric') && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <span className="font-medium">💡 Tip:</span> Register multiple passkeys on different
                devices so you always have backup authentication methods.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={state === 'registering'}
            className="flex-1"
          >
            Cancel
          </Button>
          {state === 'idle' || state === 'no-biometric' ? (
            <Button
              onClick={handleRegister}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Fingerprint className="w-4 h-4 mr-2" />
              Register Passkey
            </Button>
          ) : state === 'success' ? (
            <Button disabled className="flex-1">
              ✓ Done
            </Button>
          ) : state === 'error' ? (
            <Button
              onClick={handleRegister}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Try Again
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
