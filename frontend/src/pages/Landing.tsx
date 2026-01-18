import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight, CheckCircle, Lock, Eye, Zap, Crown } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">  {/* <-- Added subtle gradient to the whole page */}
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm shadow-sm">  {/* <-- Added glassmorphism effect */}
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                  <Crown className="h-5 w-5 text-primary-foreground" />
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

      <section className="pt-0 pb-20 relative bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white">  {/* <-- Added modern gradient background */}
        <div className="absolute inset-0 bg-black/20"></div>  {/* <-- Overlay for better text contrast */}
        <div>
          <img
            src="/shopping.png"
            alt=""
            className="mx-auto animate-pulse [animation-duration:4s]"
          />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">  {/* <-- Added relative z-10 for text layering */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium mb-6 backdrop-blur-sm">
            <Shield className="h-4 w-4" />
            Secure by Design
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg leading-tight">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-yellow-300 to-green-400 bg-clip-text text-transparent">
              Me-Agent
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 drop-shadow-md">  {/* <-- Added opacity and shadow */}
            Your AI-powered shopping assistant
          </p>          
          <p className="text-xl max-w-2xl mx-auto opacity-80 mb-10">
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
              <Button className="bg-white text-purple-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">  {/* <-- Enhanced button with shadow and transition */}
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
      <section className="py-20 bg-gray-200">
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
      <footer className="border-t py-8 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <span className="font-semibold">Me-Agent</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Secure, Identity-Bound AI Shopping Agent
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
    <div className="text-center p-6 rounded-xl bg-card border shadow-lg hover:shadow-xl transition-shadow duration-300">  {/* <-- Added shadow and hover effect */}
      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center mx-auto mb-4">  {/* <-- Gradient on icon bg */}
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function TrustItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-card border shadow-md hover:shadow-lg transition-shadow duration-300">  {/* <-- Added shadow and hover */}
      <CheckCircle className="h-5 w-5 text-verified shrink-0" />
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
