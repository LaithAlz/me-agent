import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AuditEventRow } from '@/components/shared/AuditEventRow';
import { FileText, ArrowRight } from 'lucide-react';
import type { AuditEvent } from '@/types';

interface AuditPreviewPanelProps {
  events: AuditEvent[];
}

export function AuditPreviewPanel({ events }: AuditPreviewPanelProps) {
  const recentEvents = events.slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Audit Log
          </CardTitle>

          <Link to="/audit">
            <Button variant="ghost" size="sm" className="gap-1">
              View all
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent>
        {recentEvents.length === 0 ? (
          <div className="text-center py-8">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>

            <p className="text-sm text-muted-foreground">
              No events yet. Generate recommendations or submit feedback to start logging.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((event) => (
              <AuditEventRow key={event.id} event={event} compact />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
