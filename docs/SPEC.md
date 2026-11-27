# Five Parsecs Companion — Especificación técnica (v1–v3)

Nov 27, 2026 · @David

> **Cambios respecto al documento original** (actualizar aquí cuando cambie una decisión, en el mismo PR):
>
> - **Lint:** la plantilla actual de Vite trae **oxlint** en lugar de ESLint; se mantiene oxlint + Prettier (§3, §12.3).
> - **Versiones:** React 19, Vite 8, TypeScript 7, React Router 8, Zod 4, Tailwind 4, Vitest 5.
> - **Tipos de contenido:** viven en `src/engine/types.ts`; `src/content/schema.ts` tiene el Zod equivalente con aserciones de tipo (§5).
> - **`TableDef`** añade `verified`, `aliases`, `fieldDefs` (etiquetas de `fields`) y `dice` opcional (tablas de referencia sin tirada). `TableRow.range` es opcional (solo en tablas de referencia) y admite `page` y `errata` por fila. `TableGroup` añade `loot` y `campaign` (§5.1).
> - **Glosario en pasos:** los términos se marcan como `[[Held the Field]]` y `validate:content` comprueba que existen (§5.2, §12.1).
> - **Ciclos:** se rechazan solo los bucles _forzosos_ (tablas desde las que ninguna fila termina la cadena). "Roll again on this table" en una fila concreta es válido (§12.1).

## 1. Resumen, objetivos y principios

Una web app offline, pensada para tablet, que guía cada turno de _Five Parsecs From Home_ (3ª ed.) paso a paso, resuelve las tablas a partir del dado que tira el jugador y deja un diario de campaña automático. Se construye en tres versiones: **v1** guía + tablas + log, **v2** estado de campaña con modificadores automáticos, **v3** asistente de batalla.

### Objetivos

- Que no se olvide ningún paso de la creación ni del turno de campaña (checklist persistente).
- Resolver cualquier tabla del reglamento en dos toques: escribir el número del dado → ver el resultado.
- Encadenar tablas que remiten a subtablas sin buscar en el libro.
- Generar un diario de campaña sin esfuerzo extra: cada resultado confirmado queda registrado.
- Funcionar sin conexión y con los datos solo en el dispositivo (más copia de seguridad manual).

### No-objetivos

- No es un sustituto del reglamento: cada paso remite a su página.
- No hay cuentas, servidor, sincronización ni campañas compartidas.
- No juega la batalla por el jugador (sin “modo oráculo”).
- No cubre el Compendium ni otras expansiones en v1–v3.
- No se publica: repositorio privado de GitHub, uso personal.

### Principios de diseño

1. **El jugador tira los dados.** La entrada por defecto es el número del dado físico; “Tirar por mí” es un botón secundario.
2. **Modificadores a la vista.** Todo cálculo se muestra desglosado (“7 + 2 Savvy + 1 superado en número = 10 → éxito”).
3. **Nada se aplica sin confirmar.** El resultado se previsualiza; solo al pulsar _Confirmar_ se escribe en el log y, en v2, en el estado.
4. **Todo se puede deshacer.** Cada cambio de estado es reversible desde el log.
5. **Contenido separado del código.** Tablas y pasos viven en JSON validado; la UI no conoce reglas concretas.
6. **Fiel al libro.** Nombres de tablas y resultados en inglés, tal como aparecen en el reglamento.

## 2. Contexto de uso

La app se usa sobre todo en una **tablet en horizontal junto a la mesa de juego**, con el dedo y a veces con las manos ocupadas con dados y miniaturas.

| Aspecto                        | Decisión                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| Dispositivo principal          | Tablet 10–11" en horizontal (referencia: 1180×820 CSS px). También vertical                     |
| Dispositivos secundarios       | Móvil (≥ 360 px, una columna) y portátil (≥ 1280 px, tres columnas)                             |
| Entrada                        | Táctil primero: objetivos ≥ 44×44 px, teclado numérico para dados, sin depender de _hover_      |
| Idioma de la interfaz          | Español (botones, ayudas, textos de pasos)                                                      |
| Idioma del contenido del libro | Inglés: nombres de tablas, resultados, términos de reglas (_Held the Field_, _Stunned_, _Bail_) |
| Conectividad                   | 100 % offline tras la primera carga                                                             |
| Datos                          | Solo en el dispositivo (IndexedDB) + exportación/importación JSON                               |
| Tema                           | Oscuro por defecto (menos brillo en la mesa), claro opcional                                    |
| Distribución                   | Repositorio privado de GitHub; nunca público                                                    |

**Contenido con derechos.** Las tablas transcritas son contenido de Modiphius. Para uso personal con el libro comprado no hay problema; por eso el repo es privado y el despliegue (sección 3) queda detrás de autenticación. Si algún día se quisiera compartir, habría que sustituir los textos por resúmenes propios y referencias de página.

## 3. Stack técnico y despliegue

SPA estática en **Vite + React + TypeScript**, instalable como PWA, sin backend. Se eligen herramientas muy comunes para que un agente de código en VS Code las maneje bien.

| Capa                   | Elección                                      | Motivo                                          |
| ---------------------- | --------------------------------------------- | ----------------------------------------------- |
| Build                  | Vite                                          | Arranque rápido, build estático                 |
| UI                     | React + TypeScript (`strict`)                 | Ecosistema y soporte de agentes                 |
| Estilos                | Tailwind CSS                                  | Responsive y tema oscuro sin CSS a medida       |
| Componentes accesibles | Radix UI (Dialog, Popover, Tabs)              | Paneles y diálogos táctiles accesibles          |
| Estado en memoria      | Zustand                                       | Simple, sin boilerplate                         |
| Persistencia           | Dexie (IndexedDB)                             | Más robusto y grande que localStorage           |
| Validación de datos    | Zod                                           | Valida JSON de contenido y copias importadas    |
| Offline / instalación  | vite-plugin-pwa (Workbox)                     | Precarga de todo el contenido                   |
| Router                 | React Router (hash routing)                   | Funciona en cualquier hosting estático          |
| Tests                  | Vitest + Testing Library; Playwright para e2e | Motor y contenido con tests unitarios           |
| Calidad                | oxlint + Prettier, CI con GitHub Actions      | `lint`, `typecheck`, `test`, `validate:content` |

### Opciones de despliegue

Una PWA solo instala su _service worker_ en un contexto seguro (HTTPS o `localhost`). Por eso servirla por IP en la red local no basta para usarla offline en la tablet.

