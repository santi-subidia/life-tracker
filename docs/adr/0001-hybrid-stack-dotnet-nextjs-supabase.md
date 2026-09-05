# ADR-0001: Arquitectura Híbrida .NET Web API + Next.js PWA + Supabase Postgres

- **Estado**: Aceptado
- **Fecha**: 2026-09-05
- **Decisores**: Subi, Tech Lead / Orchestrator, System Architect

## Contexto y Problema
Se requiere diseñar un sistema de seguimiento de vida integral (*Life Tracker*) que centralice Salud (Estudios Médicos), Hábitos y Rutinas, Segundo Cerebro (Notas estilo Obsidian), Trabajo (Tablero Kanban y Deep Work), Academia y Asistente IA transversal.
El sistema debe ser rápido y táctil en dispositivos móviles (PWA), potente en laptop, permitir procesos en segundo plano 24/7 (cálculo de rachas de hábitos, recordatorios, workers de IA) y soportar futuros reportes analíticos complejos.

## Opciones Consideradas (Design It Twice)

### Opción A: Monolito Fullstack Serverless Next.js 16 + Supabase
- **Pros**: Un solo repositorio y lenguaje (TypeScript), cero servidores que administrar, despliegue serverless gratuito en Vercel.
- **Contras**: Limitaciones severas para background workers 24/7 (requiere crons HTTP externos), riesgo de desorden en Server Actions con 6 dominios de negocio densos, no aprovecha la mayor fortaleza técnica del autor (.NET).

### Opción B: Arquitectura Híbrida Desacoplada (Frontend Next.js PWA + Backend Dedicado .NET Web API + Supabase Postgres)
- **Pros**:
  - Dominio y confort total del desarrollador en C# .NET.
  - Implementación de *Clean Architecture* estricta por Bounded Contexts.
  - Soporte nativo para procesos en segundo plano 24/7 (`IHostedService`, Quartz.NET) alojados en un VPS propio.
  - Backend agnóstico reutilizable para clientes futuros (web, móvil nativo o extensiones).
  - Supabase PostgreSQL administrado con Auth JWT y RLS en capa de datos.
- **Contras**: Dos entornos de compilación (Node y .NET), necesidad de orquestar el despliegue del backend en el VPS (resuelto mediante Docker Compose).

## Decisión
Se adopta la **Opción B: Frontend Next.js PWA + Backend .NET Web API (C#) en VPS + Supabase Postgres**.

## Consecuencias
- **Positivas**:
  - Máximo rendimiento y escalabilidad en el backend.
  - Lógica de negocio (rachas de hábitos, grafos de notas, pipelines de extracción médica) encapsulada en C#.
  - Frontend ligero centrado en UX, interacción táctil móvil y PWA.
- **Riesgos y Mitigaciones**:
  - *Sobrecarga de dos lenguajes*: Se mitiga manteniendo contratos de DTOs limpios y estructurados con OpenAPI / Swagger.
