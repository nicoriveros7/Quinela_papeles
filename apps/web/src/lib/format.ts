export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function matchStatusLabel(status: string) {
  switch (status) {
    case 'SCHEDULED':
      return 'Programado';
    case 'LIVE':
      return 'En juego';
    case 'FINISHED':
      return 'Finalizado';
    case 'POSTPONED':
      return 'Postergado';
    case 'CANCELLED':
      return 'Cancelado';
    default:
      return status;
  }
}

export function questionTypeLabel(type: string) {
  switch (type) {
    case 'BOOLEAN':
      return 'Si / No';
    case 'SINGLE_CHOICE':
      return 'Opcion unica';
    case 'TEAM_PICK':
      return 'Equipo';
    case 'PLAYER_PICK':
      return 'Jugador';
    case 'TIME_RANGE':
      return 'Rango de tiempo';
    default:
      return type;
  }
}