| Opción                                                    | Cómo                                                                       | Pros                                                | Contras                                                       |
| --------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| **A. Cloudflare Pages + Cloudflare Access** (recomendada) | Pages conectado al repo privado; Access protege la URL con login por email | HTTPS, despliegue en cada push, contenido protegido | Requiere cuenta de Cloudflare                                 |
| B. GitHub Pages                                           | Workflow que publica `dist/`                                               | Todo en GitHub                                      | Con repo privado requiere plan de pago y la web queda pública |
| C. Archivo único                                          | `vite-plugin-singlefile` → un `index.html` copiado a la tablet             | Sin servidor                                        | Sin PWA; IndexedDB en `file://` poco fiable en iPad           |

Decisión: **A**, con **C** como build alternativo (`npm run build:single`) para emergencias.

## 4. Arquitectura y estructura del repositorio

Cuatro capas con dependencias en un solo sentido: el **contenido** (JSON) lo interpreta el **motor** (funciones puras sin React), el **estado** guarda la campaña y la **interfaz** solo conecta piezas.

```
content/ (JSON) ──▶ engine/ (puro) ──▶ store/ + db/ (estado) ──▶ features/ (UI)
```

El motor es la única pieza que sabe tirar dados, buscar en tablas y calcular modificadores. Es 100 % testeable sin navegador.

### Estructura del repositorio

```
five-parsecs-companion/
├─ CLAUDE.md                                     # reglas para el agente (sección 13)
├─ docs/SPEC.md                                  # este documento
├─ content/                                      # fuente de verdad del contenido
│  ├─ tables/            # un JSON por tabla: crew-type.json, injury.json…
│  ├─ steps/             # creation.json, campaign-turn.json, battle.json
│  ├─ glossary.json
│  └─ equipment.json     # (v2) armas y equipo con estadísticas
├─ scripts/
│  ├─ validate-content.ts  # cobertura de rangos, referencias rotas…
│  └─ extract-helpers/     # utilidades para transcribir tablas desde el PDF
├─ src/
│  ├─ engine/
│  │  ├─ types.ts         # tipos de contenido
│  │  ├─ dice.ts          # parseo "2D6", "D100", "2D6 keep highest"
│  │  ├─ lookup.ts        # valor → fila, columnas, encadenado, modificadores
│  │  ├─ checks.ts        # (v2) tiradas con modificadores
│  │  └─ effects.ts       # (v2) aplicar efectos al estado
│  ├─ content/            # carga + esquemas Zod + validación
│  ├─ store/              # slices de Zustand: campaign, turn, log, battle
│  ├─ db/                 # Dexie: esquema, migraciones, backup
│  ├─ features/
│  │  ├─ checklist/  ├─ tables/  ├─ log/
│  │  ├─ campaign/   (v2)  └─ battle/  (v3)
│  ├─ components/         # UI genérica: DiceInput, Drawer, Chip…
│  ├─ lib/                # utilidades con efectos (p. ej. generador aleatorio)
│  └─ app/                # rutas, layout, tema
└─ tests/e2e/
```

## 5. Modelo de datos

Cuatro familias de tipos: **contenido** (tablas, pasos, glosario), **campaña** (v2), **log** y **batalla** (v3). Todos los tipos de contenido tienen un esquema Zod equivalente en `src/content/schema.ts`.

### 5.1 Tablas

Una tabla puede tener una columna de resultados o varias según el contexto (p. ej. _Deployment Conditions_ por tipo de misión). Los rangos son inclusivos y deben cubrir todo el rango del dado sin huecos ni solapes.

```ts
type DiceSpec =
  | 'D3'
  | 'D6'
  | 'D10'
  | 'D100'
  | '2D6'
  | '3D6'
  | { dice: number; sides: number; keep?: 'highest' | 'lowest'; plus?: number }

interface TableDef {
  id: string // 'injury', 'crew-type', 'deployment-conditions'
  name: string // 'Injury Table' (inglés, como el libro)
  aliases?: string[]
  page: number | number[] // 122
  dice?: DiceSpec // sin dado = tabla de referencia
  group: TableGroup // 'creation' | 'travel' | 'world' | 'battle' | 'post-battle' | 'equipment' | 'enemies' | 'loot' | 'campaign'
  columns?: { id: string; label: string }[] // tablas multicolumna
  fieldDefs?: { id: string; label: string }[] // etiquetas de `fields`
  rows: TableRow[]
  notes?: string // reglas que acompañan la tabla
  verified: boolean // revisada fila a fila contra el libro
}

interface TableRow {
  range?: [number, number] | Record<string, [number, number]> // por columna si hay varias
  result: string // 'Serious injury'
  detail?: string // texto del efecto, en inglés
  fields?: Record<string, string | number> // datos estructurados: { sickBay: '1D3+1' }, { debt: '1D6+20', hull: 30 }
  next?: NextRoll[] // encadenado
  effects?: Effect[] // (v2) efectos aplicables al estado
  page?: number
  errata?: string
}

interface NextRoll {
  tableId: string
  times?: number // 'roll twice' → 2
  column?: string
  label?: string // 'Roll Primary Alien'
}
```

### 5.2 Pasos (la guía)

Los pasos reproducen el checklist del PDF: fases → secciones → pasos. Un paso puede abrir tablas, lanzar un _check_ (v2) o pedir datos.

```ts
interface StepDef {
  id: string // 'world.upkeep.pay'
  phase: 'creation' | 'travel' | 'world' | 'battle-setup' | 'battle' | 'post-battle' | 'end'
  section: string // '2.1 Mantenimiento y reparaciones'
  title: string // español
  body: string // español, markdown corto; términos de reglas en inglés; glosario como [[Term]]
  page: number | number[]
  tables?: string[] // ids de tablas a ofrecer
  check?: string // (v2) id de check en engine/checks.ts
  repeat?: 'per-crew' | 'per-round' | 'per-casualty'
  when?: Condition // mostrar solo si… ('invasion', 'traveled', 'quest-active'…)
  optional?: boolean
}

type Condition = { flag: string } | { all: Condition[] } | { any: Condition[] } | { not: Condition }
```

Las condiciones en v1 son _flags_ que el jugador marca (“¿Has viajado este turno?”). En v2 se derivan del estado.

### 5.3 Log (diario)

```ts
interface LogEntry {
  id: string // ulid
  campaignId: string
  turn: number
  phase: StepDef['phase']
  stepId?: string
  at: string // ISO
  kind: 'roll' | 'step-done' | 'note' | 'state-change' | 'battle'
  roll?: {
    tableId: string
    column?: string
    dice: number[]
    total: number
    modifiers?: Modifier[]
    rowIndex: number
    source: 'manual' | 'auto'
  }
  text: string // línea legible: 'Injury Table (D100=48): Serious injury — Twitch, 1D3+1 turns'
  note?: string // texto libre del jugador
  patch?: StatePatch // (v2) cambio aplicado, para deshacer
  undone?: boolean
}
```

