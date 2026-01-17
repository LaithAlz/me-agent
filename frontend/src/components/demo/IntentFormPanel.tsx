import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PermissionChip } from '@/components/shared/PermissionChip';
import { Shield, Sparkles, RotateCcw, X, Plus, AlertCircle } from 'lucide-react';
import type { IntentForm } from '@/types';
import { AVAILABLE_CATEGORIES } from '@/types';

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

  const isValid = form.maxSpend > 0 && form.allowedCategories.length > 0;
  const canGenerate = isValid && form.agentEnabled && !isGenerating;

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
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">$</span>
            <Input
              id="budget"
              type="number"
              min={1}
              value={form.maxSpend}
              onChange={(e) => updateField('maxSpend', Math.max(0, Number(e.target.value)))}
              className="w-28"
            />
          </div>
          {form.maxSpend <= 0 && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Budget must be greater than 0
            </p>
          )}
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
                  form.allowedCategories.includes(category)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          {form.allowedCategories.length === 0 && (
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
            checked={form.agentEnabled}
            onCheckedChange={(checked) => updateField('agentEnabled', checked)}
          />
        </div>

        {/* Active Permissions Summary */}
        <div className="flex flex-wrap gap-2">
          <PermissionChip label={`$${form.maxSpend} max`} active />
          <PermissionChip label={`${form.allowedCategories.length} categories`} active={form.allowedCategories.length > 0} />
          <PermissionChip label="Agent" active={form.agentEnabled} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Shopping Bundle'}
          </Button>
          <Button variant="secondary" onClick={onReset} className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to default settings
          </Button>
        </div>

        {/* Security Notice */}
        {!form.agentEnabled ? (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
            <p className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-4 w-4" />
              Agent is disabled. Enable to generate bundles.
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
