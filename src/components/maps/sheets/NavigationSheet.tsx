import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Volume2, 
  VolumeX, 
  AlertTriangle,
  Navigation,
  Clock,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { NavigationState, IncidentType, LatLng, Incident } from '@/types/maps';

interface NavigationSheetProps {
  navigation: NavigationState;
  onEndNavigation: () => void;
  onReportIncident: (incident: { type: IncidentType; location: LatLng; description?: string }) => Promise<Incident | null>;
}

const incidentTypes: { type: IncidentType; icon: string; label: string }[] = [
  { type: 'police', icon: '🚔', label: 'Police' },
  { type: 'accident', icon: '🚗', label: 'Accident' },
  { type: 'hazard', icon: '⚠️', label: 'Hazard' },
  { type: 'construction', icon: '🚧', label: 'Construction' },
  { type: 'closure', icon: '🚫', label: 'Closure' },
];

export function NavigationSheet({
  navigation,
  onEndNavigation,
  onReportIncident,
}: NavigationSheetProps) {
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const currentStep = navigation.currentRoute?.steps[navigation.currentStepIndex];
  const nextStep = navigation.currentRoute?.steps[navigation.currentStepIndex + 1];

  const handleReport = async (type: IncidentType) => {
    if (!navigation.currentRoute) return;
    
    setIsReporting(true);
    try {
      const location = currentStep?.endLocation || { lat: 0, lng: 0 };
      await onReportIncident({
        type,
        location,
      });
      setIsReportDialogOpen(false);
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Maneuver - Large, clear */}
      <div className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <Navigation className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-3xl font-bold">{currentStep?.distance || '--'}</p>
            <p className="text-base opacity-90 truncate">
              {currentStep?.instruction || 'Continue on route'}
            </p>
          </div>
        </div>
      </div>

      {/* Next Step */}
      {nextStep && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground">
            Then
          </div>
          <p className="text-sm truncate flex-1 text-muted-foreground">{nextStep.instruction}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-3 rounded-xl bg-secondary/50">
          <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold">{navigation.estimatedArrival || '--'}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Arrival</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-secondary/50">
          <Navigation className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold">{navigation.remainingDistance || '--'}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Left</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-secondary/50">
          <MapPin className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold">{navigation.remainingDuration || '--'}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Time</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1 gap-2 h-11 rounded-xl"
        >
          {navigation.voiceMuted ? (
            <>
              <VolumeX className="w-4 h-4" />
              Unmute
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              Mute
            </>
          )}
        </Button>

        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="flex-1 gap-2 h-11 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
              Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Report an Incident</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-2 py-4">
              {incidentTypes.map(({ type, icon, label }) => (
                <motion.button
                  key={type}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleReport(type)}
                  disabled={isReporting}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl",
                    "bg-secondary hover:bg-secondary/80 transition-colors",
                    isReporting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="text-2xl">{icon}</span>
                  <span className="text-xs font-medium">{label}</span>
                </motion.button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* End Navigation */}
      <Button
        variant="outline"
        className="w-full gap-2 h-11 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        onClick={onEndNavigation}
      >
        <X className="w-4 h-4" />
        End
      </Button>
    </div>
  );
}
