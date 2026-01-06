import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import { Plane, MapPin, Calendar, MoreVertical, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trip, TripStatus } from "@/types/travel";
import { cn } from "@/lib/utils";

interface TripCardProps {
  trip: Trip;
  onClick: () => void;
  onDelete: () => void;
}

const STATUS_CONFIG: Record<TripStatus, { label: string; className: string }> = {
  planning: { label: 'Planning', className: 'bg-amber-500/20 text-amber-400' },
  active: { label: 'Active', className: 'bg-green-500/20 text-green-400' },
  completed: { label: 'Completed', className: 'bg-blue-500/20 text-blue-400' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400' },
};

export function TripCard({ trip, onClick, onDelete }: TripCardProps) {
  const now = new Date();
  const isUpcoming = isAfter(trip.startDate, now);
  const isPast = isBefore(trip.endDate, now);
  const isActive = !isUpcoming && !isPast;
  
  const daysUntil = differenceInDays(trip.startDate, now);
  const tripLength = differenceInDays(trip.endDate, trip.startDate) + 1;
  
  const statusConfig = STATUS_CONFIG[trip.status];

  const getCountdownText = () => {
    if (isActive) return 'Currently traveling';
    if (isPast) return 'Trip completed';
    if (daysUntil === 0) return 'Departs today!';
    if (daysUntil === 1) return 'Departs tomorrow';
    return `${daysUntil} days away`;
  };

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all hover:shadow-lg hover:border-primary/30",
        isActive && "ring-2 ring-cyan-500/30"
      )}
      onClick={onClick}
    >
      {trip.coverImageUrl ? (
        <div 
          className="h-32 bg-cover bg-center rounded-t-lg"
          style={{ backgroundImage: `url(${trip.coverImageUrl})` }}
        />
      ) : (
        <div className={cn(
          "h-32 rounded-t-lg flex items-center justify-center",
          "bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20"
        )}>
          <Plane className="h-12 w-12 text-cyan-500/50" />
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Badge variant="secondary" className={statusConfig.className}>
            {statusConfig.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Trip
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-semibold text-lg mb-1 line-clamp-1">{trip.name}</h3>
        
        {trip.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {trip.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d')}
            </span>
          </div>
          <span className="text-xs">
            {tripLength} day{tripLength !== 1 ? 's' : ''}
          </span>
        </div>

        <div className={cn(
          "mt-3 pt-3 border-t text-sm font-medium",
          isActive ? "text-cyan-500" : isUpcoming ? "text-amber-500" : "text-muted-foreground"
        )}>
          {getCountdownText()}
        </div>
      </CardContent>
    </Card>
  );
}
