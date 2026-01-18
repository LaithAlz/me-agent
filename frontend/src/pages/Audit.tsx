import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuditEventRow } from '@/components/shared/AuditEventRow';
import { 
  FileText, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  Search 
} from 'lucide-react';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { AuditAction, AuditEvent } from '@/types';
import { format } from 'date-fns';

const ACTION_OPTIONS: { value: AuditAction; label: string }[] = [
  { value: 'CONSENT_GRANTED', label: 'Consent Granted' },
  { value: 'CONSENT_DENIED', label: 'Consent Denied' },
  { value: 'BUNDLE_GENERATED', label: 'Bundle Generated' },
  { value: 'CART_CREATED', label: 'Cart Created' },
  { value: 'CART_LINES_ADDED', label: 'Cart Lines Added' },
  { value: 'CHECKOUT_LINK_READY', label: 'Checkout Ready' },
  { value: 'EXPLANATION_GENERATED', label: 'Explanation Generated' },
];

export default function AuditPage() {
  const { events, getFilteredEvents } = useAuditLog();
  const [selectedActions, setSelectedActions] = useState<AuditAction[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const toggleAction = (action: AuditAction) => {
    setSelectedActions(prev => 
      prev.includes(action) 
        ? prev.filter(a => a !== action)
        : [...prev, action]
    );
  };

  const filteredEvents = useMemo(() => {
    return getFilteredEvents(
      selectedActions.length > 0 ? selectedActions : undefined,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate + 'T23:59:59') : undefined
    );
  }, [getFilteredEvents, selectedActions, startDate, endDate]);

  const clearFilters = () => {
    setSelectedActions([]);
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = selectedActions.length > 0 || startDate || endDate;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center text-white gap-2">
              <FileText className="h-6 w-6" />
              Audit Log
            </h1>
            <p className="text-white opacity-80 mt-1">
              Complete history of all Me-Agent actions
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {selectedActions.length + (startDate ? 1 : 0) + (endDate ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Action Type Filter */}
              <div className="space-y-2">
                <Label>Action Type</Label>
                <div className="flex flex-wrap gap-2">
                  {ACTION_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => toggleAction(option.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedActions.includes(option.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Start Date
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    End Date
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Events
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredEvents.length} total)
                </span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No events found</h3>
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters 
                    ? 'Try adjusting your filters' 
                    : 'Generate a bundle to start logging events'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((event) => (
                  <ExpandableAuditRow
                    key={event.id}
                    event={event}
                    isExpanded={expandedEvent === event.id}
                    onToggle={() => setExpandedEvent(
                      expandedEvent === event.id ? null : event.id
                    )}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function ExpandableAuditRow({
  event,
  isExpanded,
  onToggle,
}: {
  event: AuditEvent;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div 
        className="cursor-pointer"
        onClick={onToggle}
      >
        <AuditEventRow event={event} />
      </div>
      
      {isExpanded && event.metadata && Object.keys(event.metadata).length > 0 && (
        <div className="p-4 bg-muted/50 border-t">
          <div className="flex items-center gap-2 mb-2">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-xs font-medium text-muted-foreground">
              Event Metadata
            </span>
          </div>
          <pre className="text-xs font-mono bg-card p-3 rounded overflow-x-auto">
            {JSON.stringify(event.metadata, null, 2)}
          </pre>
          <p className="text-xs text-muted-foreground mt-2">
            Timestamp: {format(new Date(event.ts), 'PPpp')}
          </p>
        </div>
      )}
    </div>
  );
}
