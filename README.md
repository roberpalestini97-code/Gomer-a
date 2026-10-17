# Neumáticos IA

Asistente por voz para talleres. Inspirado en el caso de «Paco el mecánico» del podcast *Cómo reinventarte con IA empezando desde cero* (min. 15:40–17:40): un taller pequeño, sin ERP ni CRM, cuyos mecánicos preguntan al móvil qué neumático montar.

- **Asistente por voz**: «me ha entrado un Audi A3 del 2018». Deduce la medida, busca en tu catálogo y recomienda neumáticos con precio y stock.
- **Stock en vivo**: el dueño suma/resta desde el móvil y todo el taller lo ve al instante (Supabase Realtime).
- **Pedido por WhatsApp**: si no queda stock, un botón abre el chat del comercial con el pedido ya escrito.
- **Catálogo**: alta manual, importación de la tarifa del proveedor (CSV/XLSX) o catálogo de demostración.
- **Multi-taller**: cada taller con sus datos aislados por Row Level Security; dueños y mecánicos; invitaciones por enlace.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres, Auth, Realtime, RLS) · Claude API (`@anthropic-ai/sdk`, tool use con streaming) · Web Speech API · Vitest · Playwright.

## Puesta en marcha

1. **Supabase**: crea un proyecto en [supabase.com](https://supabase.com) y ejecuta, en orden, los SQL de `supabase/migrations/` en el *SQL Editor* (o `npx supabase db push` con la CLI enlazada).
   - *Authentication → URL Configuration*: añade `https://TU-DOMINIO/auth/callback` (y `http://localhost:3000/auth/callback`) a las *Redirect URLs*.
2. **Variables**: copia `.env.example` a `.env.local` y rellena `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `ANTHROPIC_API_KEY`.
3. **Arranque**:
   ```bash
   npm install
   npm run dev
   ```
4. Crea una cuenta, ponle nombre al taller y pulsa **Cargar catálogo de demostración** en *Catálogo*. Prueba en *Asistente*: «Audi A3 de 2018».

## Despliegue en Vercel

1. Importa este repositorio en [vercel.com/new](https://vercel.com/new).
2. Añade las variables de entorno de `.env.example` (como mínimo las de Supabase, `ANTHROPIC_API_KEY` y `NEXT_PUBLIC_SITE_URL` con tu dominio).
3. Despliega y añade `https://TU-DOMINIO/auth/callback` en las Redirect URLs de Supabase.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run lint` / `npm run typecheck` | Calidad |
| `npm test` | Tests unitarios (Vitest) |
| `npm run build && npm run test:e2e` | Tests e2e en móvil (Playwright). El flujo completo necesita `E2E_EMAIL`/`E2E_PASSWORD` de un dueño con el catálogo demo |

## Estructura

```
supabase/migrations/   esquema, RLS, RPCs (crear taller, invitaciones, stock atómico, catálogo demo) y medidas por vehículo
src/lib/ai/            prompt, herramientas y bucle de tool use con Claude
src/app/api/assistant  endpoint NDJSON en streaming (auth, límite de uso, registro en historial)
src/app/app/           asistente, stock, catálogo, proveedores, equipo, historial
src/components/        UI cliente (chat por voz, tarjetas, stock en vivo, importador)
```

## Notas

- El asistente nunca inventa precios ni stock: solo usa lo que devuelven sus herramientas sobre tu base de datos, con la sesión del usuario (RLS).
- Las medidas por vehículo son orientativas; el asistente pide confirmarlas en el flanco del neumático. Puedes añadir las tuyas en la tabla `vehicle_fitments` con tu `workshop_id`.
- El dictado por voz usa el reconocimiento del navegador (Chrome/Edge/Safari). Si no está disponible se puede escribir.
