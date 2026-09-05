---
name: domain-modeling
description: >-
  Construye y refina activamente el modelo de dominio del proyecto. Úsalo al discutir
  terminología del negocio, crear o editar CONTEXT.md, o registrar y mantener ADRs (Architecture Decision Records).
---

# Domain Modeling (Modelo de Dominio & Lenguaje Ubicuo)

El objetivo de esta disciplina es construir y afilar de forma continua el **modelo de dominio** del proyecto, evitando la ambigüedad, la verbosidad y los malentendidos entre el usuario y los agentes de IA.

> [!IMPORTANT]
> **No asumas términos de negocio ni uses 20 palabras donde 1 es el término formal**.
> Define el vocabulario canónico del proyecto en `CONTEXT.md` y documenta las decisiones estructurales complejas en `docs/adr/`.

---

## 📁 Estructura de Archivos del Dominio

En repositorios estándar de contexto único:

```text
/
├── CONTEXT.md                ← Glosario ubicuo del dominio y conceptos clave
├── docs/
│   └── adr/                  ← Architecture Decision Records
│       ├── 0001-event-driven-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

Si el repositorio es un monorepo o tiene múltiples bounded contexts:

```text
/
├── CONTEXT-MAP.md            ← Mapa global de contextos y relaciones
├── docs/adr/                 ← Decisiones a nivel de sistema global
└── apps/ (o packages/)
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

> **Creación Lazy**: Crea `CONTEXT.md` cuando se defina el primer término ambiguo de negocio. Crea `docs/adr/` cuando se tome la primera decisión de diseño con trade-offs significativos.

---

## 📖 Formato de `CONTEXT.md`

Un `CONTEXT.md` debe ser conciso, directo y servir como tabla de traducción entre términos coloquiales y conceptos de código:

```markdown
# Dominio: [Nombre del Sistema]

## Glosario y Lenguaje Ubicuo

- **[Término en Negocio]**: Definición precisa de 1 o 2 oraciones. Cómo se mapea a entidades o contratos de código (`EntityName`, `ValueObject`).
- **[Concepto Clave]**: Reglas de invariantes y límites de lo que representa.

## Invariantes del Negocio

1. [Invariante 1, ej: "Una orden en estado PAGADO nunca puede volver a estado BORRADOR"].
2. [Invariante 2, ej: "Los precios siempre se almacenan como enteros en centavos"].
```

---

## 🏛️ Formato de ADR (`docs/adr/XXXX-titulo.md`)

```markdown
# ADR-0001: [Título de la Decisión]

- **Estado**: Propuesto | Aceptado | Reemplazado por ADR-XXXX
- **Fecha**: AAAA-MM-DD
- **Decisores**: [Roles / Personas]

## Contexto y Problema
[Descripción concisa del problema técnico o de negocio y las fuerzas/restricciones en juego].

## Opciones Consideradas (Design It Twice)
1. **Opción A**: [Pros y Contras]
2. **Opción B**: [Pros y Contras]

## Decisión
[La opción elegida y el motivo principal por el cual se seleccionó].

## Consecuencias
- **Positivas**: [Beneficios obtenidos]
- **Negativas / Riesgos**: [Trade-offs aceptados y mitigaciones]
```

---

## ⚡ Disciplina Operativa para Agentes

1. **Desafiar la jerga**: Si el usuario o una spec usa un término nuevo o poco claro, pregunta de inmediato: *"¿Cómo definimos X en nuestro CONTEXT.md?"*.
2. **Actualización continua**: Al cerrar una ronda de clarificación o spec (Fase 1 y 2 de SDD), actualiza `CONTEXT.md` con los términos formalizados.
3. **Consulta previa**: Antes de proponer nombres de clases, endpoints o tablas, consulta `CONTEXT.md` para asegurar consistencia terminológica absoluta.
