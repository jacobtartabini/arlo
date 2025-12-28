// Domains that should show public booking experience (no auth, light mode, no nav)
export const PUBLIC_BOOKING_DOMAINS = [
  "meet.jacobtartabini.com",
];

export function isPublicBookingDomain(): boolean {
  return PUBLIC_BOOKING_DOMAINS.includes(window.location.hostname);
}
