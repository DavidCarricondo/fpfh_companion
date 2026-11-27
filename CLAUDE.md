# Five Parsecs Companion

Spec: `docs/SPEC.md` (fuente de verdad). Lee la sección del hito antes de tocar código.

## Reglas

- UI en español; nombres de tablas, resultados y términos de reglas en INGLÉS, tal como en el libro.
- Nunca inventes contenido de reglas. Si una fila no está en el texto del PDF, déjala con TODO y `verified: false`.
  Solo el usuario marca `verified: true`, tras revisar la tabla fila a fila con el libro.
- El motor (`src/engine`) es puro: sin React, sin Dexie, sin `Date.now()` ni `Math.random()` directos
  (la aleatoriedad entra como `Rng`; la implementación criptográfica está en `src/lib/random.ts`).
- Los tipos de contenido viven en `src/engine/types.ts`; su esquema Zod en `src/content/schema.ts`
  (hay aserciones de tipo que rompen la compilación si se desalinean).
- Todo cambio de estado pasa por una acción del store que escribe también en el diario.
- Repo privado: el contenido del libro no se publica en ningún sitio.
- Antes de terminar: `npm run check` (lint + typecheck + validate:content + test).

## Contenido (`content/`)

- Una tabla por archivo: `content/tables/<id>.json`, con `id` igual al nombre del archivo.
- Rangos inclusivos que cubren todo el dado sin huecos ni solapes (por columna en tablas multicolumna).
- `fields` estructurados deben declararse en `fieldDefs`. Encadenado con `next: [{ tableId, times?, column?, label? }]`.
- Tablas de referencia (sin tirada): sin `dice` y sin `range` en las filas.
- Términos de glosario en el texto de los pasos: `[[Held the Field]]`.

## Comandos

```
npm run dev | build | preview | test | coverage | e2e | lint | format | typecheck | validate:content | check
```

Node 22 (`.nvmrc`). En WSL: `source ~/.nvm/nvm.sh` si `node` no está en el PATH.
