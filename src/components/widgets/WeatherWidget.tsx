import { useEffect, useState } from 'react';
import { useArlo, type WeatherUpdate } from '@/providers/ArloProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cloud, Sun, CloudRain, CloudSnow, Thermometer, Wind } from 'lucide-react';

interface WeatherWidgetProps {
  location?: string;
}

export function WeatherWidget({ location = 'current location' }: WeatherWidgetProps) {
  const { config, latestWeatherUpdate } = useArlo();
  const [weather, setWeather] = useState<WeatherUpdate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!latestWeatherUpdate) {
      return;
    }

    const updateLocation = latestWeatherUpdate.location?.toLowerCase?.() ?? '';
    const desiredLocation = location?.toLowerCase?.() ?? '';

    if (!location || location === 'current location' || updateLocation === desiredLocation) {
      setWeather(latestWeatherUpdate);
      setIsLoading(false);
      setError(null);
    }
  }, [latestWeatherUpdate, location]);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${config.apiEndpoint}/tools/weather?loc=${encodeURIComponent(location)}`,
          {
            headers: {
              'Authorization': `Bearer ${config.apiToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const data = (await response.json()) as WeatherUpdate;
        setWeather(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    if (config.apiEndpoint && config.apiToken) {
      fetchWeather();
    }
  }, [config, location]);

  const getWeatherIcon = (condition: string) => {
    const cond = condition.toLowerCase();
    if (cond.includes('rain')) return <CloudRain className="h-8 w-8 text-blue-500" />;
    if (cond.includes('snow')) return <CloudSnow className="h-8 w-8 text-blue-200" />;
    if (cond.includes('cloud')) return <Cloud className="h-8 w-8 text-gray-500" />;
    return <Sun className="h-8 w-8 text-yellow-500" />;
  };

  if (isLoading) {
    return (
      <Card className="w-80 glass border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-8 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-80 glass border-0 shadow-xl border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Cloud className="h-5 w-5" />
            Weather Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-80 glass border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Weather
        </CardTitle>
        <p className="text-sm text-muted-foreground">{weather?.location || location}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {weather && (
          <>
            {/* Main weather display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getWeatherIcon(weather.condition)}
                <div>
                  <div className="text-3xl font-bold">{weather.temperature}°</div>
                  <Badge variant="secondary">{weather.condition}</Badge>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground">{weather.description}</p>

            {/* Additional details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Humidity</p>
                  <p className="font-medium">{weather.humidity}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Wind</p>
                  <p className="font-medium">{weather.windSpeed} mph</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}