import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, ArrowRight, CheckCircle, Lock, Eye, Zap, Fingerprint, FileText, Crown } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary gap-0.5">
                <Crown className="h-4 w-4 text-primary-foreground" />
                <Crown className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">Me-Agent</span>
            </div>
            <nav className="flex items-center gap-2">
              <Link to="/security">
                <Button variant="ghost" size="sm">Security</Button>
              </Link>
              <Link to="/audit">
                <Button variant="ghost" size="sm">Audit</Button>
              </Link>
              <Link to="/setup">
                <Button>
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-0 pb-20 md:pb-32 relative">
        <div>
          <img
            src="/favicon.ico"
            alt=""
            className="mx-auto mb-10 animate-pulse [animation-duration:4s] opacity-80"
          />
        </div>
        <div className="container mx-auto px-4 text-center">          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-verified/10 text-verified text-sm font-medium mb-6">
            <Fingerprint className="h-4 w-4" />
            Passkey-First Security
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
            A Secure, Identity-Bound
            <br />
            <span className="text-primary">AI Shopping Agent</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Hardware biometric authentication. Zero passwords. Complete transparency.
            No autonomous purchases without your fingerprint.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/setup">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/security">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <Shield className="mr-2 h-5 w-5" />
                View Security
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Passkey Highlight */}
      <section className="py-12 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-y">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Fingerprint className="h-8 w-8 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg">Hardware Biometrics</h3>
                <p className="text-sm text-muted-foreground">Windows Hello, Touch ID, fingerprint sensors</p>
              </div>
            </div>
            <div className="hidden md:block h-12 w-px bg-border" />
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-verified/10 flex items-center justify-center">
                <Lock className="h-8 w-8 text-verified" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg">Zero Passwords</h3>
                <p className="text-sm text-muted-foreground">Nothing to phish, leak, or forget</p>
              </div>
            </div>
            <div className="hidden md:block h-12 w-px bg-border" />
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <FileText className="h-8 w-8 text-amber-500" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg">Full Audit Trail</h3>
                <p className="text-sm text-muted-foreground">Every decision logged immutably</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Concepts */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
            Three-Layer Security Architecture
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Separation of concerns ensures that compromising one layer doesn't compromise others
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <ConceptCard
              icon={Eye}
              title="Memory"
              description="Stores your preferences, brand choices, and shopping history. Cannot make decisions or take actions."
              badge="Storage Only"
              color="blue"
            />
            <ConceptCard
              icon={Zap}
              title="Reasoning"
              description="AI generates bundle recommendations based on your intent. Can only suggest—cannot authorize or execute."
              badge="Advisory Only"
              color="amber"
            />
            <ConceptCard
              icon={Lock}
              title="Authority"
              description="Server-side policy enforcement with passkey gates. Every action requires biometric consent."
              badge="Enforces Policy"
              color="green"
            />
          </div>
        </div>
      </section>

      {/* Trust Features */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
              Built for Trust & Transparency
            </h2>
            <p className="text-center text-muted-foreground mb-12">
              Security should be simple for users, honest about its limits, and put people first
            </p>
            
            <div className="space-y-4">
              <TrustItem 
                text="Passkey authentication for all agent actions" 
                detail="Uses your device's fingerprint sensor or Windows Hello"
              />
              <TrustItem 
                text="Complete audit trail of every decision" 
                detail="Policy snapshots captured at decision time"
              />
              <TrustItem 
                text="Budget limits enforced server-side in CAD" 
                detail="Cannot be bypassed by client-side code, all spending tracked in Canadian dollars"
              />
              <TrustItem 
                text="Category restrictions prevent scope creep" 
                detail="Agent can only shop in categories you allow"
              />
              <TrustItem 
                text="Checkout requires explicit user click" 
                detail="No autonomous purchases, ever"
              />
              <TrustItem 
                text="Phishing-proof authentication" 
                detail="WebAuthn origin binding prevents credential theft"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to see it in action?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Experience passkey-protected, consent-bound AI shopping assistance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/setup">
              <Button size="lg">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/demo-script">
              <Button size="lg" variant="outline">
                View Demo Script
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <span className="font-semibold">Me-Agent</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Secure, Identity-Bound AI Shopping Agent
            </p>
            <div className="flex items-center gap-4">
              <Link to="/security" className="text-sm text-muted-foreground hover:text-foreground">
                Security
              </Link>
              <Link to="/audit" className="text-sm text-muted-foreground hover:text-foreground">
                Audit Log
              </Link>
              <Link to="/demo-script" className="text-sm text-muted-foreground hover:text-foreground">
                Demo Script
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ConceptCard({ 
  icon: Icon, 
  title, 
  description,
  badge,
  color,
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
  badge: string;
  color: 'blue' | 'amber' | 'green';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    green: 'bg-verified/10 text-verified border-verified/30',
  };

  return (
    <div className="text-center p-6 rounded-xl bg-card border">
      <div className={`h-12 w-12 rounded-full ${colorClasses[color].split(' ')[0]} flex items-center justify-center mx-auto mb-4`}>
        <Icon className={`h-6 w-6 ${colorClasses[color].split(' ')[1]}`} />
      </div>
      <Badge variant="outline" className={`mb-3 ${colorClasses[color]}`}>{badge}</Badge>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function TrustItem({ text, detail }: { text: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-card border">
      <CheckCircle className="h-5 w-5 text-verified shrink-0 mt-0.5" />
      <div>
        <span className="text-sm font-medium">{text}</span>
        <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
      </div>
    </div>
  );
}