### 5.4 Campaña (v2)

```ts
interface Campaign {
  id: string
  name: string
  createdAt: string
  schemaVersion: number
  settings: {
    crewSize: 4 | 5 | 6
    difficulty: 'easy' | 'normal' | 'challenging' | 'hardcore' | 'insanity'
    storyTrack: boolean
    victory?: string
    houseRules?: string
    battleEvents: boolean
  }
  turn: number
  credits: number
  storyPoints: number
  crew: Character[]
  ship?: Ship
  stash: Item[]
  currentWorldId: string
  worlds: World[]
  rivals: Rival[]
  patrons: Patron[]
  rumors: number
  quest?: { active: boolean; questRumors: number; finaleNext: boolean; offWorld: boolean }
  invadedWorlds: { worldId: string; warBonus: number }[]
  starsOfTheStory: Record<'timeToGo' | 'lookedWorse' | 'mate' | 'luckyShot' | 'rainyDay', boolean>
  flavor?: { metThrough: string; characterizedAs: string }
  victoryProgress: Record<string, number> // turnos, batallas ganadas, quests…
}

interface Character {
  id: string
  name: string
  isLeader: boolean
  type: 'human' | 'primary-alien' | 'bot' | 'strange'
  species: string // 'Baseline Human', 'K\'Erin', 'Assault Bot'…
  background?: string
  motivation?: string
  class?: string
  stats: { reactions: number; speed: number; combat: number; toughness: number; savvy: number; luck: number }
  xp: number
  upgradesBought: number
  equipment: Item[]
  sickBayTurns: number
  training: string[] // Advanced Training
  status: 'active' | 'sick-bay' | 'suspended' | 'dead' | 'left'
  notes?: string
}

interface Item {
  id: string
  name: string
  kind: 'weapon' | 'gear' | 'gadget' | 'consumable' | 'implant' | 'ship-part'
  damaged: boolean
  uses?: number
}
interface Ship {
  name: string
  type: string
  hullMax: number
  hullDamage: number
  debt: number
  traits: string[]
  components: string[]
}
interface World {
  id: string
  name: string
  traits: string[]
  licence: 'none' | 'required' | 'owned'
  invaded: boolean
  notes?: string
}
interface Rival {
  id: string
  name: string
  enemyType: string
  worldId: string
  tracked: boolean
}
interface Patron {
  id: string
  type: string
  worldId: string
  persistent: boolean
  job?: Job
}
interface Job {
  dangerPay: number
  timeTurns: number
  benefits?: string
  hazards?: string
  conditions?: string
  deadlineTurn: number
}
```

### 5.5 Batalla (v3)

```ts
interface Battle {
  id: string
  turn: number
  kind: 'opportunity' | 'patron' | 'rival' | 'quest' | 'invasion'
  deployment: string
  notableSight?: string
  objective?: string
  enemy: {
    typeId: string
    name: string
    ai: 'A' | 'C' | 'D' | 'G' | 'R' | 'T' | 'B'
    panic: [number, number]
    seizeMod: number
  }
  enemies: Combatant[]
  crew: Combatant[]
  round: number
  phase: 'seize' | 'reaction' | 'quick' | 'enemy' | 'slow' | 'end'
  casualtiesThisRound: number
  firstBloodBy?: string
  events: string[] // Battle Events en ronda 2 y 4
  result?: { won: boolean; heldTheField: boolean }
}

interface Combatant {
  id: string
  name: string
  role?: 'specialist' | 'lieutenant' | 'unique'
  stuns: number
  status: 'active' | 'casualty' | 'bailed' | 'left-table'
  reactionDie?: number
  activated: boolean
  refId?: string
}
```

## 6. Inventario de contenido

Hay que transcribir unas **55 tablas** del reglamento a `content/tables/`. La columna _Versión_ indica cuándo hacen falta: todo lo marcado v1 es necesario para la primera versión usable. Las páginas se tomaron del PDF del proyecto y deben confirmarse al transcribir.

