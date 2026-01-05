import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow, 
  CloudLightning,
  CloudFog,
  Thermometer, 
  Wind,
  Droplets,
  MapPin
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WeatherData {
  temperature: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  high: number;
  low: number;
  location: string;
  icon: string;
}

export function MorningWeatherSummary() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setIsLoading(true);
        
        // Get user's location
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: false,
          });
        });

        const { latitude, longitude } = position.coords;
        
        // Use Open-Meteo API (free, no API key required)
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch weather');
        }

        const data = await response.json();
        
        // Get location name from reverse geocoding
        const geoResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=auto`
        );
        const geoData = await geoResponse.json();
        
        // Map weather codes to conditions
        const weatherCode = data.current.weather_code;
        const { condition, description, icon } = mapWeatherCode(weatherCode);

        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          condition,
          description,
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m * 0.621371), // km/h to mph
          feelsLike: Math.round(data.current.apparent_temperature),
          high: Math.round(data.daily.temperature_2m_max[0]),
          low: Math.round(data.daily.temperature_2m_min[0]),
          location: geoData.timezone?.split('/').pop()?.replace('_', ' ') || 'Current Location',
          icon,
        });
        setError(null);
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError('Unable to load weather');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeather();
  }, []);

  const mapWeatherCode = (code: number): { condition: string; description: string; icon: string } => {
    // WMO Weather interpretation codes
    if (code === 0) return { condition: 'Clear', description: 'Clear sky', icon: 'sun' };
    if (code === 1) return { condition: 'Mostly Clear', description: 'Mainly clear', icon: 'sun' };
    if (code === 2) return { condition: 'Partly Cloudy', description: 'Partly cloudy', icon: 'cloud-sun' };
    if (code === 3) return { condition: 'Overcast', description: 'Overcast skies', icon: 'cloud' };
    if (code >= 45 && code <= 48) return { condition: 'Foggy', description: 'Fog or mist', icon: 'fog' };
    if (code >= 51 && code <= 55) return { condition: 'Drizzle', description: 'Light drizzle', icon: 'rain' };
    if (code >= 61 && code <= 65) return { condition: 'Rain', description: 'Rainy conditions', icon: 'rain' };
    if (code >= 66 && code <= 67) return { condition: 'Freezing Rain', description: 'Freezing rain', icon: 'rain' };
    if (code >= 71 && code <= 77) return { condition: 'Snow', description: 'Snowy conditions', icon: 'snow' };
    if (code >= 80 && code <= 82) return { condition: 'Showers', description: 'Rain showers', icon: 'rain' };
    if (code >= 85 && code <= 86) return { condition: 'Snow Showers', description: 'Snow showers', icon: 'snow' };
    if (code >= 95 && code <= 99) return { condition: 'Thunderstorm', description: 'Thunderstorms', icon: 'thunder' };
    return { condition: 'Unknown', description: 'Weather data unavailable', icon: 'cloud' };
  };

  const getWeatherIcon = (iconType: string) => {
    const iconClass = "h-10 w-10";
    switch (iconType) {
      case 'sun': return <Sun className={`${iconClass} text-amber-500`} />;
      case 'cloud-sun': return <Sun className={`${iconClass} text-amber-400`} />;
      case 'cloud': return <Cloud className={`${iconClass} text-muted-foreground`} />;
      case 'rain': return <CloudRain className={`${iconClass} text-blue-500`} />;
      case 'snow': return <CloudSnow className={`${iconClass} text-blue-300`} />;
      case 'thunder': return <CloudLightning className={`${iconClass} text-purple-500`} />;
      case 'fog': return <CloudFog className={`${iconClass} text-muted-foreground`} />;
      default: return <Cloud className={`${iconClass} text-muted-foreground`} />;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-background/60 backdrop-blur-md border-border/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-muted/30 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-24 bg-muted/30 rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted/30 rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="bg-background/60 backdrop-blur-md border-border/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Cloud className="h-5 w-5" />
            <span className="text-sm">{error || 'Weather unavailable'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card className="bg-background/60 backdrop-blur-md border-border/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {weather.location}
            </div>
            <Badge variant="secondary">{weather.condition}</Badge>
          </div>

          <div className="flex items-center gap-4">
            {/* Weather Icon */}
            <div className="flex-shrink-0">
              {getWeatherIcon(weather.icon)}
            </div>

            {/* Temperature */}
            <div className="flex-1">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{weather.temperature}</span>
                <span className="text-xl text-muted-foreground">°F</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Feels like {weather.feelsLike}°
              </p>
            </div>

            {/* High/Low */}
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">H:</span>
                <span className="font-medium">{weather.high}°</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">L:</span>
                <span className="font-medium">{weather.low}°</span>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/30">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-xs text-muted-foreground">Humidity</p>
                <p className="text-sm font-medium">{weather.humidity}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Wind</p>
                <p className="text-sm font-medium">{weather.windSpeed} mph</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
