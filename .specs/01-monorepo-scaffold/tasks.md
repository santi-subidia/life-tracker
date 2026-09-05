# Desglose de Tareas: 01-monorepo-scaffold

## 1. Gobernanza y Documentación
- [x] **[TSK-01]**: Crear `CONTEXT.md` con glosario ubicuo e invariantes de negocio.
- [x] **[TSK-02]**: Registrar `docs/adr/0001-hybrid-stack-dotnet-nextjs-supabase.md`.
- [x] **[TSK-03]**: Configurar `.gitignore` y copiar suite `.agents/` de SubiKit.

## 2. Base de Datos y Persistencia
- [x] **[TSK-04]**: Crear migración SQL completa en `supabase/migrations/20260905000000_initial_schema.sql` con RLS para todos los dominios.

## 3. Backend .NET Clean Architecture
- [x] **[TSK-05]**: Crear solución .NET (`LifeTracker.slnx`) con proyectos `Domain`, `Application`, `Infrastructure`, `Api` y `Domain.Tests`.
- [x] **[TSK-06]**: Enlazar referencias de proyectos y verificar compilación limpia con `dotnet build`.
- [x] **[TSK-07]**: Instalar paquetes NuGet esenciales (`FluentValidation`, `Npgsql.EntityFrameworkCore.PostgreSQL`, `AWSSDK.S3`).
- [x] **[TSK-08]**: Crear `Dockerfile` optimizado y `docker-compose.yml` para despliegue en VPS.

## 4. Frontend Next.js PWA
- [x] **[TSK-09]**: Configurar `web/package.json`, `tsconfig.json`, `postcss.config.mjs`, `next.config.ts` y soporte PWA.
- [x] **[TSK-10]**: Crear layout responsivo (`layout.tsx`), estilos OKLCH (`globals.css`) y landing de pilares (`page.tsx`).
- [x] **[TSK-11]**: Ejecutar `npm install` y verificar compilación de frontend (`npm run build` con Turbopack/Webpack PWA pasando en verde).
