import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight, CheckCircle, Lock, Eye, Zap } from 'lucide-react';

export default function LandingPage() {
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
            <Link to="/demo">
              <Button>
                Launch Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-verified/10 text-verified text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            Secure by Design
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
            A Secure Identity-Bound
            <br />
            <span className="text-primary">AI Agent</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Separating Memory, Reasoning, and Authority. Consent-bound actions, 
            fully auditable, with no autonomous purchases.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/demo">
              <Button size="lg" className="w-full sm:w-auto">
                Launch Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/audit">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                View Audit Log
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Core Concepts */}
      <section className="py-20 border-t">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <ConceptCard
              icon={Eye}
              title="Memory"
              description="Stores your preferences, brand choices, and shopping history. Separated from decision-making."
            />
            <ConceptCard
              icon={Zap}
              title="Reasoning"
              description="Generates bundle recommendations based on your constraints. Cannot act without consent."
            />
            <ConceptCard
              icon={Lock}
              title="Authority"
              description="All actions require explicit user approval. No autonomous purchases. Ever."
            />
          </div>
        </div>
      </section>

      {/* Trust Features */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Built for Trust
            </h2>
            
            <div className="space-y-4">
              <TrustItem text="Passkey authentication for all agent actions" />
              <TrustItem text="Complete audit trail of every decision" />
              <TrustItem text="Budget limits enforced at permission level" />
              <TrustItem text="Category restrictions prevent scope creep" />
              <TrustItem text="Checkout requires explicit user click" />
              <TrustItem text="Real-time explanations of agent reasoning" />
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
            Try the demo to experience consent-bound AI shopping assistance.
          </p>
          <Link to="/demo">
            <Button size="lg">
              Launch Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
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
              Hackathon Demo • Secure Identity-Bound AI Agent
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ConceptCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) {
  return (
    <div className="text-center p-6 rounded-xl bg-card border">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function TrustItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-card border">
      <CheckCircle className="h-5 w-5 text-verified shrink-0" />
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
