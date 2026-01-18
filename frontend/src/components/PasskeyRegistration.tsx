/**
 * PasskeyRegistration - Component for registering a new passkey
 * This demonstrates real WebAuthn registration with biometrics
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Fingerprint, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Shield,
  Laptop,
} from 'lucide-react';
import { 
  registerPasskey, 
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupported,
} from '@/lib/webauthn';
import { cn } from '@/lib/utils';

type RegistrationState = 'idle' | 'checking' | 'registering' | 'success' | 'error';

interface PasskeyRegistrationProps {
  onSuccess?: (userId: string) => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

export function PasskeyRegistration({ onSuccess, onSkip, showSkip = true }: PasskeyRegistrationProps) {
  const [state, setState] = useState<RegistrationState>('idle');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasPlatformAuth, setHasPlatformAuth] = useState<boolean | null>(null);

  // Check for platform authenticator on mount
  useState(() => {
    isPlatformAuthenticatorAvailable().then(setHasPlatformAuth);
  });

  const handleRegister = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setState('checking');
    setError(null);

    // Check if WebAuthn is supported
    if (!isWebAuthnSupported()) {
      setError('Passkeys are not supported in this browser');
      setState('error');
      return;
    }

    // Check for platform authenticator
    const available = await isPlatformAuthenticatorAvailable();
    if (!available) {
      setError('No fingerprint sensor or Windows Hello detected. You can still continue in demo mode.');
      setState('idle');
      return;
    }

    setState('registering');

    // Attempt registration
    const result = await registerPasskey(username.trim(), username.trim());

    if (result.success) {
      setState('success');
      onSuccess?.(result.userId!);
    } else {
      setError(result.error || 'Registration failed');
      setState('error');
    }
  };

  const handleRetry = () => {
    setState('idle');
    setError(null);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className={cn(
            'h-16 w-16 rounded-full flex items-center justify-center transition-colors',
            state === 'success' ? 'bg-verified/10' : 
            state === 'error' ? 'bg-destructive/10' : 
            'bg-primary/10'
          )}>
            {state === 'success' ? (
              <CheckCircle className="h-8 w-8 text-verified" />
            ) : state === 'error' ? (
              <XCircle className="h-8 w-8 text-destructive" />
            ) : state === 'registering' ? (
              <Fingerprint className="h-8 w-8 text-primary animate-pulse" />
            ) : (
              <Fingerprint className="h-8 w-8 text-primary" />
            )}
          </div>
        </div>
        <CardTitle>Register Your Passkey</CardTitle>
        <CardDescription>
          Set up biometric authentication with your device's fingerprint sensor or Windows Hello
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Platform Auth Status */}
        <div className="flex items-center justify-center gap-2">
          {hasPlatformAuth === null ? (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking device...
            </Badge>
          ) : hasPlatformAuth ? (
            <Badge variant="outline" className="gap-1 border-verified text-verified">
              <Laptop className="h-3 w-3" />
              Biometric sensor detected
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
              <Laptop className="h-3 w-3" />
              No biometric sensor found
            </Badge>
          )}
        </div>

        {/* Registration Form */}
        {state === 'idle' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="username">Choose a username</Label>
              <Input
                id="username"
                placeholder="e.g., john_doe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            <Button 
              onClick={handleRegister} 
              className="w-full gap-2"
              disabled={!hasPlatformAuth}
            >
              <Fingerprint className="h-4 w-4" />
              Register with Fingerprint
            </Button>

            {showSkip && (
              <Button 
                variant="ghost" 
                onClick={onSkip}
                className="w-full text-muted-foreground"
              >
                Skip and use demo mode
              </Button>
            )}
          </>
        )}

        {state === 'checking' && (
          <div className="text-center py-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Checking device capabilities...</p>
          </div>
        )}

        {state === 'registering' && (
          <div className="text-center py-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Fingerprint className="h-8 w-8 text-primary" />
            </div>
            <p className="font-medium">Touch your fingerprint sensor</p>
            <p className="text-sm text-muted-foreground mt-1">
              Or complete Windows Hello verification
            </p>
          </div>
        )}

        {state === 'success' && (
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 text-verified mx-auto mb-3" />
            <p className="font-medium text-verified">Passkey Registered!</p>
            <p className="text-sm text-muted-foreground mt-1">
              You can now authenticate with your fingerprint
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
              <p className="font-medium text-destructive">Registration Failed</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onSkip} className="flex-1">
                Skip
              </Button>
              <Button onClick={handleRetry} className="flex-1">
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Security Note */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          <Shield className="h-3 w-3 inline mr-1" />
          Your biometric data never leaves your device
        </div>
      </CardContent>
    </Card>
  );
}
