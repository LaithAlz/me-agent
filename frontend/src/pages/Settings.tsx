import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PermissionChip } from '@/components/shared/PermissionChip';
import { Settings, Shield, AlertTriangle, Save, Check } from 'lucide-react';
import { loadPermissionPolicy, savePermissionPolicy } from '@/lib/storage';
import { AVAILABLE_CATEGORIES, type PermissionPolicy } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const [policy, setPolicy] = useState<PermissionPolicy>(() => loadPermissionPolicy());
  const [saved, setSaved] = useState(false);

  const updatePolicy = <K extends keyof PermissionPolicy>(key: K, value: PermissionPolicy[K]) => {
    setPolicy(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const toggleCategory = (category: string) => {
    const current = policy.allowedCategories;
    if (current.includes(category)) {
      updatePolicy('allowedCategories', current.filter(c => c !== category));
    } else {
      updatePolicy('allowedCategories', [...current, category]);
    }
  };

  const handleSave = () => {
    savePermissionPolicy(policy);
    setSaved(true);
    toast({
      title: 'Settings saved',
      description: 'Your permission policy has been updated',
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your Me-Agent permissions and preferences
          </p>
        </div>

        {/* Permission Policy Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permission Policy
            </CardTitle>
            <CardDescription>
              Set the boundaries for what the agent can do
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Max Spend */}
            <div className="space-y-2">
              <Label htmlFor="maxSpend">Maximum Spend (CAD)</Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">$</span>
                <Input
                  id="maxSpend"
                  type="number"
                  min={1}
                  value={policy.maxSpend}
                  onChange={(e) => updatePolicy('maxSpend', Math.max(0, Number(e.target.value)))}
                  className="w-32"
                />
                <span className="text-muted-foreground">CAD</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Agent cannot recommend items exceeding this total
              </p>
            </div>

            {/* Allowed Categories */}
            <div className="space-y-2">
              <Label>Allowed Categories</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_CATEGORIES.map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                      policy.allowedCategories.includes(category)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Agent can only recommend products from these categories
              </p>
            </div>

            {/* Agent Enabled */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div className="space-y-0.5">
                <Label htmlFor="agentEnabled" className="cursor-pointer">Agent Enabled</Label>
                <p className="text-xs text-muted-foreground">
                  Allow Me-Agent to generate recommendations
                </p>
              </div>
              <Switch
                id="agentEnabled"
                checked={policy.agentEnabled}
                onCheckedChange={(checked) => updatePolicy('agentEnabled', checked)}
              />
            </div>

            {!policy.agentEnabled && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
                <p className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  Agent is disabled. Enable to use bundle generation.
                </p>
              </div>
            )}

            {/* Merchant ID */}
            <div className="space-y-2">
              <Label htmlFor="merchantId">Merchant ID (optional)</Label>
              <Input
                id="merchantId"
                placeholder="e.g., shop_abc123"
                value={policy.merchantId || ''}
                onChange={(e) => updatePolicy('merchantId', e.target.value || undefined)}
              />
              <p className="text-xs text-muted-foreground">
                Restrict to a specific merchant's products
              </p>
            </div>

            {/* Save Button */}
            <Button onClick={handleSave} className="w-full gap-2">
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Policy Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Policy Summary</CardTitle>
            <CardDescription>
              Current active constraints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <PermissionChip label={`$${policy.maxSpend} max`} active />
              <PermissionChip 
                label={`${policy.allowedCategories.length} categories`} 
                active={policy.allowedCategories.length > 0} 
              />
              <PermissionChip label="Agent" active={policy.agentEnabled} />
              {policy.merchantId && (
                <PermissionChip label={`Merchant: ${policy.merchantId}`} active />
              )}
            </div>

            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Allowed Categories:</h4>
              {policy.allowedCategories.length > 0 ? (
                <p className="text-sm text-muted-foreground capitalize">
                  {policy.allowedCategories.join(', ')}
                </p>
              ) : (
                <p className="text-sm text-destructive">
                  No categories selected - agent cannot generate bundles
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