| Fase         | Tabla (nombre del libro)                                     | Dado       | Pág.    | Encadena a                       | Versión   |
| ------------ | ------------------------------------------------------------ | ---------- | ------- | -------------------------------- | --------- |
| Creación     | Crew Type                                                    | D100       | 14      | Primary Alien, Strange Character | v1        |
| Creación     | Primary Alien                                                | D100       | 14      | —                                | v1        |
| Creación     | Strange Character                                            | D100       | 14      | —                                | v1        |
| Creación     | Background                                                   | D100       | 24      | armas/equipo extra               | v1        |
| Creación     | Motivation                                                   | D100       | 26      | armas/equipo extra               | v1        |
| Creación     | Class                                                        | D100       | 27      | armas/equipo extra               | v1        |
| Equipo       | Low Tech Weapon                                              | D100       | 28      | —                                | v1        |
| Equipo       | Military Weapon                                              | D100       | 28      | —                                | v1        |
| Equipo       | High-tech Weapon                                             | D100       | 28      | —                                | v1        |
| Equipo       | Gear                                                         | D100       | 29      | —                                | v1        |
| Equipo       | Gadget                                                       | D100       | 29      | —                                | v1        |
| Creación     | Ship                                                         | D100       | 31      | —                                | v1        |
| Creación     | Crew (We met through / Characterized as)                     | D100 × 2   | 31      | —                                | v1        |
| Campaña      | Quest Rumor (flavor)                                         | D10        | 63      | —                                | v1        |
| Viaje        | Starship Travel Events                                       | D100       | 70–71   | Loot, Gear                       | v1        |
| Viaje        | World Traits                                                 | D100       | 72–75   | —                                | v1        |
| Mundo        | Trade                                                        | D100       | 79      | armas, Gadget                    | v1        |
| Mundo        | Exploration                                                  | D100       | 80–82   | Gadget, Loot                     | v1        |
| Mundo        | Patron                                                       | D10        | 83      | —                                | v1        |
| Mundo        | Danger Pay                                                   | D10        | 83      | —                                | v1        |
| Mundo        | Time Frame                                                   | D10        | 83      | —                                | v1        |
| Mundo        | Benefits Subtable                                            | D10        | 84      | Trade, Loot                      | v1        |
| Mundo        | Hazards Subtable                                             | D10        | 84      | —                                | v1        |
| Mundo        | Conditions Subtable                                          | D10        | 84      | —                                | v1        |
| Batalla      | Deployment Conditions (3 columnas)                           | D100       | 88      | —                                | v1        |
| Batalla      | Notable Sights (3 columnas)                                  | D100       | 89      | Loot                             | v1        |
| Batalla      | Opportunity Mission Objectives                               | D10        | 89      | —                                | v1        |
| Batalla      | Quest Mission Objectives                                     | D10        | 89      | —                                | v1        |
| Batalla      | Patron Mission Objectives                                    | D10        | 89      | —                                | v1        |
| Batalla      | Enemy Encounter Category (4 columnas)                        | D100       | 94      | subtabla de enemigo              | v1        |
| Batalla      | Unknown Rivals                                               | D100       | 94      | —                                | v1        |
| Batalla      | Criminal Elements                                            | D100       | 95–97   | —                                | v1        |
| Batalla      | Hired Muscle                                                 | D100       | 97–99   | —                                | v1        |
| Batalla      | Interested Parties                                           | D100       | 99–101  | —                                | v1        |
| Batalla      | Roving Threats                                               | D100       | 101–103 | —                                | v1        |
| Batalla      | Enemy Weapons (base / Specialist)                            | D6         | 104     | —                                | v1        |
| Batalla      | Unique Individuals                                           | 2D6 + D100 | 105–106 | —                                | v1        |
| Batalla      | Battle Events (opcional)                                     | D100       | 116–117 | —                                | v1        |
| Post-batalla | Battlefield Finds                                            | D100       | 120–121 | Consumables, Loot                | v1        |
| Post-batalla | Injury                                                       | D100       | 122     | —                                | v1        |
| Post-batalla | Bot Injury                                                   | D100       | 122     | —                                | v1        |
| Post-batalla | Ability Increase (referencia)                                | —          | 123     | —                                | v1        |
| Post-batalla | Advanced Training (cursos)                                   | —          | 124     | —                                | v1        |
| Post-batalla | Campaign Events                                              | D100       | 125–127 | Loot                             | v1        |
| Post-batalla | Character Events                                             | D100       | 127–129 | Motivation, Loot                 | v1        |
| Post-batalla | Galactic War Progress                                        | 2D6        | 126     | —                                | v1        |
| Botín        | Loot                                                         | D100       | 131     | 4 subtablas                      | v1        |
| Botín        | Weapon Category → Energy / Slug / Special / Melee / Grenades | D100       | 131–132 | —                                | v1        |
| Botín        | Gear → Gun Mods / Gun Sights / Protective / Utility          | D100       | 132     | —                                | v1        |
| Botín        | Odds and Ends → Consumables / Implants / Ship Items          | D100       | 133     | —                                | v1        |
| Botín        | Rewards                                                      | D100       | 134     | —                                | v1        |
| Referencia   | Perfiles de especies y tipos de personaje                    | —          | 15–23   | —                                | v2        |
| Referencia   | Armas y equipo con estadísticas                              | —          | 50–58   | —                                | v2        |
| Referencia   | Starship Components y nave nueva                             | —          | 60–62   | —                                | v2        |
| Opcional     | Story Track (eventos del reloj)                              | —          | 153+    | —                                | posterior |

**Además:** `steps/creation.json` y `steps/campaign-turn.json` (traducción del checklist en PDF, unos 110 pasos), `steps/battle.json` (rondas) y `glossary.json` (unos 40 términos: _Stunned_, _Bail_, _Held the Field_, _Sick Bay_, _Stash_…).

**Flujo de transcripción:** el agente extrae del texto del PDF un borrador JSON por tabla → `npm run validate:content` comprueba los rangos → revisión humana contra el libro, fila por fila → se marca `"verified": true` en la tabla. La UI muestra un aviso discreto en las tablas sin verificar.

## 7. UX / UI

La pantalla de turno es el centro de la app: **lista de pasos a la izquierda, panel de tabla a la derecha**, siempre visibles a la vez en tablet horizontal. Las tablas se abren en un panel lateral, no en ventanas emergentes, para no tapar la lista.

El paso activo se resalta. Al confirmar un resultado se marca el paso, se escribe en el diario y, si la fila encadena, el panel ofrece la siguiente tabla.

### Pantallas

| Pantalla             | Ruta             | Contenido                                                                        | Versión |
| -------------------- | ---------------- | -------------------------------------------------------------------------------- | ------- |
| Inicio               | `#/`             | Lista de campañas, crear nueva, importar copia                                   | v1      |
| Creación             | `#/c/:id/create` | Checklist de la Parte 1 con tablas; en v2, formulario que rellena la tripulación | v1      |
| Turno                | `#/c/:id/turn`   | Pestañas Viaje / Mundo / Batalla / Post-batalla; lista + panel                   | v1      |
| Diario               | `#/c/:id/log`    | Entradas por turno, filtro por fase, notas, exportar                             | v1      |
| Biblioteca de tablas | `#/tables`       | Buscador de todas las tablas, uso libre fuera del flujo                          | v1      |
| Glosario             | `#/glossary`     | Términos de reglas en inglés con explicación en español y página                 | v1      |
| Hoja de campaña      | `#/c/:id/sheet`  | Tripulación, nave, Stash, Rivales, Patrones, mundos                              | v2      |
| Batalla              | `#/c/:id/battle` | Preparación, rondas, enemigos, moral, resultado                                  | v3      |
| Ajustes              | `#/settings`     | Tema, tamaño de letra, copias de seguridad, borrar datos                         | v1      |

### Componentes clave

- **DiceInput.** Teclado numérico grande propio (no el del sistema). Para dados múltiples (2D6, _keep highest_) acepta cada dado por separado y muestra el total. Rechaza valores imposibles para ese dado.
- **TablePanel.** Cabecera (nombre, dado, página, verificada o no), DiceInput, _Tirar por mí_, _Ver tabla entera_ (con la fila resultante resaltada) y selector de columna si la tabla tiene varias.
- **ResultCard.** Rango, resultado, detalle, campos estructurados y banner de encadenado (“Siguiente: … →”). Botones _Confirmar_ y _+ Nota_.
- **StepItem.** Casilla, título, página, chips de tablas. Toque largo = ver el texto completo del paso. Pasos repetibles (por tripulante, por ronda) muestran varias casillas.
- **GlossaryTerm.** Cualquier término del glosario dentro de un texto es tocable y abre un popover.
- **Toast con Deshacer.** Cada confirmación muestra un aviso con _Deshacer_ durante 8 s.

### Adaptación por tamaño

| Ancho                | Disposición                                                                  |
| -------------------- | ---------------------------------------------------------------------------- |
| < 768 px (móvil)     | Una columna; el panel de tabla es una hoja inferior a pantalla casi completa |
| 768–1279 px (tablet) | Dos columnas: lista 40 % · panel 60 %                                        |
| ≥ 1280 px (portátil) | Tres columnas: lista · panel · diario en vivo                                |

