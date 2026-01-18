/**
 * AuthorityPanel - Collapsible sidebar for the Authority Layer
 * Shows policy settings, audit log, and security explainer with voice.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Shield, 
  ChevronRight, 
  ChevronLeft,
  Settings,
  FileText,
  Volume2,
  VolumeX,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Camera,
  User,
  RefreshCw,
  Fingerprint,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { AvatarUpload } from '@/components/AvatarUpload';
import { PasskeyRegistrationModal } from '@/components/PasskeyRegistrationModal';
import {
  getPolicy,
  updatePolicy,
  getAuditLog,
  synthesizeVoice,
  getSession,
  demoLogin,
  logout,
  checkBackendHealth,
  getAvatar,
  type AgentPolicy,
  type AuditEvent,
  type SessionInfo,
} from '@/lib/backendApi';

const AVAILABLE_CATEGORIES = [
  'office',
  'electronics',
  'clothing',
  'home',
  'sports',
  'books',
  'beauty',
  'food',
];

interface AuthorityPanelProps {
  className?: string;
}

export function AuthorityPanel({ className }: AuthorityPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('policy');
  const [isPasskeyModalOpen, setIsPasskeyModalOpen] = useState(false);
  
  // Backend connection state
  const [backendConnected, setBackendConnected] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  
  // Policy state
  const [policy, setPolicy] = useState<AgentPolicy>({
    maxSpend: 150,
    allowedCategories: ['office'],
    agentEnabled: true,
    requireConfirm: true,
  });
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  
  // Audit state
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  
  // Voice state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [lastExplanation, setLastExplanation] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Check backend connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const healthy = await checkBackendHealth();
      setBackendConnected(healthy);
      
      if (healthy) {
        try {
          const sessionData = await getSession();
          setSession(sessionData);
          
          // Load policy
          const policyData = await getPolicy();
          setPolicy(policyData.policy);
          
          // Load avatar
          const avatarData = await getAvatar();
          if (avatarData.hasAvatar && avatarData.avatarBase64) {
            setAvatarUrl(`data:image/jpeg;base64,${avatarData.avatarBase64}`);
          }
        } catch (e) {
          console.error('Failed to load initial data:', e);
        }
      }
    };
    
    checkConnection();
  }, []);
  
  // Load audit log when tab changes to audit
  useEffect(() => {
    if (activeTab === 'audit' && backendConnected) {
      loadAuditLog();
    }
  }, [activeTab, backendConnected]);
  
  const loadAuditLog = async () => {
    setIsLoadingAudit(true);
    try {
      const data = await getAuditLog(50);
      setAuditEvents(data.events);
      
      // Get last blocked event for explanation
      const lastBlocked = data.events.find(e => e.decision === 'BLOCK');
      if (lastBlocked) {
        setLastExplanation(lastBlocked.reason);
      }
    } catch (e) {
      console.error('Failed to load audit log:', e);
    } finally {
      setIsLoadingAudit(false);
    }
  };
  
  const handleLogin = async () => {
    try {
      await demoLogin();
      const sessionData = await getSession();
      setSession(sessionData);
      
      // Reload policy after login
      const policyData = await getPolicy();
      setPolicy(policyData.policy);
    } catch (e) {
      console.error('Login failed:', e);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      setSession({ authenticated: false, demoMode: true });
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };
  
  const handlePolicyChange = async (updates: Partial<AgentPolicy>) => {
    const newPolicy = { ...policy, ...updates };
    setPolicy(newPolicy);
    
    if (backendConnected) {
      setIsSavingPolicy(true);
      try {
        await updatePolicy(updates);
      } catch (e) {
        console.error('Failed to update policy:', e);
      } finally {
        setIsSavingPolicy(false);
      }
    }
  };
  
  const handleCategoryToggle = (category: string) => {
    const newCategories = policy.allowedCategories.includes(category)
      ? policy.allowedCategories.filter(c => c !== category)
      : [...policy.allowedCategories, category];
    
    handlePolicyChange({ allowedCategories: newCategories });
  };
  
  const handlePlayExplanation = async () => {
    if (!lastExplanation) return;
    
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    
    setIsLoadingVoice(true);
    try {
      const response = await synthesizeVoice(lastExplanation);
      
      if (response.success && response.audioBase64) {
        // Create audio from base64
        const audioSrc = `data:${response.contentType};base64,${response.audioBase64}`;
        
        if (audioRef.current) {
          audioRef.current.src = audioSrc;
          await audioRef.current.play();
          setIsPlaying(true);
          
          audioRef.current.onended = () => setIsPlaying(false);
        }
      } else if (response.mock) {
        // Mock mode - just show the text
        console.log('Mock voice:', response.text);
      }
    } catch (e) {
      console.error('Voice synthesis failed:', e);
    } finally {
      setIsLoadingVoice(false);
    }
  };
  
  return (
    <>
      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />
      
      {/* Toggle Button (visible when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed right-0 top-1/2 -translate-y-1/2 z-50',
            'bg-primary text-primary-foreground',
            'p-3 rounded-l-lg shadow-lg',
            'hover:bg-primary/90 transition-colors',
            'flex items-center gap-2'
          )}
        >
          <Shield className="h-5 w-5" />
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      
      {/* Overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full z-40',
          'bg-card border-l shadow-xl',
          'transition-transform duration-300 ease-in-out',
          'w-80 md:w-96 overflow-y-auto',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Authority Layer</h2>
            {backendConnected ? (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600">
                Offline
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Session Info */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden relative group cursor-pointer">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Avatar" 
                  className="h-full w-full object-cover"
                  style={{ filter: 'saturate(1.2) contrast(1.1)' }}
                />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
            </div>
            
            <div className="flex-1">
              {session?.authenticated ? (
                <>
                  <p className="text-sm font-medium">{session.username || 'User'}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.demoMode ? 'Demo Mode' : 'Authenticated'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not signed in</p>
              )}
            </div>
            
            {session?.authenticated ? (
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Sign out
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleLogin}>
                Demo Login
              </Button>
            )}
          </div>
          
          {/* Avatar Upload Button */}
          <div className="mt-3 pt-3 border-t space-y-2">
            <AvatarUpload 
              onAvatarGenerated={(base64) => setAvatarUrl(`data:image/jpeg;base64,${base64}`)}
              className="w-full"
            />
            
            {/* Register New Passkey Button */}
            {session?.authenticated && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => setIsPasskeyModalOpen(true)}
              >
                <Fingerprint className="h-4 w-4" />
                Register New Passkey
              </Button>
            )}
          </div>
          
          {/* Passkey Registration Modal */}
          {session?.authenticated && (
            <PasskeyRegistrationModal
              isOpen={isPasskeyModalOpen}
              onClose={() => setIsPasskeyModalOpen(false)}
              username={session.username || 'user'}
              onSuccess={() => {
                console.log('Passkey registered successfully!');
              }}
            />
          )}
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="w-full justify-start px-4 pt-2">
            <TabsTrigger value="policy" className="gap-1">
              <Settings className="h-4 w-4" />
              Policy
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1">
              <FileText className="h-4 w-4" />
              Audit
            </TabsTrigger>
            <TabsTrigger value="explainer" className="gap-1">
              <Volume2 className="h-4 w-4" />
              Explain
            </TabsTrigger>
          </TabsList>
          
          {/* Policy Tab */}
          <TabsContent value="policy" className="p-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  Agent Controls
                  {isSavingPolicy && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Agent Enabled */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="agent-enabled" className="text-sm">
                    Enable Agent
                  </Label>
                  <Switch
                    id="agent-enabled"
                    checked={policy.agentEnabled}
                    onCheckedChange={(checked) => handlePolicyChange({ agentEnabled: checked })}
                  />
                </div>
                
                {/* Require Confirmation */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="require-confirm" className="text-sm">
                    Require Checkout Confirmation
                  </Label>
                  <Switch
                    id="require-confirm"
                    checked={policy.requireConfirm}
                    onCheckedChange={(checked) => handlePolicyChange({ requireConfirm: checked })}
                  />
                </div>
                
                {/* Max Spend */}
                <div className="space-y-2">
                  <Label htmlFor="max-spend" className="text-sm">
                    Maximum Spend (CAD): ${policy.maxSpend}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="max-spend"
                      type="number"
                      min={0}
                      max={10000}
                      value={policy.maxSpend}
                      onChange={(e) => handlePolicyChange({ maxSpend: Number(e.target.value) })}
                    />
                    <span className="text-muted-foreground text-sm font-medium">CAD</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Allowed Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_CATEGORIES.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cat-${category}`}
                        checked={policy.allowedCategories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <Label htmlFor={`cat-${category}`} className="text-sm capitalize">
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Audit Tab */}
          <TabsContent value="audit" className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Recent Activity</h3>
              <Button variant="ghost" size="sm" onClick={loadAuditLog} disabled={isLoadingAudit}>
                <RefreshCw className={cn("h-4 w-4", isLoadingAudit && "animate-spin")} />
              </Button>
            </div>
            
            <ScrollArea className="h-[calc(100vh-320px)]">
              {isLoadingAudit ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : auditEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No audit events yet
                </p>
              ) : (
                <div className="space-y-2">
                  {auditEvents.map((event) => (
                    <Card key={event.id} className="p-3">
                      <div className="flex items-start gap-2">
                        {event.decision === 'ALLOW' ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">
                              {event.action}
                            </span>
                            <Badge 
                              variant={event.decision === 'ALLOW' ? 'default' : 'destructive'}
                              className="text-[10px] px-1 py-0"
                            >
                              {event.decision}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {event.reason}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(event.ts).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          {/* Explainer Tab */}
          <TabsContent value="explainer" className="p-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Security Explainer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Avatar Display */}
                <div className="flex justify-center">
                  <div 
                    className={cn(
                      "h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden",
                      isPlaying && "ring-4 ring-primary/30 animate-pulse"
                    )}
                  >
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="Your Avatar" 
                        className="h-full w-full object-cover"
                        style={{ filter: 'saturate(1.2) contrast(1.1)' }}
                      />
                    ) : (
                      <User className="h-12 w-12 text-primary" />
                    )}
                  </div>
                </div>
                
                {/* Latest Explanation */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm">
                    {lastExplanation || 'No security events to explain yet. Try generating a bundle to see the authority layer in action.'}
                  </p>
                </div>
                
                {/* Voice Controls */}
                <div className="flex items-center justify-center gap-2">
                  <Button
                    onClick={handlePlayExplanation}
                    disabled={!lastExplanation || isLoadingVoice}
                    className="gap-2"
                  >
                    {isLoadingVoice ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {isPlaying ? 'Pause' : 'Play Explanation'}
                  </Button>
                </div>
                
                {!backendConnected && (
                  <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-500/10 p-2 rounded">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Backend offline. Voice features unavailable.</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Policy Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Current Policy Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>
                  <strong>Agent:</strong> {policy.agentEnabled ? 'Enabled' : 'Disabled'}
                </p>
                <p>
                  <strong>Budget:</strong> ${policy.maxSpend} CAD
                </p>
                <p>
                  <strong>Categories:</strong> {policy.allowedCategories.join(', ')}
                </p>
                <p>
                  <strong>Checkout:</strong> {policy.requireConfirm ? 'Requires confirmation' : 'Auto-allowed'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
