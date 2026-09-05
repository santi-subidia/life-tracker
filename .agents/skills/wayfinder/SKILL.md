---
name: wayfinder
description: >-
  Planificación y gestión de iniciativas grandes (Epics) que superan el contexto de una sola sesión de IA.
  Traza un mapa de decisiones y tickets atómicos con dependencias de bloqueo.
---

# Wayfinder: Navegación de Iniciativas Grandes (Epics)

Cuando una feature o refactorización es demasiado grande para resolverse en una sola sesión de IA (más de 100k tokens o múltiples días de trabajo), **Wayfinder** permite cartografiar el camino mediante un **Mapa de Decisiones** y tickets atómicos.

---

## 🗺️ Conceptos del Protocolo Wayfinder

1. **El Destino (Destination)**: La definición clara de qué significa haber completado la iniciativa (ej: *"Migración completa de auth a Supabase con todos los tests pasando"*).
2. **El Mapa (The Map)**: Un documento central (`.specs/<epic>/map.md` o Issue padre con etiqueta `wayfinder:map`) que actúa como índice viviente de decisiones tomadas y pendientes.
3. **La Frontera (The Frontier)**: El conjunto de tickets abiertos que **no están bloqueados por ningún otro ticket**. Son las únicas tareas ejecutables en la sesión actual.
4. **Tickets Atómicos (Sized for 1 Session)**: Cada ticket resuelve una sola decisión, spike de investigación o slice vertical de código acotado a una sola sesión.

---

## 📄 Estructura del Mapa (`map.md`)

```markdown
# Wayfinder Map: [Nombre de la Iniciativa / Epic]

## 🎯 Destino
[Descripción de 1 a 2 líneas del estado final deseado].

## 🧭 Frontera de Trabajo Actual (Desbloqueados y Listos)
- [ ] **[WF-01]**: Investigar esquema de tokens y compatibilidad con Next.js middleware.
- [ ] **[WF-02]**: Crear contratos de interfaces para el nuevo AuthService.

## 🔒 Tareas Bloqueadas (En Espera de la Frontera)
- [ ] **[WF-03]**: Implementar SupabaseAuthAdapter (Bloqueado por WF-01 y WF-02).
- [ ] **[WF-04]**: Migrar vistas de login en frontend (Bloqueado por WF-03).

## 📜 Decisiones Consolidadas
- **[WF-00: Elección de proveedor]**: Decidido usar Supabase Auth vía email OTP (ver ADR-0003).
```

---

## 🔄 Flujo de Ejecución por Sesión

1. **Orientación al inicio de sesión**: Leer `map.md`, ubicar el Destino y consultar la Frontera actual.
2. **Tomar un ticket de la frontera**: Reclamar el ticket y ejecutar la investigación o implementación.
3. **Cerrar y actualizar el mapa**:
   - Documentar la decisión o resultado.
   - Desbloquear los tickets sucesores.
   - Si se descubren incógnitas nuevas ("niebla de guerra"), agregarlas como nuevos tickets en el mapa antes de cerrar la sesión.
