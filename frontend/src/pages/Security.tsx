/**
 * Security Page - Comprehensive security architecture showcase
 * This is the KEY page for judges to understand the security model
 */
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  ArrowRight, 
  Lock, 
  Eye, 
  Zap, 
  Fingerprint,
  Layers,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { SecurityAuditDashboard } from '@/components/SecurityAuditDashboard';
import { PasskeyShowcase } from '@/components/PasskeyShowcase';
import { ThreatMitigationTable } from '@/components/ThreatMitigationTable';

export default function SecurityPage() {
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
            </Link>
            <nav className="flex items-center gap-4">
              <Link to="/demo">
                <Button variant="ghost" size="sm">Demo</Button>
              </Link>
              <Link to="/audit">
                <Button variant="ghost" size="sm">Audit Log</Button>
              </Link>
              <Link to="/demo">
                <Button size="sm">
                  Try It
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Security Architecture
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight">
              How Me-Agent Keeps You Secure
            </h1>
            <p className="text-lg text-muted-foreground">
              Defense-in-depth security with passkey authentication, 
              zero-trust authority, and complete audit transparency.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="passkeys" className="gap-2">
              <Fingerprint className="h-4 w-4" />
              <span className="hidden sm:inline">Passkeys</span>
            </TabsTrigger>
            <TabsTrigger value="architecture" className="gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Architecture</span>
            </TabsTrigger>
            <TabsTrigger value="threats" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Threats</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            <SecurityAuditDashboard />
          </TabsContent>

          {/* Passkeys Tab */}
          <TabsContent value="passkeys" className="space-y-8">
            <PasskeyShowcase />
          </TabsContent>

          {/* Architecture Tab */}
          <TabsContent value="architecture" className="space-y-8">
            <ArchitectureDeepDive />
          </TabsContent>

          {/* Threats Tab */}
          <TabsContent value="threats" className="space-y-8">
            <ThreatMitigationTable />
          </TabsContent>
        </Tabs>
      </main>

      {/* CTA */}
      <section className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">
            See Security in Action
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Try the demo to experience passkey authentication and the authority layer.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/demo">
              <Button size="lg">
                Launch Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/audit">
              <Button size="lg" variant="outline">
                View Audit Log
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Architecture Deep Dive Component
 */
function ArchitectureDeepDive() {
  return (
    <div className="space-y-8">
      {/* Overview Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Three-Layer Security Architecture</CardTitle>
          <CardDescription>
            Separation of concerns ensures that compromising one layer doesn't compromise others
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Memory Layer */}
            <div className="relative">
              <Card className="h-full border-2 border-blue-500/30 bg-blue-500/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Eye className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Memory Layer</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">Storage Only</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <p className="text-muted-foreground">
                    Stores user preferences and history. <strong>Cannot make decisions.</strong>
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-blue-500 mt-0.5" />
                      <span className="text-xs">Shopping preferences</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-blue-500 mt-0.5" />
                      <span className="text-xs">Brand/merchant history</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-blue-500 mt-0.5" />
                      <span className="text-xs">Avatar & voice settings</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    <strong>If compromised:</strong> Attacker sees preferences but cannot act.
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reasoning Layer */}
            <div className="relative">
              <Card className="h-full border-2 border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Reasoning Layer</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">Suggest Only</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <p className="text-muted-foreground">
                    AI generates recommendations. <strong>Cannot execute actions.</strong>
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5" />
                      <span className="text-xs">Analyze shopping intent</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5" />
                      <span className="text-xs">Generate product bundles</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5" />
                      <span className="text-xs">Explain recommendations</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    <strong>If compromised:</strong> Bad suggestions get blocked by Authority.
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Authority Layer */}
            <div className="relative">
              <Card className="h-full border-2 border-verified/30 bg-verified/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-verified/10 flex items-center justify-center">
                      <Lock className="h-5 w-5 text-verified" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Authority Layer</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1 border-verified text-verified">Enforces</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <p className="text-muted-foreground">
                    Server-side policy enforcement. <strong>Cannot be bypassed.</strong>
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-verified mt-0.5" />
                      <span className="text-xs">Passkey required per action</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-verified mt-0.5" />
                      <span className="text-xs">Budget & category limits</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-verified mt-0.5" />
                      <span className="text-xs">Immutable audit logging</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    <strong>If compromised:</strong> Game over—but it runs server-side with passkey gates.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Request Flow: From Intent to Action</CardTitle>
          <CardDescription>
            Every action goes through multiple security checkpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                step: 1,
                title: 'User Expresses Intent',
                description: 'User describes what they want to buy and sets constraints (budget, categories)',
                security: 'Input sanitized and validated',
              },
              {
                step: 2,
                title: 'Passkey Consent Required',
                description: 'Before any AI processing, user must authenticate with biometric (fingerprint/face)',
                security: 'WebAuthn challenge-response, hardware-backed',
              },
              {
                step: 3,
                title: 'Authority Pre-Check',
                description: 'Server verifies action is allowed by user policy BEFORE generating bundle',
                security: 'Server-side enforcement, cannot be bypassed',
              },
              {
                step: 4,
                title: 'AI Generates Recommendations',
                description: 'Reasoning layer creates product bundle based on intent and preferences',
                security: 'Output is advisory only, has no authority',
              },
              {
                step: 5,
                title: 'Authority Post-Check',
                description: 'Server verifies bundle total and categories against policy',
                security: 'Items violating policy are blocked',
              },
              {
                step: 6,
                title: 'Manual Checkout Required',
                description: 'User must explicitly click checkout—no autonomous purchases',
                security: 'requireConfirm policy + UI gate',
              },
              {
                step: 7,
                title: 'Audit Event Created',
                description: 'Immutable log entry with policy snapshot, decision, and reasoning',
                security: 'Server-side, tamper-resistant',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 items-start">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {item.step}
                </div>
                <div className="flex-1 pb-4 border-b last:border-0">
                  <h4 className="font-semibold text-sm">{item.title}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                  <Badge variant="outline" className="mt-2 text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    {item.security}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Principles */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Zero Trust</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              We don't trust any layer implicitly. Even if the AI is compromised, the Authority 
              layer blocks unauthorized actions. Even if a session is hijacked, biometric consent 
              is required for each action.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Least Privilege</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Each layer has minimal capabilities. Memory can't decide. Reasoning can't act. 
              Only Authority can permit actions, and only with explicit user consent via 
              cryptographic proof (passkey).
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Defense in Depth</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Multiple independent security layers. An attacker must compromise: the user's 
              biometric + device + TPM + server-side authority + audit system. Each is a 
              separate barrier.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transparency</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Users see everything: their current policy, every decision made, the reasoning 
              behind blocks, and complete audit history. No hidden actions, no silent failures.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
