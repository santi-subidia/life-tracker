# Spec: 01-monorepo-scaffold (Cimientos del Monorepo Life Tracker)

## Resumen del Negocio
Establecer la estructura fundamental del sistema Life Tracker para Subi, configurando la arquitectura híbrida aprobada: Frontend en Next.js 16 PWA y Backend en .NET 10 Web API con Clean Architecture, conectado a Supabase PostgreSQL y preparado para despliegue en VPS.

## Alcance (Scope)
- **In Scope**:
  - Solución .NET (`LifeTracker.slnx`) con proyectos `Domain`, `Application`, `Infrastructure`, `Api` y `Tests`.
  - Frontend Next.js 16 con Tailwind v4, PWA y layout responsivo (móvil y desktop).
  - Esquema inicial SQL con RLS en `supabase/migrations/`.
  - Vocabulario canónico en `CONTEXT.md` y registro arquitectónico en `docs/adr/0001-hybrid-stack-dotnet-nextjs-supabase.md`.
  - Orquestación de Docker Compose para despliegue en VPS.
- **Out of Scope**:
  - Implementación de la lógica de negocio de hábitos o Kanban (corresponde a fases 2 y 3).
  - Configuración de pipelines CI/CD de producción.

## Criterios de Aceptación (Gherkin)

```gherkin
Escenario: Compilación limpia de la solución backend .NET
  Dado que la solución api/LifeTracker.slnx está configurada con sus proyectos desacoplados
  Cuando ejecuto "dotnet build api/LifeTracker.slnx"
  Entonces compila con 0 errores
  Y la suite de pruebas unitarias "dotnet test" ejecuta satisfactoriamente

Escenario: Frontend Next.js configurado con PWA y Tailwind v4
  Dado que el directorio web/ contiene la aplicación Next.js
  Cuando se inspecciona la configuración y paquetes
  Entonces cuenta con @ducanh2912/next-pwa y Tailwind CSS v4 integrados
  Y el archivo manifest.json define la experiencia standalone

Escenario: Gobernanza de dominio y persistencia
  Dado el archivo CONTEXT.md en la raíz del repositorio
  Cuando se consulta el modelo de datos
  Entonces define el lenguaje ubicuo de los 6 pilares
  Y la migración inicial de Supabase contiene las tablas y políticas RLS para todos los dominios
```