### Detalles para la mesa

- Tema oscuro por defecto y opción de letra grande.
- **Pantalla siempre encendida** durante la sesión (Screen Wake Lock API), con interruptor.
- Sin gestos ocultos: todo tiene un botón visible.
- El panel recuerda la última tabla abierta por paso.
- Contraste AA y foco visible para teclado en portátil.

## 8. Versión 1 — Guía interactiva, tablas y diario

v1 sustituye al PDF en la mesa: **checklist persistente, todas las tablas resolubles con el dado y un diario automático**. No sabe nada de la tripulación: los modificadores los suma el jugador.

### 8.1 Requisitos funcionales

**Campañas**

- **F1.1** Crear, renombrar, archivar y borrar campañas (borrar pide confirmación escrita del nombre).
- **F1.2** Guardar en cada campaña: turno actual, ajustes básicos (tamaño de tripulación, dificultad, Story Track, condición de victoria, Battle Events sí/no) y notas libres.

**Checklist**

- **F1.3** Mostrar la Parte 1 (creación) y la Parte 2 (turno) a partir de `content/steps/*.json`, agrupadas en fases y secciones, con página del libro.
- **F1.4** Marcar y desmarcar pasos; el estado persiste por campaña y turno.
- **F1.5** Pasos repetibles: “por tripulante” muestra tantas casillas como el tamaño de tripulación; “por ronda” hasta 8.
- **F1.6** Pasos condicionales con _flags_ manuales al inicio de la fase (“¿Mundo invadido?”, “¿Viajas?”, “¿Quest activa?”). Los pasos que no aplican se ocultan o se atenúan (preferencia en Ajustes).
- **F1.7** Botón **Nuevo turno**: cierra el turno (pide confirmar si quedan pasos obligatorios sin marcar), incrementa el contador y reinicia el checklist. Cada 3 turnos recuerda el +1 punto de historia.
- **F1.8** Indicador de progreso por fase (“9 de 17 pasos”).

**Tablas**

- **F1.9** Cada paso con tablas muestra chips; tocar un chip abre el panel de esa tabla.
- **F1.10** Entrada del dado: valor total o dados individuales. Validación contra el dado de la tabla (p. ej. 1–100 para D100, 2–12 para 2D6).
- **F1.11** Campo opcional **Modificador** (± entero) con etiqueta libre; el total se muestra desglosado y se limita al rango de la tabla.
- **F1.12** Resultado: rango, nombre, detalle y campos estructurados. _Ver tabla entera_ muestra todas las filas con la elegida resaltada.
- **F1.13** Tablas multicolumna: selector de columna (Opportunity/Patron · Rival · Quest). Si el paso ya lo implica, viene preseleccionada.
- **F1.14** Encadenado: si la fila tiene `next`, la tarjeta ofrece la siguiente tabla (o _N_ tiradas si `times` > 1). El encadenado queda agrupado en el diario.
- **F1.15** _Tirar por mí_ genera el valor con `crypto.getRandomValues` y lo marca como `auto` en el diario.
- **F1.16** _Confirmar_ escribe una entrada en el diario y marca el paso si es su única tabla. _Deshacer_ revierte ambas cosas.
- **F1.17** Biblioteca de tablas con buscador (nombre, alias, página) usable fuera del flujo, con opción de anotar el resultado en el diario.

**Diario**

- **F1.18** Lista cronológica agrupada por turno y fase. Tipos: tirada, paso completado, nota.
- **F1.19** Añadir, editar y borrar notas libres; editar la nota de cualquier entrada.
- **F1.20** Exportar a **Markdown** con la plantilla de la sección 8.3 y a JSON.

**Glosario y ajustes**

- **F1.21** Glosario con término en inglés, explicación en español y página; términos tocables dentro de los textos de pasos.
- **F1.22** Ajustes: tema, tamaño de letra, pantalla siempre encendida, ocultar o atenuar pasos no aplicables, copia de seguridad.

### 8.2 Requisitos no funcionales

- **N1.1** Funciona sin red tras la primera carga (todo el contenido en el precache).
- **N1.2** Interacción de dado a resultado en menos de 100 ms; arranque en menos de 2 s en una tablet media.
- **N1.3** Autoguardado tras cada cambio; sin pérdida de datos al cerrar la pestaña.
- **N1.4** Lighthouse PWA instalable y Accesibilidad ≥ 90.

### 8.3 Plantilla del diario exportado

```markdown
# {Nombre de la campaña}

_Exportado el {fecha} · Turno {n}_

## Turno 7 — Nova Rest

### Viaje

- No viajamos.

### Mundo

- Exploration Table (D100=14) → {result} — Twitch
  > Nota: Twitch se pierde en el mercado de chatarra…

### Batalla

- Opportunity · Patrol · Hired Muscle (5) · Ganada, Held the Field

### Post-batalla

- Injury Table (D100=48) → Serious injury — Simon, 1D3+1 turnos
```

### 8.4 Criterios de aceptación de v1

- [ ] Puedo crear una campaña y completar la Parte 1 entera usando solo la app y mis dados.
- [ ] Puedo jugar un turno completo (Viaje → Post-batalla) sin abrir el PDF de la guía.
- [ ] Todas las tablas marcadas v1 en la sección 6 existen, pasan `validate:content` y están verificadas contra el libro.
- [ ] Un D100 = 100 y un D100 = 1 devuelven filas correctas en todas las tablas D100.
- [ ] Loot → Weapon Category → Slug Weapons se encadena sin buscar nada.
- [ ] Con la tablet en modo avión, la app abre, guarda y exporta.
- [ ] Cierro la pestaña a mitad de turno, la reabro y todo está como lo dejé.
- [ ] El diario de un turno exportado a Markdown se lee como una crónica sin retocar.

## 9. Versión 2 — Estado de campaña y modificadores automáticos

v2 hace que la app **conozca la campaña** (tripulación, nave, dinero, Rivales, Patrones, Rumores) para que los modificadores se calculen solos, los pasos condicionales se decidan solos y los resultados confirmados se apliquen al estado. Siempre con vista previa y deshacer.

### 9.1 Requisitos funcionales

**Hoja de campaña**

- **F2.1** Pestañas: _Tripulación_ (tarjeta por personaje con atributos, XP, equipo, estado), _Nave_ (casco, deuda, rasgos, componentes), _Stash_, _Contactos_ (Rivales y Patrones por mundo), _Mundos_ (rasgos, licencia, invasión), _Progreso_ (condición de victoria, Stars of the Story usadas).
- **F2.2** Edición manual de cualquier valor, siempre registrada en el diario como `state-change`.
- **F2.3** Barra superior con créditos, puntos de historia, Rumores, casco y deuda siempre visibles.

