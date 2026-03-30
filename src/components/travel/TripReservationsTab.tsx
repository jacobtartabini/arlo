import { useState } from "react";
import { format } from "date-fns";
import { 
  FileText, Plane, Hotel, Car, Plus, Sparkles, 
  CheckCircle2, AlertCircle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TripItineraryItem, ItineraryItemType } from "@/types/travel";
import { getArloToken } from "@/lib/arloAuth";
import { cn } from "@/lib/utils";

interface TripReservationsTabProps {
  tripId: string;
  itineraryItems: TripItineraryItem[];
  onCreateFromReservation: (
    type: ItineraryItemType,
    title: string,
    startTime: Date,
    options?: {
      description?: string;
      endTime?: Date;
      locationName?: string;
      locationAddress?: string;
      confirmationCode?: string;
      cost?: number;
    }
  ) => Promise<TripItineraryItem | null>;
}

interface ParsedReservation {
  type: 'flight' | 'hotel' | 'car_rental';
  data: Record<string, string>;
}

export function TripReservationsTab({
  tripId,
  itineraryItems,
  onCreateFromReservation,
}: TripReservationsTabProps) {
  const [rawText, setRawText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedReservation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reservationItems = itineraryItems.filter(
    item => item.confirmationCode || item.itemType === 'flight' || item.itemType === 'lodging'
  );

  const handleParse = async () => {
    if (!rawText.trim()) return;
    
    setIsParsing(true);
    setError(null);
    setParsedResult(null);
    
    try {
      const token = await getArloToken();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-api`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Arlo-Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'parse_reservation',
            text: rawText,
          }),
        }
      );
      
      const data = await response.json();
      
      if (data.success && data.parsed) {
        setParsedResult(data.parsed);
      } else {
        setError("Could not parse reservation. Please check the format and try again.");
      }
    } catch (e) {
      setError("Failed to parse reservation text");
    } finally {
      setIsParsing(false);
    }
  };

  const handleCreateFromParsed = async () => {
    if (!parsedResult) return;
    
    const { type, data } = parsedResult;
    
    let itemType: ItineraryItemType = 'other';
    let title = '';
    let startTime = new Date();
    let options: Record<string, unknown> = {};
    
    if (type === 'flight') {
      itemType = 'flight';
      title = `${data.airline || ''} ${data.flightNumber || 'Flight'}`.trim();
      options = {
        confirmationCode: data.confirmationCode,
        locationName: data.from ? `${data.from} → ${data.to}` : undefined,
      };
      
      if (data.date) {
        try {
          startTime = new Date(data.date);
        } catch { }
      }
    } else if (type === 'hotel') {
      itemType = 'lodging';
      title = data.hotelName || 'Hotel Stay';
      options = {
        confirmationCode: data.confirmationCode,
        locationAddress: data.address,
      };
      
      if (data.checkIn) {
        try {
          startTime = new Date(data.checkIn);
        } catch { }
      }
    }
    
    await onCreateFromReservation(itemType, title, startTime, options as {
      description?: string;
      endTime?: Date;
      locationName?: string;
      locationAddress?: string;
      confirmationCode?: string;
      cost?: number;
    });
    
    setParsedResult(null);
    setRawText("");
  };

  return (
    <div className="space-y-6">
      {/* Paste Confirmation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Import Reservation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paste your flight, hotel, or rental car confirmation email text below and we'll extract the details.
          </p>
          
          <Textarea
            placeholder={`Paste confirmation text here...

Example:
Your flight confirmation for Delta DL204
Confirmation: ABC123
From: SFO to JFK
Date: April 28, 2025
Departure: 9:10 AM`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={6}
          />
          
          <Button 
            onClick={handleParse} 
            disabled={!rawText.trim() || isParsing}
            className="w-full"
          >
            {isParsing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Extract Details
              </>
            )}
          </Button>
          
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          
          {parsedResult && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-700 dark:text-green-400">
                      {parsedResult.type === 'flight' ? 'Flight' : 
                       parsedResult.type === 'hotel' ? 'Hotel' : 'Rental Car'} Detected
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      {Object.entries(parsedResult.data).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                    <Button 
                      size="sm" 
                      className="mt-3"
                      onClick={handleCreateFromParsed}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add to Itinerary
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Existing Reservations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          {reservationItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">
              No reservations found. Import your first one above!
            </p>
          ) : (
            <div className="space-y-3">
              {reservationItems.map(item => (
                <div 
                  key={item.id}
                  className="flex items-center gap-4 p-4 rounded-lg border"
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    item.itemType === 'flight' && "bg-cyan-500/10",
                    item.itemType === 'lodging' && "bg-purple-500/10",
                  )}>
                    {item.itemType === 'flight' ? (
                      <Plane className="h-5 w-5 text-cyan-500" />
                    ) : item.itemType === 'lodging' ? (
                      <Hotel className="h-5 w-5 text-purple-500" />
                    ) : (
                      <Car className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(item.startTime, 'EEEE, MMMM d, yyyy')}
                      {item.endTime && ` - ${format(item.endTime, 'MMM d')}`}
                    </p>
                    {item.locationName && (
                      <p className="text-sm text-muted-foreground">
                        {item.locationName}
                      </p>
                    )}
                  </div>
                  {item.confirmationCode && (
                    <Badge variant="outline">
                      {item.confirmationCode}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
