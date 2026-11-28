# Five Parsecs Companion

Web app offline (PWA) para tablet que guía cada turno de _Five Parsecs From Home_ (3ª ed.), resuelve las tablas
a partir del dado que tira el jugador y lleva un diario de campaña. Uso personal; repositorio privado.

- Especificación: [docs/SPEC.md](docs/SPEC.md)
- Reglas para agentes de código: [CLAUDE.md](CLAUDE.md)

## Puesta en marcha

```sh
nvm use          # Node 22
npm install
npm run dev
```

## Calidad

```sh
npm run check             # lint + typecheck + validate:content + tests
npm run coverage          # tests con cobertura del motor (umbral 95 %)
npm run e2e               # Playwright (tablet 1180×820); requiere `npx playwright install chromium`
```

## Estado

| Hito                | Estado                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| M0 Andamiaje        | Hecho (falta conectar el despliegue: Cloudflare Pages + Access)                |
| M1 Motor y esquemas | Hecho: `dice.ts`, `lookup.ts`, esquemas Zod, `validate:content`, tablas piloto |
| M2 Contenido        | Hecho: 69 tablas verificadas, 102 pasos, 55 términos de glosario               |
| M3 Interfaz         | Hecho: guía + panel de tabla + encadenado + biblioteca + glosario, en memoria  |
