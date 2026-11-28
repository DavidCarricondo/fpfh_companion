/**
 * Preguntas que el jugador responde al inicio de cada fase (F1.6). En v2 se derivarán del estado.
 * Los flags derivados (`DERIVED_FLAGS` del motor) no se preguntan: salen de los ajustes y del turno.
 */
export const FLAG_LABELS: Readonly<Record<string, string>> = {
  'battle-events': '¿Usas Battle Events?',
  'commercial-passage': '¿Viajas con pasaje comercial (sin nave)?',
  'damaged-items': '¿Tienes equipo dañado?',
  'elite-ranks': '¿Tienes Elite Ranks de campañas anteriores?',
  'every-third-turn': '¿Es un turno múltiplo de 3?',
  'fled-invasion': '¿Has huido de una invasión este turno?',
  'has-rivals': '¿Tienes Rivales?',
  'held-the-field': '¿Has mantenido el campo (Held the Field)?',
  'hull-damaged': '¿La nave tiene daño de casco?',
  invaded: '¿El mundo está siendo invadido?',
  'invasion-battle': '¿Es una batalla de invasión?',
  'invasion-threat': '¿El enemigo era una Invasion Threat?',
  'job-offer': '¿Tienes ofertas de trabajo de Patrón?',
  'patron-job': '¿Es un trabajo de Patrón?',
  'quest-active': '¿Estás en una Quest?',
  'quest-battle': '¿Es una batalla de Quest?',
  'rival-battle': '¿Es una batalla contra un Rival?',
  'ship-debt': '¿La nave tiene deuda?',
  'sick-bay': '¿Hay alguien en la enfermería (Sick Bay)?',
  'starting-patrons': '¿Empiezas con Patrones?',
  'starting-rivals': '¿Empiezas con Rivales?',
  'story-track': '¿Usas el Story Track?',
  'tracking-invasions': '¿Sigues algún planeta invadido?',
  traveling: '¿Viajas este turno?',
  'victory-condition': '¿Tienes condición de victoria?',
}

export const flagLabel = (flag: string) => FLAG_LABELS[flag] ?? flag
