/**
 * ThreatMitigationTable - Shows attack vectors and how Me-Agent defends against them
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Shield, AlertTriangle } from 'lucide-react';

interface ThreatMitigation {
  threat: string;
  description: string;
  mitigation: string;
  layer: 'Passkey' | 'Authority' | 'Audit' | 'Architecture';
  coverage: number;
}

const THREATS: ThreatMitigation[] = [
  {
    threat: 'Phishing Attack',
    description: 'Attacker creates fake login page to steal credentials',
    mitigation: 'WebAuthn origin verification prevents credential use on wrong domains',
    layer: 'Passkey',
    coverage: 100,
  },
  {
    threat: 'Credential Stuffing',
    description: 'Attacker uses leaked passwords from other breaches',
    mitigation: 'No passwords exist - passkeys are unique per service and cannot be reused',
    layer: 'Passkey',
    coverage: 100,
  },
  {
    threat: 'Man-in-the-Middle',
    description: 'Attacker intercepts authentication data in transit',
    mitigation: 'Private key never transmitted - only cryptographic signatures sent',
    layer: 'Passkey',
    coverage: 100,
  },
  {
    threat: 'Brute Force Attack',
    description: 'Attacker tries many password combinations',
    mitigation: 'No password to guess - 256-bit cryptographic keys are computationally infeasible',
    layer: 'Passkey',
    coverage: 100,
  },
  {
    threat: 'Session Hijacking',
    description: 'Attacker steals session token to make purchases',
    mitigation: 'Biometric consent required for EACH action - stolen session cannot authorize',
    layer: 'Authority',
    coverage: 100,
  },
  {
    threat: 'Budget Abuse',
    description: 'Attacker or rogue agent exceeds spending limits',
    mitigation: 'Server-side policy enforcement blocks transactions over maxSpend',
    layer: 'Authority',
    coverage: 100,
  },
  {
    threat: 'Category Bypass',
    description: 'Agent purchases items from unauthorized categories',
    mitigation: 'Category allowlist enforced server-side before any action proceeds',
    layer: 'Authority',
    coverage: 100,
  },
  {
    threat: 'Autonomous Purchases',
    description: 'AI agent makes purchases without user knowledge',
    mitigation: 'requireConfirm policy + passkey consent = no silent transactions',
    layer: 'Authority',
    coverage: 100,
  },
  {
    threat: 'Audit Trail Tampering',
    description: 'Attacker tries to hide their actions',
    mitigation: 'Server-side immutable logs with policy snapshots captured at decision time',
    layer: 'Audit',
    coverage: 100,
  },
  {
    threat: 'Rogue AI Recommendations',
    description: 'Compromised AI suggests harmful purchases',
    mitigation: 'Reasoning layer is isolated - cannot bypass Authority even if compromised',
    layer: 'Architecture',
    coverage: 100,
  },
  {
    threat: 'Memory Layer Breach',
    description: 'Attacker accesses user preferences and history',
    mitigation: 'Memory is informational only - cannot authorize actions, limiting impact',
    layer: 'Architecture',
    coverage: 95,
  },
  {
    threat: 'Server Database Breach',
    description: 'Attacker steals entire user database',
    mitigation: 'Only public keys stored - completely useless without user\'s device + biometric',
    layer: 'Passkey',
    coverage: 100,
  },
];

const LAYER_COLORS: Record<string, string> = {
  'Passkey': 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  'Authority': 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  'Audit': 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  'Architecture': 'bg-green-500/10 text-green-600 border-green-500/30',
};

export function ThreatMitigationTable() {
  const avgCoverage = Math.round(
    THREATS.reduce((sum, t) => sum + t.coverage, 0) / THREATS.length
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Threat Model & Mitigations
            </CardTitle>
            <CardDescription className="mt-1">
              How Me-Agent defends against common attack vectors
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-verified">{avgCoverage}%</div>
            <div className="text-xs text-muted-foreground">Avg Coverage</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Layer Legend */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(LAYER_COLORS).map(([layer, colors]) => (
            <Badge key={layer} variant="outline" className={colors}>
              {layer}
            </Badge>
          ))}
        </div>

        {/* Threats Table */}
        <div className="space-y-3">
          {THREATS.map((threat) => (
            <div 
              key={threat.threat}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{threat.threat}</h4>
                    <Badge variant="outline" className={LAYER_COLORS[threat.layer]}>
                      {threat.layer}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{threat.description}</p>
                </div>
                <Badge 
                  variant="outline" 
                  className={
                    threat.coverage === 100 
                      ? 'border-verified text-verified bg-verified/5' 
                      : 'border-yellow-500 text-yellow-600 bg-yellow-500/5'
                  }
                >
                  {threat.coverage}%
                </Badge>
              </div>
              
              <div className="flex items-start gap-2 mt-3 pt-3 border-t">
                <CheckCircle className="h-4 w-4 text-verified flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{threat.mitigation}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">What's Not Covered</p>
              <p className="text-sm text-muted-foreground mt-1">
                We assume secure infrastructure (HTTPS, encrypted storage) and don't protect 
                against physical device theft with unlocked biometrics. These are standard 
                assumptions for application-layer security.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
