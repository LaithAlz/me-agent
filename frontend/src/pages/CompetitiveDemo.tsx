/**
 * Competitive Demo Page - Guided walkthrough for judges
 * This page helps you present the demo in a structured way
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  ArrowRight, 
  ArrowLeft,
  Play, 
  CheckCircle,
  Fingerprint,
  Lock,
  FileText,
  Eye,
  Zap,
  ExternalLink,
} from 'lucide-react';

interface DemoStep {
  id: number;
  title: string;
  value: string;
  description: string;
  action: string;
  navigateTo?: string;
  highlight: string;
  talkingPoints: string[];
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: 1,
    title: 'Keep it Simple',
    value: '1Password Value #1',
    description: 'Show that authentication is effortless - just a fingerprint tap.',
    action: 'Go to Demo page → Click "Generate Bundle" → Show passkey prompt with fingerprint',
    navigateTo: '/demo',
    highlight: 'Passkey Consent Modal',
    talkingPoints: [
      'No password to remember or type',
      'Single biometric tap authenticates',
      'Works with built-in laptop fingerprint sensor',
      'Same experience on phone with Face ID',
    ],
  },
  {
    id: 2,
    title: 'Lead with Honesty',
    value: '1Password Value #2',
    description: 'Demonstrate complete transparency in what the agent can and cannot do.',
    action: 'Open Authority Panel (side tab) → Show Policy settings → Navigate to Audit tab',
    navigateTo: '/demo',
    highlight: 'Authority Panel',
    talkingPoints: [
      'Users set explicit limits (max spend, categories)',
      'Every decision is logged with full reasoning',
      'Policy snapshot captured at decision time',
      'No hidden actions - everything visible',
    ],
  },
  {
    id: 3,
    title: 'Put People First',
    value: '1Password Value #3',
    description: 'Show that users maintain complete control - no autonomous purchases.',
    action: 'Generate a bundle → Note "Add to Cart" requires click → Checkout requires manual action',
    navigateTo: '/demo',
    highlight: 'Manual Checkout Flow',
    talkingPoints: [
      'Agent suggests, user decides',
      'Every action requires explicit consent',
      'requireConfirm policy prevents auto-purchase',
      'User can reject any recommendation',
    ],
  },
  {
    id: 4,
    title: 'Policy Enforcement',
    value: 'Security Demo',
    description: 'Demonstrate the Authority layer blocking out-of-policy actions.',
    action: 'Set maxSpend to $50 → Generate bundle with expensive items → Watch block decision',
    navigateTo: '/demo',
    highlight: 'Authority Block',
    talkingPoints: [
      'Server-side enforcement - cannot be bypassed',
      'Blocked actions logged with reason',
      'User sees exactly why action was denied',
      'Policy can be adjusted anytime',
    ],
  },
  {
    id: 5,
    title: 'Passkey Deep Dive',
    value: 'Technical Demo',
    description: 'Explain why passkeys are superior to passwords for judges.',
    action: 'Navigate to /security → Passkeys tab → Walk through comparison',
    navigateTo: '/security',
    highlight: 'Passkey vs Password Comparison',
    talkingPoints: [
      'Phishing impossible - cryptographic origin binding',
      'Private key never leaves device (TPM/Secure Enclave)',
      'No password = nothing to steal or leak',
      'Hardware-backed biometric authentication',
    ],
  },
  {
    id: 6,
    title: 'Architecture Overview',
    value: 'Technical Demo',
    description: 'Show the three-layer security model and why it matters.',
    action: 'Navigate to /security → Architecture tab → Explain Memory/Reasoning/Authority',
    navigateTo: '/security',
    highlight: 'Three-Layer Architecture',
    talkingPoints: [
      'Memory: stores preferences, cannot act',
      'Reasoning: suggests products, cannot authorize',
      'Authority: enforces policy, requires passkey',
      'Compromise one layer ≠ compromise system',
    ],
  },
  {
    id: 7,
    title: 'Audit Trail',
    value: 'Transparency Demo',
    description: 'Show complete audit history with policy snapshots.',
    action: 'Navigate to /audit → Show logged events → Click on event to see details',
    navigateTo: '/audit',
    highlight: 'Audit Log',
    talkingPoints: [
      'Every decision logged immutably',
      'Policy state captured at decision time',
      'Users can verify any past action',
      'Supports compliance and accountability',
    ],
  },
  {
    id: 8,
    title: 'Threat Mitigations',
    value: 'Security Demo',
    description: 'Walk through how we defend against common attacks.',
    action: 'Navigate to /security → Threats tab → Highlight key mitigations',
    navigateTo: '/security',
    highlight: 'Threat Model Table',
    talkingPoints: [
      'Phishing: WebAuthn origin binding',
      'Session hijacking: per-action biometric',
      'Rogue AI: Authority layer blocks bad suggestions',
      'Database breach: only public keys stored',
    ],
  },
];

export default function CompetitiveDemoPage() {
  const [currentStep, setCurrentStep] = useState(0);

  const step = DEMO_STEPS[currentStep];
  const progress = ((currentStep + 1) / DEMO_STEPS.length) * 100;

  const goToStep = (index: number) => {
    if (index >= 0 && index < DEMO_STEPS.length) {
      setCurrentStep(index);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">Me-Agent</span>
              <Badge variant="secondary">Demo Script</Badge>
            </Link>
            <nav className="flex items-center gap-2">
              <Link to="/demo">
                <Button variant="outline" size="sm">Exit to Demo</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Step {currentStep + 1} of {DEMO_STEPS.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step Dots */}
          <div className="flex justify-between mt-3">
            {DEMO_STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goToStep(i)}
                className={`h-2 w-2 rounded-full transition-all ${
                  i === currentStep 
                    ? 'bg-primary scale-125' 
                    : i < currentStep 
                      ? 'bg-verified' 
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Current Step Card */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="mb-2">{step.value}</Badge>
                  <CardTitle className="text-2xl">{step.title}</CardTitle>
                  <p className="text-muted-foreground mt-2">{step.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{step.id}</div>
                  <div className="text-xs text-muted-foreground">of {DEMO_STEPS.length}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Action Box */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Play className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm mb-1">Action</p>
                    <p className="text-sm">{step.action}</p>
                  </div>
                </div>
              </div>

              {/* Highlight */}
              <div className="flex items-center gap-2">
                <Badge variant="outline">{step.highlight}</Badge>
                {step.navigateTo && (
                  <Link to={step.navigateTo}>
                    <Button variant="link" size="sm" className="gap-1 h-auto p-0">
                      Open Page
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>

              {/* Talking Points */}
              <div className="space-y-2">
                <p className="font-semibold text-sm">Key Talking Points:</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {step.talkingPoints.map((point, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-verified flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => goToStep(currentStep - 1)}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            {step.navigateTo && (
              <Link to={step.navigateTo}>
                <Button variant="secondary" className="gap-2">
                  Open {step.navigateTo}
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            )}

            <Button
              onClick={() => goToStep(currentStep + 1)}
              disabled={currentStep === DEMO_STEPS.length - 1}
              className="gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Reference */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">Quick Reference: All Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {DEMO_STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => goToStep(i)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      i === currentStep 
                        ? 'border-primary bg-primary/5' 
                        : 'border-transparent hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${
                        i === currentStep ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {s.id}.
                      </span>
                      <span className="text-sm font-medium truncate">{s.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.value}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Why We Win */}
          <Card className="border-2 border-verified/30 bg-gradient-to-br from-verified/5 to-verified/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-verified" />
                Why Me-Agent Wins This Challenge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Fingerprint className="h-5 w-5 text-verified flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Passkey-First</p>
                    <p className="text-xs text-muted-foreground">
                      Not just password alternative—it's the only auth method
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-verified flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Transparent Authority</p>
                    <p className="text-xs text-muted-foreground">
                      Users see exactly what agent can do
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-verified flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Zero-Trust Design</p>
                    <p className="text-xs text-muted-foreground">
                      Every action requires consent + authentication
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-verified flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Auditable</p>
                    <p className="text-xs text-muted-foreground">
                      Immutable decision logs with policy snapshots
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-verified flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Simple UX</p>
                    <p className="text-xs text-muted-foreground">
                      Biometric tap + intuitive policies
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-verified flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Defense-in-Depth</p>
                    <p className="text-xs text-muted-foreground">
                      3-layer separation of concerns
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
