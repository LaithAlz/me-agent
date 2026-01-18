/**
 * PasskeyShowcase - Visual comparison of passwords vs passkeys
 * Demonstrates why passkeys are superior for security
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  Fingerprint, 
  KeyRound, 
  Shield,
  AlertTriangle,
  Laptop,
  Lock,
  Unlock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ComparisonView = 'password' | 'passkey';

interface ComparisonPoint {
  label: string;
  password: { status: 'bad' | 'ok' | 'good'; text: string };
  passkey: { status: 'bad' | 'ok' | 'good'; text: string };
}

const COMPARISON_POINTS: ComparisonPoint[] = [
  {
    label: 'Phishing Protection',
    password: { status: 'bad', text: 'Vulnerable - users can be tricked' },
    passkey: { status: 'good', text: 'Immune - cryptographic origin binding' },
  },
  {
    label: 'Credential Reuse',
    password: { status: 'bad', text: 'Common - same password on many sites' },
    passkey: { status: 'good', text: 'Impossible - unique per service' },
  },
  {
    label: 'Brute Force Attacks',
    password: { status: 'bad', text: 'Possible - weak passwords cracked' },
    passkey: { status: 'good', text: 'Impossible - 256-bit keys' },
  },
  {
    label: 'Server-Side Storage',
    password: { status: 'bad', text: 'Hashed secrets - breach target' },
    passkey: { status: 'good', text: 'Public keys only - useless if leaked' },
  },
  {
    label: 'User Experience',
    password: { status: 'ok', text: 'Friction - remember, type, manage' },
    passkey: { status: 'good', text: 'Seamless - biometric tap' },
  },
  {
    label: 'Device Binding',
    password: { status: 'bad', text: 'None - works anywhere (risk)' },
    passkey: { status: 'good', text: 'Hardware-bound - TPM/Secure Enclave' },
  },
];

export function PasskeyShowcase() {
  const [activeView, setActiveView] = useState<ComparisonView>('passkey');
  const [isAnimating, setIsAnimating] = useState(false);

  const handleViewChange = (view: ComparisonView) => {
    if (view !== activeView) {
      setIsAnimating(true);
      setActiveView(view);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toggle Header */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted">
          <Button
            variant={activeView === 'password' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewChange('password')}
            className={cn(
              'gap-2',
              activeView === 'password' && 'bg-destructive hover:bg-destructive/90'
            )}
          >
            <KeyRound className="h-4 w-4" />
            Traditional Password
          </Button>
          <Button
            variant={activeView === 'passkey' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewChange('passkey')}
            className="gap-2"
          >
            <Fingerprint className="h-4 w-4" />
            Passkey (WebAuthn)
          </Button>
        </div>
      </div>

      {/* Main Comparison Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Password Card */}
        <Card 
          className={cn(
            'transition-all duration-300 cursor-pointer',
            activeView === 'password' 
              ? 'ring-2 ring-destructive shadow-lg scale-[1.02]' 
              : 'opacity-60 hover:opacity-80'
          )}
          onClick={() => handleViewChange('password')}
        >
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'h-12 w-12 rounded-xl flex items-center justify-center',
                activeView === 'password' ? 'bg-destructive/10' : 'bg-muted'
              )}>
                <KeyRound className={cn(
                  'h-6 w-6',
                  activeView === 'password' ? 'text-destructive' : 'text-muted-foreground'
                )} />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Traditional Passwords
                  <Badge variant="destructive" className="text-xs">Legacy</Badge>
                </CardTitle>
                <CardDescription>
                  Shared secrets stored on servers
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {[
                'Phishing susceptible',
                'Reused across sites',
                'Weak or forgotten',
                'Server breach risk',
                'No device binding',
              ].map((vuln) => (
                <div key={vuln} className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">{vuln}</span>
                </div>
              ))}
            </div>
            
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Security Score</span>
                <span className="font-semibold text-destructive">2/10</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div className="bg-destructive h-2 rounded-full w-[20%]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Passkey Card */}
        <Card 
          className={cn(
            'transition-all duration-300 cursor-pointer',
            activeView === 'passkey' 
              ? 'ring-2 ring-verified shadow-lg scale-[1.02]' 
              : 'opacity-60 hover:opacity-80'
          )}
          onClick={() => handleViewChange('passkey')}
        >
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'h-12 w-12 rounded-xl flex items-center justify-center',
                activeView === 'passkey' ? 'bg-verified/10' : 'bg-muted'
              )}>
                <Fingerprint className={cn(
                  'h-6 w-6',
                  activeView === 'passkey' ? 'text-verified' : 'text-muted-foreground'
                )} />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Passkeys (WebAuthn)
                  <Badge className="text-xs bg-verified hover:bg-verified">Modern</Badge>
                </CardTitle>
                <CardDescription>
                  Public-key cryptography with biometrics
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {[
                'Phishing impossible',
                'Unique per service',
                'Hardware-backed keys',
                'Only public keys on server',
                'Biometric + device bound',
              ].map((adv) => (
                <div key={adv} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-verified flex-shrink-0" />
                  <span className="text-foreground">{adv}</span>
                </div>
              ))}
            </div>
            
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Security Score</span>
                <span className="font-semibold text-verified">10/10</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div className="bg-verified h-2 rounded-full w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {COMPARISON_POINTS.map((point) => (
              <div 
                key={point.label}
                className="grid grid-cols-[1fr,1fr,1fr] gap-4 py-3 border-b last:border-0"
              >
                <div className="font-medium text-sm">{point.label}</div>
                <div className={cn(
                  'text-sm flex items-start gap-2',
                  activeView === 'password' && 'font-medium'
                )}>
                  {point.password.status === 'bad' && (
                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  {point.password.status === 'ok' && (
                    <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="text-muted-foreground">{point.password.text}</span>
                </div>
                <div className={cn(
                  'text-sm flex items-start gap-2',
                  activeView === 'passkey' && 'font-medium'
                )}>
                  <CheckCircle className="h-4 w-4 text-verified flex-shrink-0 mt-0.5" />
                  <span>{point.passkey.text}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* How Passkeys Work */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Laptop className="h-5 w-5" />
            How Passkeys Work on Your Device
          </CardTitle>
          <CardDescription>
            Using your laptop's built-in fingerprint scanner or Windows Hello
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Registration Flow */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">1</Badge>
                Registration (One Time)
              </h4>
              <div className="space-y-3 ml-6">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">1</div>
                  <p className="text-sm text-muted-foreground">
                    Your device generates a unique keypair (public + private)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">2</div>
                  <p className="text-sm text-muted-foreground">
                    Private key stays in TPM/Secure Enclave (never leaves)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">3</div>
                  <p className="text-sm text-muted-foreground">
                    Only the public key is sent to the server
                  </p>
                </div>
              </div>
            </div>

            {/* Authentication Flow */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">2</Badge>
                Authentication (Every Login)
              </h4>
              <div className="space-y-3 ml-6">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-verified/10 flex items-center justify-center text-xs font-medium text-verified">1</div>
                  <p className="text-sm text-muted-foreground">
                    Server sends a random challenge
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-verified/10 flex items-center justify-center text-xs font-medium text-verified">2</div>
                  <p className="text-sm text-muted-foreground">
                    You touch fingerprint sensor / use Windows Hello
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-verified/10 flex items-center justify-center text-xs font-medium text-verified">3</div>
                  <p className="text-sm text-muted-foreground">
                    Device signs challenge with private key → server verifies
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Point */}
          <div className="mt-6 p-4 bg-verified/10 border border-verified/30 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-verified flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Why This Matters</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Even if an attacker steals the server database, they only get public keys—
                  completely useless without your biometric + device. There's literally nothing 
                  to phish, no password to crack, and no credential to steal.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
