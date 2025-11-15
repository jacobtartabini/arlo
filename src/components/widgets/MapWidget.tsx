import { useEffect, useState } from 'react';
import { useArlo, type MapUpdate } from '@/providers/ArloProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Clock, ExternalLink } from 'lucide-react';

interface MapWidgetProps {
  start?: string;
  end?: string;
}

export function MapWidget({ start, end }: MapWidgetProps) {
  const { config, latestMapUpdate } = useArlo();
  const [mapData, setMapData] = useState<MapUpdate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!latestMapUpdate) {
      return;
    }

    const normalize = (value?: string) => value?.toLowerCase?.().trim() ?? '';
    const updateStart = normalize(latestMapUpdate.start);
    const updateEnd = normalize(latestMapUpdate.end);
    const requestedStart = normalize(start);
    const requestedEnd = normalize(end);

    const matchesStart = !requestedStart || updateStart === requestedStart;
    const matchesEnd = !requestedEnd || updateEnd === requestedEnd;

    if (matchesStart && matchesEnd) {
      setMapData(latestMapUpdate);
      setIsLoading(false);
      setError(null);
    }
  }, [end, latestMapUpdate, start]);

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (start) params.append('start', start);
        if (end) params.append('end', end);

        const response = await fetch(
          `${config.apiEndpoint}/tools/maps?${params.toString()}`,
          {
            headers: {
              'Authorization': `Bearer ${config.apiToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch map data');
        }

        const data = (await response.json()) as MapUpdate;
        setMapData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    if (config.apiEndpoint && config.apiToken) {
      fetchMapData();
    }
  }, [config, end, start]);

  if (isLoading) {
    return (
      <Card className="w-96 glass border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Navigation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-32 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-96 glass border-0 shadow-xl border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <MapPin className="h-5 w-5" />
            Navigation Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-96 glass border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Navigation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mapData && (
          <>
            {/* Route information */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-muted-foreground">From:</span>
                <span className="font-medium">{mapData.start}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-muted-foreground">To:</span>
                <span className="font-medium">{mapData.end}</span>
              </div>
            </div>

            {/* Map visualization placeholder */}
            <div className="h-32 bg-muted/20 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
              <div className="text-center">
                <Navigation className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Route Preview</p>
              </div>
            </div>

            {/* Route details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Navigation className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Distance</span>
                </div>
                <p className="font-semibold">{mapData.distance}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Duration</span>
                </div>
                <p className="font-semibold">{mapData.duration}</p>
              </div>
            </div>

            {/* Route description */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Route:</p>
              <p className="text-sm">{mapData.route}</p>
            </div>

            {/* External map link */}
            {mapData.mapUrl && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(mapData.mapUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Maps
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}