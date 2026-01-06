import { useState } from "react";
import { format, setHours, setMinutes } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TripDestination, ItineraryItemType } from "@/types/travel";
import { cn } from "@/lib/utils";

interface AddItineraryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date | null;
  destinations: TripDestination[];
  onAdd: (
    type: ItineraryItemType,
    title: string,
    startTime: Date,
    options?: {
      destinationId?: string;
      description?: string;
      endTime?: Date;
      locationName?: string;
      locationAddress?: string;
      confirmationCode?: string;
      cost?: number;
      notes?: string;
    }
  ) => void;
}

const ITEM_TYPES: { value: ItineraryItemType; label: string }[] = [
  { value: 'activity', label: '🎯 Activity' },
  { value: 'flight', label: '✈️ Flight' },
  { value: 'lodging', label: '🏨 Lodging' },
  { value: 'restaurant', label: '🍽️ Restaurant' },
  { value: 'transit', label: '🚗 Transit/Drive' },
  { value: 'free_time', label: '☕ Free Time' },
  { value: 'other', label: '📝 Other' },
];

export function AddItineraryItemDialog({
  open,
  onOpenChange,
  defaultDate,
  destinations,
  onAdd,
}: AddItineraryItemDialogProps) {
  const [itemType, setItemType] = useState<ItineraryItemType>('activity');
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(defaultDate || undefined);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("");
  const [locationName, setLocationName] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [cost, setCost] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !date) return;
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDateTime = setMinutes(setHours(date, hours), minutes);
    
    let endDateTime: Date | undefined;
    if (endTime) {
      const [endH, endM] = endTime.split(':').map(Number);
      endDateTime = setMinutes(setHours(date, endH), endM);
    }
    
    setIsSubmitting(true);
    try {
      await onAdd(itemType, title.trim(), startDateTime, {
        destinationId: destinationId || undefined,
        description: description.trim() || undefined,
        endTime: endDateTime,
        locationName: locationName.trim() || undefined,
        confirmationCode: confirmationCode.trim() || undefined,
        cost: cost ? parseFloat(cost) : undefined,
      });
      
      // Reset form
      setTitle("");
      setDescription("");
      setStartTime("09:00");
      setEndTime("");
      setLocationName("");
      setConfirmationCode("");
      setCost("");
      setDestinationId("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Itinerary Item</DialogTitle>
          <DialogDescription>Add an activity, flight, lodging, or other event to your trip itinerary.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={itemType} onValueChange={(v) => setItemType(v as ItineraryItemType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder={
                itemType === 'flight' ? "e.g., United 123 to NYC" :
                itemType === 'lodging' ? "e.g., Check-in at Marriott" :
                itemType === 'restaurant' ? "e.g., Dinner at Nobu" :
                "e.g., Visit Eiffel Tower"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "MMM d") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Start Time *</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            {destinations.length > 0 && (
              <div className="space-y-2">
                <Label>Destination</Label>
                <Select value={destinationId} onValueChange={setDestinationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinations.map(dest => (
                      <SelectItem key={dest.id} value={dest.id}>
                        {dest.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Location Name</Label>
            <Input
              placeholder="e.g., Eiffel Tower"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(itemType === 'flight' || itemType === 'lodging') && (
              <div className="space-y-2">
                <Label>Confirmation Code</Label>
                <Input
                  placeholder="e.g., ABC123"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Cost (USD)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Any additional details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!title.trim() || !date || isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
