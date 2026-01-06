/**
 * Stocks API Edge Function
 * 
 * Provides stock market data using Twelve Data API:
 * - Stock quotes and prices
 * - Stock search
 * - Historical data for charts
 * - Market overview
 */

import {
  verifyArloJWT,
  handleCorsOptions,
  validateOrigin,
  jsonResponse,
  errorResponse,
  unauthorizedResponse,
} from "../_shared/arloAuth.ts";

const TWELVE_DATA_BASE = 'https://api.twelvedata.com';

interface StocksRequest {
  action: 'quote' | 'search' | 'time_series' | 'market_movers' | 'batch_quote';
  symbol?: string;
  symbols?: string[];
  query?: string;
  interval?: string;
  outputsize?: number;
}

async function twelveDataRequest(endpoint: string, params: Record<string, string>) {
  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
  if (!apiKey) {
    throw new Error('TWELVE_DATA_API_KEY not configured');
  }

  const url = new URL(`${TWELVE_DATA_BASE}${endpoint}`);
  url.searchParams.set('apikey', apiKey);
  
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status === 'error') {
    throw new Error(data.message || 'Twelve Data API error');
  }

  return data;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  // Validate origin
  const originError = validateOrigin(req);
  if (originError) return originError;

  // Verify JWT
  const auth = await verifyArloJWT(req);
  if (!auth.authenticated) {
    return unauthorizedResponse(req, auth.error || 'Unauthorized');
  }

  try {
    const body: StocksRequest = await req.json();
    const { action } = body;

    switch (action) {
      case 'quote': {
        // Get real-time quote for a single stock
        if (!body.symbol) {
          return errorResponse(req, 'symbol required', 400);
        }

        const data = await twelveDataRequest('/quote', {
          symbol: body.symbol.toUpperCase(),
        });

        return jsonResponse(req, {
          symbol: data.symbol,
          name: data.name,
          exchange: data.exchange,
          currency: data.currency,
          open: parseFloat(data.open),
          high: parseFloat(data.high),
          low: parseFloat(data.low),
          close: parseFloat(data.close),
          previous_close: parseFloat(data.previous_close),
          change: parseFloat(data.change),
          percent_change: parseFloat(data.percent_change),
          volume: parseInt(data.volume),
          is_market_open: data.is_market_open,
        });
      }

      case 'batch_quote': {
        // Get quotes for multiple stocks
        if (!body.symbols || body.symbols.length === 0) {
          return errorResponse(req, 'symbols required', 400);
        }

        const symbolsStr = body.symbols.map(s => s.toUpperCase()).join(',');
        const data = await twelveDataRequest('/quote', {
          symbol: symbolsStr,
        });

        // Handle single vs multiple response format
        const quotes = Array.isArray(data) ? data : [data];
        
        const results = quotes.map((q: Record<string, string | boolean>) => ({
          symbol: q.symbol,
          name: q.name,
          exchange: q.exchange,
          currency: q.currency,
          close: parseFloat(q.close as string),
          previous_close: parseFloat(q.previous_close as string),
          change: parseFloat(q.change as string),
          percent_change: parseFloat(q.percent_change as string),
          is_market_open: q.is_market_open,
        }));

        return jsonResponse(req, { quotes: results });
      }

      case 'search': {
        // Search for stocks by name or symbol
        if (!body.query) {
          return errorResponse(req, 'query required', 400);
        }

        const data = await twelveDataRequest('/symbol_search', {
          symbol: body.query,
          outputsize: '10',
        });

        const results = (data.data || []).map((item: Record<string, string>) => ({
          symbol: item.symbol,
          instrument_name: item.instrument_name,
          exchange: item.exchange,
          mic_code: item.mic_code,
          exchange_timezone: item.exchange_timezone,
          instrument_type: item.instrument_type,
          country: item.country,
          currency: item.currency,
        }));

        return jsonResponse(req, { results });
      }

      case 'time_series': {
        // Get historical price data for charts
        if (!body.symbol) {
          return errorResponse(req, 'symbol required', 400);
        }

        const interval = body.interval || '1day';
        const outputsize = body.outputsize || 30;

        const data = await twelveDataRequest('/time_series', {
          symbol: body.symbol.toUpperCase(),
          interval: interval,
          outputsize: outputsize.toString(),
        });

        const values = (data.values || []).map((v: Record<string, string>) => ({
          datetime: v.datetime,
          open: parseFloat(v.open),
          high: parseFloat(v.high),
          low: parseFloat(v.low),
          close: parseFloat(v.close),
          volume: parseInt(v.volume),
        }));

        return jsonResponse(req, {
          symbol: data.meta?.symbol,
          interval: data.meta?.interval,
          currency: data.meta?.currency,
          exchange: data.meta?.exchange,
          values: values.reverse(), // Chronological order
        });
      }

      case 'market_movers': {
        // Get market gainers/losers
        // Note: This requires a paid Twelve Data plan
        // For free tier, we'll return mock data
        try {
          const gainers = await twelveDataRequest('/market_movers/stocks', {
            direction: 'gainers',
            outputsize: '10',
          });

          const losers = await twelveDataRequest('/market_movers/stocks', {
            direction: 'losers', 
            outputsize: '10',
          });

          return jsonResponse(req, {
            gainers: gainers.values || [],
            losers: losers.values || [],
          });
        } catch {
          // Return placeholder for free tier
          return jsonResponse(req, {
            gainers: [],
            losers: [],
            note: 'Market movers requires Twelve Data Pro plan',
          });
        }
      }

      default:
        return errorResponse(req, `Unknown action: ${action}`, 400);
    }
  } catch (error) {
    console.error('[stocks-api] Error:', error);
    return errorResponse(req, error instanceof Error ? error.message : 'Internal error', 500);
  }
});