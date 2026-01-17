import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PermissionChip } from '@/components/shared/PermissionChip';
import { Shield, Sparkles, RotateCcw, X, Plus, AlertCircle, Loader2, Save } from 'lucide-react';
import type { IntentForm } from '@/types';
import { AVAILABLE_CATEGORIES } from '@/types';
import { getPolicy, updatePolicy, type AgentPolicy } from '@/lib/backendApi';

interface IntentFormProps {
  form: IntentForm;
  onChange: (form: IntentForm) => void;
  onGenerate: () => void;
  onReset: () => void;
  isGenerating: boolean;
}

export function IntentFormPanel({
  form,
  onChange,
  onGenerate,
  onReset,
  isGenerating,
}: IntentFormProps) {
  const [brandInput, setBrandInput] = useState('');
  const [policy, setPolicy] = useState<AgentPolicy | null>(null);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(true);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  // Load current policy from backend
  useEffect(() => {
    const loadPolicy = async () => {
      try {
        const data = await getPolicy();
        setPolicy(data.policy);
        // Sync form with policy
        onChange({
          ...form,
          maxSpend: data.policy.maxSpend,
          allowedCategories: data.policy.allowedCategories,
          agentEnabled: data.policy.agentEnabled,
        });
      } catch (e) {
        console.error('Failed to load policy:', e);
      } finally {
        setIsLoadingPolicy(false);
      }
    };
    
    loadPolicy();
  }, []);

  // Save policy to backend when it changes
  const handlePolicyChange = async (updates: Partial<AgentPolicy>) => {
    if (!policy) return;
    
    const newPolicy = { ...policy, ...updates };
    setPolicy(newPolicy);
    
    // Sync form with policy
    onChange({
      ...form,
      maxSpend: newPolicy.maxSpend,
      allowedCategories: newPolicy.allowedCategories,
      agentEnabled: newPolicy.agentEnabled,
    });
    
    setIsSavingPolicy(true);
    try {
      await updatePolicy(updates);
    } catch (e) {
      console.error('Failed to save policy:', e);
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const updateField = <K extends keyof IntentForm>(key: K, value: IntentForm[K]) => {
    onChange({ ...form, [key]: value });
  };

  const toggleCategory = (category: string) => {
    const current = form.allowedCategories;
    if (current.includes(category)) {
      updateField('allowedCategories', current.filter(c => c !== category));
    } else {
      updateField('allowedCategories', [...current, category]);
    }
  };

  const addBrand = () => {
    const trimmed = brandInput.trim();
    if (trimmed && !form.brandPreferences.includes(trimmed)) {
      updateField('brandPreferences', [...form.brandPreferences, trimmed]);
      setBrandInput('');
    }
  };

  const removeBrand = (brand: string) => {
    updateField('brandPreferences', form.brandPreferences.filter(b => b !== brand));
  };

  const isValid = form.maxSpend > 0 && form.allowedCategories.length > 0 && form.agentEnabled;
  const canGenerate = isValid && !isGenerating;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Intent + Constraints
        </CardTitle>
        <CardDescription>
          Tell the agent what you're looking for and set your boundaries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Shopping Intent */}
        <div className="space-y-2">
          <Label htmlFor="intent">What do you want to buy?</Label>
          <Textarea
            id="intent"
            placeholder="e.g., I need to set up a home office with ergonomic equipment..."
            value={form.shoppingIntent}
            onChange={(e) => updateField('shoppingIntent', e.target.value)}
            rows={3}
          />
        </div>

        {/* Budget */}
        <div className="space-y-2">
          <Label htmlFor="budget">
            Maximum Spend
            <span className="text-muted-foreground font-normal ml-2">(USD)</span>
            {isSavingPolicy && <Loader2 className="h-3 w-3 animate-spin inline ml-2" />}
          </Label>
          {isLoadingPolicy ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading policy...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">$</span>
              <Input
                id="budget"
                type="number"
                min={1}
                max={10000}
                value={policy?.maxSpend ?? 0}
                onChange={(e) => handlePolicyChange({ maxSpend: Math.max(0, Number(e.target.value)) })}
                className="w-32"
              />
            </div>
          )}
        </div>

        {/* Allowed Categories */}
        <div className="space-y-2">
          <Label>
            Allowed Categories
            {isSavingPolicy && <Loader2 className="h-3 w-3 animate-spin inline ml-2" />}
          </Label>
          {isLoadingPolicy ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_CATEGORIES.map(category => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    const current = policy?.allowedCategories || [];
                    const newCategories = current.includes(category)
                      ? current.filter(c => c !== category)
                      : [...current, category];
                    handlePolicyChange({ allowedCategories: newCategories });
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                    policy?.allowedCategories.includes(category)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
          {policy?.allowedCategories.length === 0 && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Select at least one category
            </p>
          )}
        </div>

        {/* Brand Preferences */}
        <div className="space-y-2">
          <Label>Brand Preferences (optional)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a brand..."
              value={brandInput}
              onChange={(e) => setBrandInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBrand())}
            />
            <Button type="button" variant="outline" size="icon" onClick={addBrand}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {form.brandPreferences.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {form.brandPreferences.map(brand => (
                <Badge key={brand} variant="secondary" className="gap-1">
                  {brand}
                  <button
                    type="button"
                    onClick={() => removeBrand(brand)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Price Sensitivity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Price Sensitivity</Label>
            <span className="text-sm text-muted-foreground">
              {form.priceSensitivity === 1 && 'Lowest prices'}
              {form.priceSensitivity === 2 && 'Budget-friendly'}
              {form.priceSensitivity === 3 && 'Balanced'}
              {form.priceSensitivity === 4 && 'Quality over price'}
              {form.priceSensitivity === 5 && 'Premium only'}
            </span>
          </div>
          <Slider
            value={[form.priceSensitivity]}
            onValueChange={([v]) => updateField('priceSensitivity', v)}
            min={1}
            max={5}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Budget</span>
            <span>Premium</span>
          </div>
        </div>

        {/* Agent Enabled Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
          <div className="space-y-0.5">
            <Label htmlFor="agent-toggle" className="cursor-pointer">Agent Enabled</Label>
            <p className="text-xs text-muted-foreground">
              Allow Me-Agent to generate recommendations
            </p>
          </div>
          <Switch
            id="agent-toggle"
            checked={policy?.agentEnabled ?? false}
            onCheckedChange={(checked) => handlePolicyChange({ agentEnabled: checked })}
            disabled={isLoadingPolicy}
          />
        </div>

        {/* Active Permissions Summary */}
        <div className="flex flex-wrap gap-2">
          {policy && (
            <>
              <PermissionChip label={`$${policy.maxSpend} max`} active />
              <PermissionChip label={`${policy.allowedCategories.length} categories`} active={policy.allowedCategories.length > 0} />
              <PermissionChip label="Agent" active={policy.agentEnabled} />
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="flex-1"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Shopping Bundle'}
          </Button>
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Security Notice */}
        {!policy?.agentEnabled ? (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
            <p className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-4 w-4" />
              Agent is disabled. Enable above to generate bundles.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-verified" />
              The agent can recommend and prepare a cart, but cannot purchase. You approve checkout.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
