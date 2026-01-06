import { useState, useEffect } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TripDestination, WeatherForecast } from "@/types/travel";
import { getArloToken } from "@/lib/arloAuth";
import { cn } from "@/lib/utils";

interface TripWeatherWidgetProps {
  destination: TripDestination;
  tripDates: { start: Date; end: Date };
}

export function TripWeatherWidget({ destination, tripDates }: TripWeatherWidgetProps) {
  const [forecasts, setForecasts] = useState<WeatherForecast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!destination.latitude || !destination.longitude) {
        setError("No location coordinates");
        setIsLoading(false);
        return;
      }

      try {
        const token = await getArloToken();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-api`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: 'weather',
              latitude: destination.latitude,
              longitude: destination.longitude,
              startDate: tripDates.start.toISOString(),
              endDate: tripDates.end.toISOString(),
            }),
          }
        );

        const data = await response.json();
        
        if (data.configured === false) {
          setNotConfigured(true);
        } else if (data.error) {
          setError(data.error);
        } else if (data.forecasts) {
          setForecasts(data.forecasts);
        }
      } catch (e) {
        setError("Failed to load weather");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeather();
  }, [destination, tripDates]);

  const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes('rain') || lower.includes('drizzle')) return CloudRain;
    if (lower.includes('snow')) return CloudSnow;
    if (lower.includes('cloud')) return Cloud;
    return Sun;
  };

  if (notConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>
              Add OPENWEATHER_API_KEY in Settings → Travel to enable weather forecasts
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-24 w-20 flex-shrink-0" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Weather in {destination.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {forecasts.map((forecast, i) => {
            const Icon = getWeatherIcon(forecast.condition);
            const date = new Date(forecast.date);
            
            return (
              <div 
                key={i}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50 min-w-[80px]"
              >
                <p className="text-xs text-muted-foreground">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <Icon className="h-6 w-6 text-cyan-500" />
                <div className="text-center">
                  <p className="font-semibold">{forecast.tempHigh}°</p>
                  <p className="text-sm text-muted-foreground">{forecast.tempLow}°</p>
                </div>
                {forecast.precipitation > 0 && (
                  <div className="flex items-center gap-1 text-xs text-blue-500">
                    <Droplets className="h-3 w-3" />
                    {forecast.precipitation}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
