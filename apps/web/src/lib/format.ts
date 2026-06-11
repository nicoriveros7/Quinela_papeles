/**
 * Primary match kickoff formatter for user-facing UIs.
 * Output: "Vie 12 Jun · 2:00 PM COT" — uses the browser's local timezone.
 *
 * Use this everywhere a match's date/time is shown to the user.
 * Single source of truth — do NOT inline toLocaleTimeString / toLocaleDateString calls.
 *
 * The timezone abbreviation (COT, EDT, PDT…) is included so users in different
 * zones can see at a glance which timezone is being displayed.
 */
export function formatMatchKickoff(value: string): string {
  const d = new Date(value);
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('es-CO', opts).format(d);

  const weekday = fmt({ weekday: 'short' });   // "vie."
  const day     = fmt({ day: 'numeric' });      // "12"
  const month   = fmt({ month: 'short' });      // "jun."

  // en-US for clean "2:00 PM COT" (es-CO gives "2:00 p. m." with dots/spaces)
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(d);

  const clean = (s: string) => s.replace(/\./g, '').trim();
  const cap   = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return `${cap(clean(weekday))} ${day} ${cap(clean(month))} · ${time}`;
}

/**
 * General-purpose date+time formatter for admin UI and secondary contexts.
 * Output: "12 jun, 9:00 a. m." — uses the browser's local timezone.
 */
export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

/**
 * Returns a proximity label for an upcoming match or null if not applicable.
 * Labels are based on the user's LOCAL calendar date (browser timezone), not UTC:
 * - "Pronto"  — same local day, less than 1 h away
 * - "En X h"  — same local day, 1–5 h away
 * - "Hoy"     — same local day, 6+ h away
 * - "Mañana"  — next local calendar day (regardless of how many hours away)
 * - null      — already started, same-day kickoff in the past, or 2+ days away
 */
export function matchProximityLabel(kickoffAt: string): string | null {
  const now = new Date();
  const kickoff = new Date(kickoffAt);
  const diffMs = kickoff.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  // Compare local calendar dates to avoid UTC/timezone mismatches
  const sameLocalDay =
    kickoff.getFullYear() === now.getFullYear() &&
    kickoff.getMonth()    === now.getMonth()    &&
    kickoff.getDate()     === now.getDate();

  if (sameLocalDay) {
    const diffH = diffMs / (1000 * 3600);
    if (diffH < 1) return 'Pronto';
    if (diffH < 6) return `En ${Math.floor(diffH)} h`;
    return 'Hoy';
  }

  // Check if kickoff falls on the next local calendar day
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    kickoff.getFullYear() === tomorrow.getFullYear() &&
    kickoff.getMonth()    === tomorrow.getMonth()    &&
    kickoff.getDate()     === tomorrow.getDate();

  if (isTomorrow) return 'Mañana';

  return null;
}

export function matchStatusLabel(status: string) {
  switch (status) {
    case 'SCHEDULED': return 'Programado';
    case 'LIVE':      return 'En juego';
    case 'FINISHED':  return 'Finalizado';
    case 'POSTPONED': return 'Postergado';
    case 'CANCELLED': return 'Cancelado';
    default:          return status;
  }
}

export function questionTypeLabel(type: string) {
  switch (type) {
    case 'BOOLEAN':       return 'Si / No';
    case 'SINGLE_CHOICE': return 'Opcion unica';
    case 'TEAM_PICK':     return 'Equipo';
    case 'PLAYER_PICK':   return 'Jugador';
    case 'TIME_RANGE':    return 'Rango de tiempo';
    default:              return type;
  }
}