**Creación guiada**

- **F2.4** La Parte 1 construye la tripulación de verdad: cada tirada de Crew Type, Background, Motivation y Class rellena el personaje (perfil base + modificadores de atributo + recursos a la reserva común).
- **F2.5** El equipo inicial se tira y se reparte arrastrando o tocando objeto → personaje. Aviso si el número de High-tech supera los permitidos por +Savvy.
- **F2.6** La nave se crea desde la Ship Table (deuda tirada, casco, rasgos). Los puntos de historia iniciales se calculan según dificultad y “primera partida”.

**Checks con modificadores**

- **F2.7** Un _check_ es una tirada con fórmula definida en `engine/checks.ts`. Recibe el estado, devuelve los modificadores con su etiqueta y origen, el total, el umbral y el resultado. El jugador puede activar o desactivar cada modificador situacional.
- **F2.8** Los pasos con `check` muestran la fórmula ya rellena (“2D6 + 2 (Savvy de Nada) + 1 (superado en número) − 1 (Hired Muscle) ≥ 10”).

| Check                       | Fórmula resumida                                                     | Pág.  |
| --------------------------- | -------------------------------------------------------------------- | ----- |
| `flee-invasion`             | 2D6 ≥ 8                                                              | 69    |
| `rival-follows`             | 1D6 ≥ 5 por Rival                                                    | 72    |
| `licence` / `forge-licence` | 1D6 5–6 requiere · 1D6 + Savvy ≥ 6                                   | 72    |
| `upkeep`                    | coste = 1 (4–6 tripulantes) + 1 por encima de 6, sin contar Sick Bay | 76    |
| `ship-debt`                 | +1 (+2 si ≥ 31); ≥ 75 → 2D6, 2–6 embargo                             | 76    |
| `find-patron`               | 1D6 + buscadores + Patrones conocidos + créditos ≥ 5 / ≥ 6           | 77    |
| `recruit`                   | automático si < 6; si no, 1D6 + reclutadores ≥ 6                     | 78    |
| `track`                     | 1D6 + rastreadores + créditos ≥ 6                                    | 78    |
| `repair`                    | 1D6 + Savvy (+1 Engineer) + créditos ≥ 6; 1 natural falla            | 78    |
| `rumors-to-quest`           | 1D6 ≤ nº de Rumores                                                  | 85    |
| `rivals-attack`             | 1D6 + Señuelos ≤ nº de Rivales                                       | 85    |
| `enemy-numbers`             | según tamaño y dificultad + Numbers del enemigo                      | 92–93 |
| `unique-individual`         | 2D6 (+1 Interested Parties, +1 Hardcore) ≥ 9                         | 93–94 |
| `seize-initiative`          | 2D6 + mejor Savvy (+1 superados, ± enemigo, − dificultad) ≥ 10       | 112   |
| `rival-status`              | 1D6 (+1 rastreado, +1 Unique) ≥ 4 elimina · nuevo Rival con 1        | 119   |
| `quest-progress`            | 1D6 + Quest Rumors (−2 si no ganas)                                  | 120   |
| `get-paid`                  | 1D6 (1–2 = 3 si ganas, salvo Rival) + Danger Pay                     | 120   |
| `invasion`                  | 2D6 (+1 pruebas, −1 Held the Field, + dificultad) ≥ 9                | 121   |
| `advanced-training`         | 2D6 ≥ 4 tras pagar 1 crédito                                         | 124   |
| `galactic-war`              | 2D6 + bonus acumulado por planeta                                    | 126   |

**Efectos**

- **F2.9** Las filas de tabla pueden declarar `effects` (p. ej. `{ type: 'credits', amount: '1D6' }`, `{ type: 'sickBay', turns: '1D3+1', target: 'chosen' }`, `{ type: 'addRival' }`, `{ type: 'damageItem', target: 'random-carried' }`). Al confirmar, la app muestra el cambio exacto (“Simon → Sick Bay 3 turnos”) y pide elegir objetivo si hace falta.
- **F2.10** Lo que no se puede modelar se queda en texto y se aplica a mano desde la hoja. Objetivo: modelar el 80 % de los efectos frecuentes, no todos.
- **F2.11** Cada cambio guarda un _patch_ inverso (Immer patches) en su entrada del diario; deshacer una entrada revierte su patch.

**Automatismos del turno**

- **F2.12** Los _flags_ de pasos condicionales se derivan del estado (Quest activa, mundo invadido, nave dañada, Patrón con trabajo…).
- **F2.13** Al empezar el Mundo: cálculo automático del mantenimiento, subida de deuda y −1 turno en Sick Bay, con un solo _Confirmar_.
- **F2.14** Tareas de la tripulación: asignación por arrastre (máx. 2 por tarea, excluye Sick Bay), y cada tarea lanza su check o tabla.
- **F2.15** Experiencia: cálculo de XP por personaje según el resultado de la batalla; tienda de mejoras con coste y máximo de la Ability Increase Table (incluye límites de Engineer y mejoras de Bot pagadas con créditos).
- **F2.16** Compras: tiradas a 3 créditos, armas básicas a 1 crédito y venta de hasta 3 objetos, descontando y sumando créditos.
- **F2.17** Avisos preventivos: viajar con casco dañado, deuda cerca de 75, Patrón con plazo vencido, personaje sin arma.
- **F2.18** Progreso de la condición de victoria actualizado solo (turnos, batallas ganadas, Quests, Unique Individuals, mejoras).

### 9.2 Criterios de aceptación de v2

- [ ] Creo una tripulación de 6 desde cero y la hoja refleja perfiles, recursos, equipo y nave sin teclear nada a mano.
- [ ] La tirada de iniciativa muestra el mejor Savvy correcto y los modificadores del enemigo elegido.
- [ ] Una herida grave confirmada manda al personaje a Sick Bay y el siguiente turno descuenta 1 solo.
- [ ] Deshacer cualquier entrada del diario deja el estado exactamente como estaba (test de ida y vuelta).
- [ ] Una campaña de v1 se migra a v2 sin perder el diario (la hoja queda vacía para rellenar).

## 10. Versión 3 — Asistente de batalla

v3 lleva la **contabilidad de la batalla**: generar el escenario, ordenar cada ronda, contar bajas y moral, y pasar el resultado a la post-batalla. Las tiradas de disparo y cuerpo a cuerpo siguen en la mesa; la app solo ayuda a calcular si se pide.

Ciclo de la ronda: Reacción → Acciones rápidas → Enemigo → Acciones lentas → Fase final (moral, eventos, fin de batalla). La ronda avanza fase a fase con un botón grande; la app sabe quién actúa en cada fase y qué toca al final de la ronda.

