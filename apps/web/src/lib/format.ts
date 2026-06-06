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
 * - "Pronto"  — less than 1 h away
 * - "En X h"  — 1–5 h away
 * - "Hoy"     — 6–23 h away
 * - "Mañana"  — 24–47 h away
 * - null      — already started or more than 2 days away
 */
export function matchProximityLabel(kickoffAt: string): string | null {
  const diffMs = new Date(kickoffAt).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const diffH = diffMs / (1000 * 3600);
  if (diffH < 1)  return 'Pronto';
  if (diffH < 6)  return `En ${Math.floor(diffH)} h`;
  if (diffH < 24) return 'Hoy';
  if (diffH < 48) return 'Mañana';
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
