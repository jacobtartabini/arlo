import { 
  verifyArloJWT, 
  handleCorsOptions, 
  validateOrigin,
  jsonResponse, 
  unauthorizedResponse, 
  errorResponse 
} from '../_shared/arloAuth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherRequest {
  action: 'weather';
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
}

interface CurrencyRequest {
  action: 'currency';
  from: string;
  to: string;
  amount?: number;
}

interface FlightSearchRequest {
  action: 'flight_search';
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  nonstop?: boolean;
  maxPrice?: number;
}

interface ParseReservationRequest {
  action: 'parse_reservation';
  text: string;
}

type RequestBody = WeatherRequest | CurrencyRequest | FlightSearchRequest | ParseReservationRequest;

// Parse common reservation formats
function parseReservationText(text: string): { type: string; data: Record<string, unknown> } | null {
  const lines = text.toLowerCase();
  
  // Flight patterns
  const flightPatterns = {
    confirmationCode: /confirmation[:\s#]*([A-Z0-9]{5,8})/i,
    flightNumber: /(?:flight|flt)[:\s#]*([A-Z]{2}\d{1,4})/i,
    airline: /(united|delta|american|southwest|jetblue|alaska|spirit|frontier)/i,
    departure: /(?:departs?|departure)[:\s]*(\d{1,2}[:\d]*\s*(?:am|pm)?)/i,
    arrival: /(?:arrives?|arrival)[:\s]*(\d{1,2}[:\d]*\s*(?:am|pm)?)/i,
    from: /from[:\s]*([A-Z]{3})/i,
    to: /to[:\s]*([A-Z]{3})/i,
    date: /(\w+\s+\d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  };

  // Hotel patterns
  const hotelPatterns = {
    confirmationCode: /confirmation[:\s#]*([A-Z0-9]{5,12})/i,
    hotelName: /(marriott|hilton|hyatt|ihg|wyndham|best western|holiday inn|sheraton|westin|ritz|four seasons|w hotel)/i,
    checkIn: /check[\s-]?in[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4}|\w+\s+\d{1,2},?\s*\d{4})/i,
    checkOut: /check[\s-]?out[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4}|\w+\s+\d{1,2},?\s*\d{4})/i,
    address: /address[:\s]*([^\n]+)/i,
  };

  // Try to detect flight
  if (lines.includes('flight') || lines.includes('boarding') || /\b[A-Z]{2}\d{3,4}\b/.test(text)) {
    const data: Record<string, unknown> = { type: 'flight' };
    
    for (const [key, pattern] of Object.entries(flightPatterns)) {
      const match = text.match(pattern);
      if (match) data[key] = match[1];
    }
    
    if (Object.keys(data).length > 1) {
      return { type: 'flight', data };
    }
  }

  // Try to detect hotel
  if (lines.includes('hotel') || lines.includes('check-in') || lines.includes('reservation')) {
    const data: Record<string, unknown> = { type: 'hotel' };
    
    for (const [key, pattern] of Object.entries(hotelPatterns)) {
      const match = text.match(pattern);
      if (match) data[key] = match[1];
    }
    
    if (Object.keys(data).length > 1) {
      return { type: 'hotel', data };
    }
  }

  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate origin
  const originError = validateOrigin(req);
  if (originError) return originError;

  try {
    // Verify JWT
    const authResult = await verifyArloJWT(req);
    if (!authResult.authenticated) {
      console.log('[travel-api] Auth failed:', authResult.error);
      return unauthorizedResponse(req, authResult.error || 'Authentication required');
    }

    const body: RequestBody = await req.json();
    console.log('[travel-api] Action:', body.action);

    switch (body.action) {
      case 'weather': {
        const weatherApiKey = Deno.env.get('OPENWEATHER_API_KEY');
        if (!weatherApiKey) {
          return jsonResponse(req, { 
            error: 'Weather API not configured',
            configured: false 
          });
        }

        const { latitude, longitude } = body as WeatherRequest;
        
        try {
          // Use One Call API 3.0 for forecast
          const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&exclude=minutely,hourly,alerts&units=imperial&appid=${weatherApiKey}`;
          const response = await fetch(url);
          
          if (!response.ok) {
            // Fallback to 2.5 API
            const fallbackUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=imperial&appid=${weatherApiKey}`;
            const fallbackResponse = await fetch(fallbackUrl);
            const fallbackData = await fallbackResponse.json();
            
            if (!fallbackResponse.ok) {
              throw new Error(fallbackData.message || 'Weather API error');
            }
            
            // Transform 2.5 forecast data
            const forecasts = fallbackData.list
              .filter((_: unknown, i: number) => i % 8 === 0) // One per day
              .slice(0, 7)
              .map((item: { dt: number; main: { temp_max: number; temp_min: number; humidity: number }; weather: { main: string; icon: string }[]; pop?: number; wind: { speed: number } }) => ({
                date: new Date(item.dt * 1000).toISOString().split('T')[0],
                tempHigh: Math.round(item.main.temp_max),
                tempLow: Math.round(item.main.temp_min),
                condition: item.weather[0]?.main || 'Unknown',
                icon: item.weather[0]?.icon || '01d',
                precipitation: Math.round((item.pop || 0) * 100),
                humidity: item.main.humidity,
                windSpeed: Math.round(item.wind.speed),
              }));
            
            return jsonResponse(req, { forecasts, configured: true });
          }
          
          const data = await response.json();
          
          const forecasts = data.daily.slice(0, 7).map((day: { dt: number; temp: { max: number; min: number }; weather: { main: string; icon: string }[]; pop?: number; humidity: number; wind_speed: number }) => ({
            date: new Date(day.dt * 1000).toISOString().split('T')[0],
            tempHigh: Math.round(day.temp.max),
            tempLow: Math.round(day.temp.min),
            condition: day.weather[0]?.main || 'Unknown',
            icon: day.weather[0]?.icon || '01d',
            precipitation: Math.round((day.pop || 0) * 100),
            humidity: day.humidity,
            windSpeed: Math.round(day.wind_speed),
          }));
          
          return jsonResponse(req, { forecasts, configured: true });
        } catch (e) {
          console.error('[travel-api] Weather error:', e);
          return jsonResponse(req, { error: 'Failed to fetch weather', configured: true });
        }
      }

      case 'currency': {
        const currencyApiKey = Deno.env.get('EXCHANGERATE_API_KEY');
        if (!currencyApiKey) {
          return jsonResponse(req, { 
            error: 'Currency API not configured',
            configured: false 
          });
        }

        const { from, to, amount = 1 } = body as CurrencyRequest;
        
        try {
          const url = `https://v6.exchangerate-api.com/v6/${currencyApiKey}/pair/${from}/${to}/${amount}`;
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.result !== 'success') {
            throw new Error(data['error-type'] || 'Currency API error');
          }
          
          return jsonResponse(req, {
            from,
            to,
            amount,
            rate: data.conversion_rate,
            result: data.conversion_result,
            lastUpdated: data.time_last_update_utc,
            configured: true,
          });
        } catch (e) {
          console.error('[travel-api] Currency error:', e);
          return jsonResponse(req, { error: 'Failed to fetch exchange rate', configured: true });
        }
      }

      case 'flight_search': {
        const amadeusKey = Deno.env.get('AMADEUS_API_KEY');
        const amadeusSecret = Deno.env.get('AMADEUS_API_SECRET');
        
        if (!amadeusKey || !amadeusSecret) {
          return jsonResponse(req, { 
            error: 'Flight search not configured',
            configured: false 
          });
        }

        const { origin, destination, departureDate, returnDate, adults = 1, nonstop = false, maxPrice } = body as FlightSearchRequest;
        
        try {
          // Get access token
          const tokenResponse = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=client_credentials&client_id=${amadeusKey}&client_secret=${amadeusSecret}`,
          });
          
          const tokenData = await tokenResponse.json();
          if (!tokenData.access_token) {
            throw new Error('Failed to authenticate with Amadeus');
          }
          
          // Search flights
          let searchUrl = `https://api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${departureDate}&adults=${adults}&currencyCode=USD&max=20`;
          
          if (returnDate) searchUrl += `&returnDate=${returnDate}`;
          if (nonstop) searchUrl += `&nonStop=true`;
          if (maxPrice) searchUrl += `&maxPrice=${maxPrice}`;
          
          const searchResponse = await fetch(searchUrl, {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
          });
          
          const searchData = await searchResponse.json();
          
          if (searchData.errors) {
            throw new Error(searchData.errors[0]?.detail || 'Flight search failed');
          }
          
          // Transform results
          const flights = (searchData.data || []).map((offer: { id: string; price: { total: string; currency: string }; itineraries: { segments: { carrierCode: string; number: string; departure: { at: string; iataCode: string }; arrival: { at: string; iataCode: string }; duration: string }[]; duration: string }[] }) => {
            const outbound = offer.itineraries[0];
            const firstSegment = outbound.segments[0];
            const lastSegment = outbound.segments[outbound.segments.length - 1];
            
            return {
              id: offer.id,
              price: parseFloat(offer.price.total),
              currency: offer.price.currency,
              airline: firstSegment.carrierCode,
              flightNumber: `${firstSegment.carrierCode}${firstSegment.number}`,
              departureTime: firstSegment.departure.at,
              arrivalTime: lastSegment.arrival.at,
              duration: outbound.duration,
              stops: outbound.segments.length - 1,
              segments: outbound.segments.map((seg: { carrierCode: string; number: string; departure: { iataCode: string; at: string }; arrival: { iataCode: string; at: string }; duration: string }) => ({
                airline: seg.carrierCode,
                flightNumber: `${seg.carrierCode}${seg.number}`,
                departureAirport: seg.departure.iataCode,
                arrivalAirport: seg.arrival.iataCode,
                departureTime: seg.departure.at,
                arrivalTime: seg.arrival.at,
                duration: seg.duration,
              })),
            };
          });
          
          return jsonResponse(req, { flights, configured: true });
        } catch (e) {
          console.error('[travel-api] Flight search error:', e);
          return jsonResponse(req, { error: 'Failed to search flights', configured: true });
        }
      }

      case 'parse_reservation': {
        const { text } = body as ParseReservationRequest;
        const parsed = parseReservationText(text);
        
        return jsonResponse(req, {
          parsed,
          success: parsed !== null,
        });
      }

      default:
        return errorResponse(req, `Unknown action: ${(body as { action: string }).action}`, 400);
    }

  } catch (error) {
    console.error('[travel-api] Error:', error);
    return errorResponse(req, error instanceof Error ? error.message : 'Internal error', 500);
  }
});
