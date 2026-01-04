/**
 * Calculate sunrise and sunset times based on latitude, longitude, and date.
 * Uses the NOAA solar calculator algorithm.
 */

interface SunTimes {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
}

function toJulianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function fromJulianDay(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

function calcSunDeclination(t: number): number {
  const omega = 2.1429 - 0.0010394594 * t;
  const meanLongitude = 4.8950630 + 0.017202791698 * t;
  const meanAnomaly = 6.2400600 + 0.0172019699 * t;
  const eclipticLongitude = meanLongitude + 0.03341607 * Math.sin(meanAnomaly)
    + 0.00034894 * Math.sin(2 * meanAnomaly) - 0.0001134 - 0.0000203 * Math.sin(omega);
  const obliquity = 0.4090928 - 6.2140e-9 * t + 0.0000396 * Math.cos(omega);
  return Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
}

function calcEquationOfTime(t: number): number {
  const omega = 2.1429 - 0.0010394594 * t;
  const meanLongitude = 4.8950630 + 0.017202791698 * t;
  const meanAnomaly = 6.2400600 + 0.0172019699 * t;
  const eclipticLongitude = meanLongitude + 0.03341607 * Math.sin(meanAnomaly)
    + 0.00034894 * Math.sin(2 * meanAnomaly) - 0.0001134 - 0.0000203 * Math.sin(omega);
  const rightAscension = Math.atan2(Math.cos(0.4090928 - 6.2140e-9 * t + 0.0000396 * Math.cos(omega))
    * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude));
  return (meanLongitude - 0.0057183 - rightAscension + 0.0000396 * Math.sin(omega)) * 229.18;
}

function calcHourAngle(lat: number, decl: number, zenith: number): number {
  const latRad = toRadians(lat);
  const zenithRad = toRadians(zenith);
  const cosHA = (Math.cos(zenithRad) - Math.sin(latRad) * Math.sin(decl)) / (Math.cos(latRad) * Math.cos(decl));
  if (cosHA > 1) return NaN; // Sun never rises
  if (cosHA < -1) return NaN; // Sun never sets
  return Math.acos(cosHA);
}

/**
 * Calculate sunrise and sunset times for a given location and date
 * @param lat Latitude in degrees
 * @param lng Longitude in degrees  
 * @param date The date to calculate for
 * @param zenith Solar zenith angle (default 90.833 for official sunrise/sunset)
 * @returns Object with sunrise, sunset, and solarNoon as Date objects
 */
export function calculateSunTimes(lat: number, lng: number, date: Date, zenith = 90.833): SunTimes | null {
  const jd = toJulianDay(date);
  const t = (jd - 2451545.0) / 36525.0 * 100; // Julian century
  
  const decl = calcSunDeclination(t);
  const eqTime = calcEquationOfTime(t);
  const ha = calcHourAngle(lat, decl, zenith);
  
  if (isNaN(ha)) {
    return null; // Polar day/night
  }
  
  const haDegrees = toDegrees(ha);
  
  // Solar noon in minutes from midnight UTC
  const solarNoonMinutes = 720 - 4 * lng - eqTime;
  
  // Sunrise and sunset times in minutes from midnight UTC
  const sunriseMinutes = solarNoonMinutes - 4 * haDegrees;
  const sunsetMinutes = solarNoonMinutes + 4 * haDegrees;
  
  // Create date objects in local time
  const baseDate = new Date(date);
  baseDate.setHours(0, 0, 0, 0);
  
  const sunrise = new Date(baseDate.getTime() + sunriseMinutes * 60000);
  const sunset = new Date(baseDate.getTime() + sunsetMinutes * 60000);
  const solarNoon = new Date(baseDate.getTime() + solarNoonMinutes * 60000);
  
  // Adjust for timezone
  const tzOffset = date.getTimezoneOffset();
  sunrise.setMinutes(sunrise.getMinutes() - tzOffset);
  sunset.setMinutes(sunset.getMinutes() - tzOffset);
  solarNoon.setMinutes(solarNoon.getMinutes() - tzOffset);
  
  return { sunrise, sunset, solarNoon };
}

/**
 * Get sunrise time for today at a given location
 */
export function getSunrise(lat: number, lng: number, date = new Date()): Date | null {
  const times = calculateSunTimes(lat, lng, date);
  return times?.sunrise ?? null;
}

/**
 * Get sunset time for today at a given location
 */
export function getSunset(lat: number, lng: number, date = new Date()): Date | null {
  const times = calculateSunTimes(lat, lng, date);
  return times?.sunset ?? null;
}

/**
 * Format a sun time with an offset for display
 */
export function formatSunTimeWithOffset(time: Date | null, offsetMinutes: number): string {
  if (!time) return '--:--';
  
  const adjusted = new Date(time.getTime() + offsetMinutes * 60000);
  const hours = adjusted.getHours();
  const minutes = adjusted.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  return `${displayHours}:${displayMinutes}${ampm}`;
}

/**
 * Get offset label (e.g., "30 min before sunrise")
 */
export function getOffsetLabel(offsetMinutes: number, type: 'sunrise' | 'sunset'): string {
  if (offsetMinutes === 0) return `At ${type}`;
  const absOffset = Math.abs(offsetMinutes);
  const direction = offsetMinutes < 0 ? 'before' : 'after';
  if (absOffset >= 60) {
    const hours = Math.floor(absOffset / 60);
    const mins = absOffset % 60;
    if (mins === 0) {
      return `${hours}h ${direction} ${type}`;
    }
    return `${hours}h ${mins}m ${direction} ${type}`;
  }
  return `${absOffset}m ${direction} ${type}`;
}
