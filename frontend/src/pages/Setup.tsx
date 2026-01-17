/**
 * Setup Page - Register a real passkey before using the demo
 * This is the entry point for first-time users
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Fingerprint, 
  ArrowRight,
  CheckCircle,
  Laptop,
  Info,
} from 'lucide-react';
import { PasskeyRegistration } from '@/components/PasskeyRegistration';
import { getSession, demoLogin } from '@/lib/backendApi';

export default function SetupPage() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (session.authenticated) {
          setHasSession(true);
        }
      } catch (e) {
        console.log('No active session');
      } finally {
        setIsChecking(false);
      }
    };
    checkSession();
  }, []);

  const handleRegistrationSuccess = (userId: string) => {
    console.log('Passkey registered:', userId);
    // Wait a moment then redirect to demo
    setTimeout(() => {
      navigate('/demo');
    }, 2000);
  };

  const handleSkipToDemoMode = async () => {
    // Use demo login
    try {
      await demoLogin();
      navigate('/demo');
    } catch (e) {
      console.error('Demo login failed:', e);
      navigate('/demo');
    }
  };

  const handleContinueToDemo = () => {
    navigate('/demo');
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  if (hasSession) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                  <Shield className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-semibold">Me-Agent</span>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <Card className="border-verified/50">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-verified/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-verified" />
                  </div>
                </div>
                <CardTitle>You're All Set!</CardTitle>
                <CardDescription>
                  Your passkey is already registered. Continue to the demo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleContinueToDemo} className="w-full gap-2">
                  Continue to Demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">Me-Agent</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <Badge variant="outline" className="gap-1">
              <Fingerprint className="h-3 w-3" />
              Secure Setup
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold">
              Set Up Your Passkey
            </h1>
            <p className="text-lg text-muted-foreground">
              Experience real biometric authentication with your device's fingerprint 
              sensor or Windows Hello. No passwords required.
            </p>
          </div>
        </div>
      </section>

      {/* Why Passkeys Section */}
      <section className="py-8 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto grid sm:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="h-12 w-12 rounded-full bg-verified/10 flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6 text-verified" />
              </div>
              <h3 className="font-semibold mb-1">Phishing Proof</h3>
              <p className="text-sm text-muted-foreground">
                Cryptographic binding prevents credential theft
              </p>
            </div>
            <div className="text-center p-4">
              <div className="h-12 w-12 rounded-full bg-verified/10 flex items-center justify-center mx-auto mb-3">
                <Fingerprint className="h-6 w-6 text-verified" />
              </div>
              <h3 className="font-semibold mb-1">Biometric Only</h3>
              <p className="text-sm text-muted-foreground">
                Your fingerprint never leaves your device
              </p>
            </div>
            <div className="text-center p-4">
              <div className="h-12 w-12 rounded-full bg-verified/10 flex items-center justify-center mx-auto mb-3">
                <Laptop className="h-6 w-6 text-verified" />
              </div>
              <h3 className="font-semibold mb-1">Hardware Backed</h3>
              <p className="text-sm text-muted-foreground">
                Private keys stored in TPM/Secure Enclave
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Registration Form */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <PasskeyRegistration 
            onSuccess={handleRegistrationSuccess}
            onSkip={handleSkipToDemoMode}
            showSkip={true}
          />
        </div>
      </section>

      {/* Info Note */}
      <section className="py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold">What happens next?</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Your browser will prompt you to use your fingerprint sensor or Windows Hello</li>
                      <li>• A cryptographic keypair will be generated on your device</li>
                      <li>• Only the public key is sent to our server - your private key stays on your device</li>
                      <li>• You'll then see the agent demo with real biometric authentication</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold">Me-Agent</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Secure Identity-Bound AI Agent
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
