import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Volume2, 
  VolumeX, 
  Plus, 
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
import { Input } from '@/components/ui/input';
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
  const [reportDescription, setReportDescription] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const currentStep = navigation.currentRoute?.steps[navigation.currentStepIndex];
  const nextStep = navigation.currentRoute?.steps[navigation.currentStepIndex + 1];

  const handleReport = async (type: IncidentType) => {
    if (!navigation.currentRoute) return;
    
    setIsReporting(true);
    try {
      // Use the current step's end location for reporting
      const location = currentStep?.endLocation || { lat: 0, lng: 0 };
      await onReportIncident({
        type,
        location,
        description: reportDescription || undefined,
      });
      setIsReportDialogOpen(false);
      setReportDescription('');
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Maneuver - Big and readable */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <Navigation className="w-8 h-8" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-3xl font-bold">{currentStep?.distance || '--'}</p>
            <p className="text-lg opacity-90 truncate">
              {currentStep?.instruction || 'Continue on route'}
            </p>
          </div>
        </div>
      </div>

      {/* Next Step Preview */}
      {nextStep && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
            Then
          </div>
          <p className="text-sm truncate flex-1">{nextStep.instruction}</p>
          <span className="text-sm text-muted-foreground">{nextStep.distance}</span>
        </div>
      )}

      {/* ETA and Remaining */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-xl bg-secondary">
          <Clock className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold">{navigation.estimatedArrival || '--:--'}</p>
          <p className="text-xs text-muted-foreground">Arrival</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-secondary">
          <Navigation className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold">{navigation.remainingDistance || '--'}</p>
          <p className="text-xs text-muted-foreground">Distance</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-secondary">
          <MapPin className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold">{navigation.remainingDuration || '--'}</p>
          <p className="text-xs text-muted-foreground">Time left</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        {/* Mute/Unmute */}
        <Button
          variant="secondary"
          className="flex-1 gap-2"
          onClick={() => {/* Toggle mute */}}
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

        {/* Report Incident */}
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="flex-1 gap-2">
              <AlertTriangle className="w-4 h-4" />
              Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report an Incident</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-2 py-4">
              {incidentTypes.map(({ type, icon, label }) => (
                <motion.button
                  key={type}
                  whileHover={{ scale: 1.05 }}
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
            <Input
              placeholder="Add details (optional)"
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
            />
          </DialogContent>
        </Dialog>

        {/* Add Stop */}
        <Button variant="secondary" size="icon">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* End Navigation */}
      <Button
        variant="destructive"
        className="w-full gap-2"
        onClick={onEndNavigation}
      >
        <X className="w-4 h-4" />
        End Navigation
      </Button>
    </div>
  );
}
