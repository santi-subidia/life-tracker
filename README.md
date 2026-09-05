# Life Tracker (Personal Life OS) 🌟

Sistema Operativo Personal integral para centralizar y correlacionar todas las facetas de vida en un solo lugar:

1. **Salud y Bienestar**: Estudios médicos (PDF/imágenes), extracción inteligente de valores clínicos y comparador histórico multianual.
2. **Hábitos y Rutinas**: Consistencia diaria en 1 toque, cálculo de rachas (*streaks*) y estadísticas.
3. **Notas y Segundo Cerebro**: Documentos Markdown con enlaces bidireccionales (`[[wikilinks]]`) y backlinks estilo Obsidian.
4. **Trabajo y Proyectos**: Gestión de proyectos, tablero Kanban completo y sesiones de foco (*Deep Work*).
5. **Estudios Académicos**: Cursadas, fechas clave de parciales/finales, entregas y registro de calificaciones.
6. **Asistente IA Transversal**: Agente inteligente (Google Gemini 2.5 Flash) conectado a toda tu línea de tiempo.

---

## Arquitectura

- **Frontend (`web/`)**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide React, PWA instalable en smartphone y desktop.
- **Backend (`api/`)**: .NET (C#) Web API con *Clean Architecture* estructurada en Bounded Contexts (Vertical Slices).
- **Base de Datos & Auth**: Supabase PostgreSQL (Free Tier) con pooling y Row Level Security (RLS).
- **Almacenamiento**: Cloudflare R2 (S3 compatible) para estudios médicos y adjuntos.
- **VPS Ready**: Configurado con Docker Compose para despliegue en servidor propio con background workers 24/7.

---

## Estructura del Repositorio

```
life-tracker/
├── api/                  # Solución .NET (Domain, Application, Infrastructure, Api, Tests)
├── web/                  # Aplicación Frontend Next.js PWA
├── supabase/             # Esquemas SQL, migraciones y políticas RLS
├── docs/adr/             # Registros de decisiones de arquitectura
└── CONTEXT.md            # Vocabulario canónico y reglas de dominio
```
