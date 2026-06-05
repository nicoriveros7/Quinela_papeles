const TZ = 'America/Bogota';

/**
 * General-purpose date+time formatter for admin UI and secondary contexts.
 * Output: "12 jun, 9:00 a. m." (Colombia timezone)
 */
export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(value));
}

/**
 * Primary match kickoff formatter for user-facing UIs.
 * Output: "Vie 12 Jun · 7:00 PM" (Colombia timezone, always)
 *
 * Use this everywhere a match's date/time is shown to the user.
 * Single source of truth — do NOT inline toLocaleTimeString / toLocaleDateString calls.
 */
export function formatMatchKickoff(value: string): string {
  const d = new Date(value);
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('es-CO', { ...opts, timeZone: TZ }).format(d);

  const weekday = fmt({ weekday: 'short' });          // "vie."
  const day     = fmt({ day: 'numeric' });             // "12"
  const month   = fmt({ month: 'short' });             // "jun."
  // Use en-US for clean "7:00 PM" (es-CO gives "7:00 p. m." with dots/spaces)
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: TZ,
  }).format(d);

  const clean = (s: string) => s.replace(/\./g, '').trim();
  const cap   = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return `${cap(clean(weekday))} ${day} ${cap(clean(month))} · ${time}`;
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