### 10.1 Requisitos funcionales

**Preparación**

- **F3.1** Asistente de escenario que encadena: tipo de misión → Deployment Conditions → Notable Sights → Objective → Enemy Encounter Category y subtabla → número de enemigos → Especialistas y Lugarteniente → Unique Individual → armas de cada enemigo. Con Rival o Invasión, el enemigo viene ya dado.
- **F3.2** Plantilla de enemigos: una tarjeta por figura con perfil, arma, rol y reglas especiales; Lugarteniente con +1 Combat Skill y Blade.
- **F3.3** Guía de despliegue según IA (grupo único, 3 equipos, 2 grupos, parejas) con un esquema, la distancia mínima de 18" y el borde sorteado.
- **F3.4** Selección de la tripulación que entra (máx. tamaño de campaña; Sick Bay excluido; aviso si alguien va sin arma).
- **F3.5** Check `seize-initiative` (de v2) y registro de quién movió o disparó.

**Ronda**

- **F3.6** Reacción: introducir los dados tirados y asignarlos tocando dado → personaje. La app clasifica en Rápidas o Lentas comparándolo con Reactions y aplica la regla del Feral con un único 1.
- **F3.7** Fases Rápidas, Enemigo y Lentas con lista de figuras para marcar como activadas. En la fase Enemigo, orden sugerido (de más cercano a tu borde a más lejano) y ficha resumen de su IA.
- **F3.8** Marcadores por figura: aturdimientos (Stun), baja, huida (Bail), fuera de mesa. Tres aturdimientos a la vez = fuera de combate (sin tirada de herida).
- **F3.9** Calculadora opcional: umbral para impactar según distancia y cobertura (3+, 5+, 6+) y daño contra Toughness. Es una ayuda: no tira dados por defecto.
- **F3.10** Fase final: número de dados de moral = bajas enemigas de la ronda; el jugador introduce los dados y la app aplica el rango de Panic a las figuras más cercanas al borde enemigo.
- **F3.11** Recordatorios por condición: visibilidad que se re-tira cada ronda, _Brief engagement_ (2D6 ≤ ronda), _Delayed_ (1D6 ≤ ronda), Battle Events al final de las rondas 2 y 4 (si están activados).
- **F3.12** Comprobación de final: todos los enemigos fuera, objetivo cumplido + tirada de retirada (1D6 Aggressive, 2D6 resto, un 1 natural), o tripulación fuera. Botón de _Stars of the Story_ (“It's time to go!”, “Lucky shot!”, etc.) que marca su uso en la campaña.

**Cierre**

- **F3.13** Resumen: ganada sí/no, _Held the Field_ sí/no, bajas propias, quien hizo la primera baja, Unique Individual abatido, objetos de Notable Sights y quien huyó en las rondas 1–2 (sin XP).
- **F3.14** El resumen rellena la post-batalla de v2: tiradas de herida pendientes por personaje, cálculo de XP, Rivales, paga, Battlefield Finds y comprobación de invasión.
- **F3.15** La batalla queda en el diario como una entrada resumen con sus rondas desplegables.

### 10.2 Fuera de alcance de v3

- Resolver disparos y cuerpo a cuerpo automáticamente para ambos bandos.
- Mapa del tablero, distancias o línea de visión.
- Decidir las acciones del enemigo más allá de mostrar su ficha de IA.

### 10.3 Criterios de aceptación de v3

- [ ] Genero una Opportunity completa (condición, objetivo, 5–7 enemigos con armas, Especialista y Lugarteniente) en menos de 2 minutos.
- [ ] Durante 6 rondas, la app nunca pierde la cuenta de quién ha activado ni de las bajas por ronda.
- [ ] La moral aplica bien el rango de Panic con 0, 1 y 3 bajas en la ronda.
- [ ] Al terminar, la post-batalla arranca con heridas, XP y paga ya planteadas.

## 11. Persistencia, copias de seguridad y migraciones

Todo se guarda en **IndexedDB con Dexie**, con autoguardado tras cada acción. La copia JSON exportable es la red de seguridad, porque el navegador puede borrar el almacenamiento.

### 11.1 Esquema de Dexie

```ts
db.version(1).stores({
  campaigns: 'id, name, updatedAt',
  turnProgress: '[campaignId+turn], campaignId', // pasos marcados y flags por turno
  log: 'id, campaignId, [campaignId+turn], at',
  settings: 'key',
})
// v2: el objeto Campaign crece (crew, ship…) → db.version(2) con upgrade()
// v3: battles: 'id, campaignId, turn'
```

### 11.2 Reglas

- **Escritura:** cada acción del store hace una transacción Dexie (campaña + entrada de diario a la vez: o se guardan las dos o ninguna).
- **Almacenamiento persistente:** al primer arranque se llama a `navigator.storage.persist()` y se informa en Ajustes si el navegador lo concedió.
- **Copia de seguridad:** _Exportar_ genera `fpc-backup-{campaña}-{fecha}.json` con `{ app: 'fpc', schemaVersion, exportedAt, campaign, turnProgress, log, battles }`. Opción de exportar todas las campañas.
- **Recordatorio:** si pasan 5 turnos sin exportar, aviso discreto en la barra superior.
- **Importar:** valida con Zod, migra si la versión es antigua, y si el id ya existe pregunta si sustituir o duplicar.
- **Migraciones:** `schemaVersion` entero; una función pura `migrate(n → n+1)` por salto, con test de ida desde un fixture de cada versión.
- **Contenido versionado:** cada entrada del diario guarda la versión del contenido usada; si una tabla cambia después (corrección de transcripción), las entradas antiguas mantienen su texto.
- **Borrado:** borrar una campaña exige escribir su nombre y ofrece exportar antes.

## 12. Calidad: validación de contenido y tests

El mayor riesgo del proyecto es una **tabla mal transcrita**, no un fallo de código. Por eso la validación del contenido es un script propio que bloquea la CI.

### 12.1 `npm run validate:content`

| Regla               | Qué detecta                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| Esquema Zod         | Campos que faltan o tipos erróneos en cada JSON                                                   |
| Cobertura de rangos | Huecos o solapes: la unión de rangos debe ser exactamente el mínimo–máximo del dado (por columna) |
| Referencias         | Todo `next.tableId`, `step.tables[]`, `step.check` y término de glosario existe                   |
| Ids únicos          | Sin ids repetidos de tabla, paso o término; el archivo se llama como el id                        |
| Páginas             | Toda tabla y paso tiene página; aviso si está fuera de 1–200                                      |
| Verificación        | Informe de tablas con `verified: false` (aviso, no error)                                         |
| Ciclos              | El encadenado de tablas no forma bucles forzosos (sin ninguna fila que termine la cadena)         |

### 12.2 Tests

| Tipo                   | Herramienta                           | Qué cubre                                                                                                                                                  | Objetivo                                |
| ---------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Unitarios del motor    | Vitest                                | `dice.ts` (parseo, límites, keep highest/lowest), `lookup.ts` (extremos de cada rango, columnas, encadenado), `checks.ts` (cada check con casos del libro) | ≥ 95 % de líneas del motor              |
| Basados en propiedades | fast-check                            | Para cada tabla, cualquier valor válido del dado devuelve exactamente una fila                                                                             | Todas las tablas                        |
| Efectos y deshacer     | Vitest                                | Aplicar efecto + revertir patch = estado idéntico                                                                                                          | Todos los tipos de efecto               |
| Migraciones            | Vitest                                | Fixture de cada `schemaVersion` migra a la actual y valida                                                                                                 | Todas las versiones                     |
| Componentes            | Testing Library                       | DiceInput, TablePanel, StepItem                                                                                                                            | Flujos principales                      |
| Extremo a extremo      | Playwright (viewport tablet 1180×820) | Crear campaña, un turno completo, exportar e importar, modo sin red                                                                                        | Criterios de aceptación de cada versión |

### 12.3 CI (GitHub Actions)

En cada push: `lint` → `typecheck` → `validate:content` → `test` → `build` → Playwright. El despliegue a Cloudflare Pages solo ocurre si todo pasa en `main`.

## 13. Plan de trabajo y uso con un agente en VS Code

El trabajo se divide en **11 hitos pequeños**, cada uno abordable en una o dos sesiones con un agente de código. Ninguna versión empieza hasta que la anterior pasa su puerta jugando de verdad.

Las puertas son partidas reales, no solo tests: si algo molesta en la mesa, se arregla antes de seguir.

### 13.1 Hitos

**v1**

1. **M0 Andamiaje.** Vite + React + TS estricto, Tailwind, Radix, linter/Prettier, Vitest, Playwright, vite-plugin-pwa, hash router, CI. Añadir `docs/SPEC.md` (este documento) y `CLAUDE.md`. _Hecho cuando:_ `npm run dev` muestra una página vacía instalable y la CI pasa.
2. **M1 Motor y esquemas.** `dice.ts`, `lookup.ts`, esquemas Zod, `validate-content.ts` y 3 tablas piloto: Injury (simple), Crew Type → Primary Alien (encadenado), Deployment Conditions (multicolumna). _Hecho cuando:_ tests del motor ≥ 95 % y las 3 tablas validan.
3. **M2 Contenido.** Transcribir todas las tablas v1 (sección 6) en tandas por fase, más `steps/*.json` desde el checklist en PDF y `glossary.json`. Revisión humana de cada tanda. _Hecho cuando:_ 100 % validado y verificado.
4. **M3 Interfaz.** Layout de dos columnas, StepItem, TablePanel, DiceInput, ResultCard, encadenado, biblioteca de tablas, glosario. _Hecho cuando:_ se puede jugar un turno en memoria.
5. **M4 Diario y persistencia.** Dexie, autoguardado, deshacer, diario con notas, exportar Markdown/JSON, importar, Nuevo turno. _Hecho cuando:_ cerrar y reabrir no pierde nada.
6. **M5 Pulido.** Ajustes, tema, letra grande, Wake Lock, offline, Lighthouse, despliegue en Cloudflare Pages + Access, build de archivo único.

**v2**

7. **M6 Hoja de campaña.** Modelo `Campaign` completo, migración v1 → v2, pantalla de hoja con edición manual registrada, referencia de especies y equipo.
8. **M7 Efectos.** Creación guiada que construye la tripulación, `effects` en las filas frecuentes, vista previa, patches con deshacer.
9. **M8 Checks y automatismos.** `checks.ts` con la tabla de 9.1, flags derivados, mantenimiento automático, tareas por arrastre, XP y tienda de mejoras, compras, avisos, progreso de victoria.

**v3**

10. **M9 Escenario.** Asistente de preparación, plantilla de enemigos con armas y roles, guía de despliegue por IA, selección de tripulación, iniciativa.
11. **M10 Rondas y cierre.** Reacción con asignación de dados, fases con activación, marcadores, moral, condiciones por ronda, Battle Events, fin de batalla, Stars of the Story, resumen enlazado con la post-batalla.

### 13.2 `CLAUDE.md`

Ver [`CLAUDE.md`](../CLAUDE.md) en la raíz del repositorio.

### 13.3 Forma de trabajar con el agente

- **Un hito por rama** y PR propio, aunque solo lo revises tú; la CI hace de red.
- **Prompt por hito:** “Implementa M3 según docs/SPEC.md §7 y §8.1 (F1.9–F1.17). Empieza proponiendo el plan de archivos.”
- **Transcripción en tandas pequeñas** (5–8 tablas): el agente lee el texto del PDF y genera los JSON; tú revisas fila a fila con el libro y marcas `verified`.
- **Actualizar la spec** cuando una decisión cambie, en el mismo PR.

## 14. Riesgos y decisiones abiertas

| Riesgo                                              | Impacto                           | Mitigación                                                                        |
| --------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| Errores al transcribir tablas                       | Resultados incorrectos en partida | Validación de rangos, revisión fila a fila, `verified`, página siempre visible    |
| El texto del PDF tiene tablas en columnas mezcladas | Transcripción lenta               | Usar el PDF original (páginas como imagen) cuando el texto falle; tandas pequeñas |
| El navegador borra IndexedDB                        | Pérdida de la campaña             | `storage.persist()`, recordatorio de copia cada 5 turnos                          |
| v2 intenta modelar todos los efectos                | Proyecto que no se acaba          | Regla del 80 %: lo raro se queda en texto y se aplica a mano                      |
| La app quita la gracia de llevar las cuentas        | Se deja de usar                   | El jugador tira y confirma; automatismos desactivables en Ajustes                 |
| Erratas o FAQ oficiales posteriores                 | Tablas desfasadas                 | Campo `errata` por fila y versión de contenido en el diario                       |

### Decisiones abiertas

- [ ] ¿Cloudflare Pages + Access (recomendado) o solo el build de archivo único?
- [ ] ¿Tablet iPad (Safari) o Android (Chrome)? Cambia cómo se instala la PWA y la fiabilidad del almacenamiento.
- [ ] ¿Incluir el Story Track en v2 o dejarlo para después?
- [ ] ¿Diario solo en Markdown o también un PDF imprimible de la crónica?
- [ ] ¿Soporte del Compendium (Trailblazer's Toolkit, etc.) como módulo opcional tras v3?
