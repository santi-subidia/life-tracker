---
name: ui-hardening-audit
title: Auditoría de Calidad Técnica, Hardening y Polish de UI
description: >-
  Auditoría en 5 dimensiones (Accesibilidad WCAG AA, Rendimiento, Theming, Responsive e Integridad),
  blindaje contra datos reales extremos (text overflow, i18n, 4 estados de UI, zero-CLS skeletons) y
  protocolo de pulido pre-entrega (Polish Pre-Ship Checklist).
category: frontend
always_on: false
tags: [frontend, audit, hardening, polish, a11y, performance, wcag, responsive, i18n]
---

# UI Hardening, Auditoría Técnica & Polish 🛡️

Las interfaces que solo funcionan con datos perfectos no están listas para producción. Esta skill proporciona el protocolo riguroso para **auditar técnicamente, blindar ante datos extremos y pulir la experiencia visual** antes de liberar cualquier componente o pantalla al usuario.

---

## 🔍 1. Auditoría Técnica en 5 Dimensiones

Al auditar una interfaz, evalúa cada una de las 5 dimensiones en una escala de **0 a 4 puntos** (Total: **20 puntos**):

```
Rango de Salud de la UI:
- 18–20: Excelente (Lista para entrega / shipping)
- 14–17: Buena (Detalles menores de pulido)
- 10–13: Aceptable (Requiere trabajo en dimensiones débiles)
- 0–9:   Crítica (Fallos fundamentales; requiere rebuild o refactor)
```

### Dimensión 1: Accesibilidad (A11y)
- **Contrastes**: Texto normal ≥ 4.5:1; texto grande (≥18pt o 14pt bold) ≥ 3:1.
- **Navegación por Teclado**: Todo control interactivo es alcanzable con `Tab`, operable con `Enter`/`Space` y no genera trampas de foco (*keyboard traps*).
- **Indicadores de Foco**: Anillo visible `:focus-visible` presente en botones, links e inputs.
- **HTML Semántico**: Uso de `<main>`, `<nav>`, `<header>`, `<button>` (nunca `<div onClick>`), y jerarquía lógica de `<h1>` a `<h6>`.
- **Sensibilidad al Movimiento**: Reglas `motion-reduce:` o `@media (prefers-reduced-motion)` que reemplacen movimientos bruscos por transiciones suaves de opacidad.
- **Etiquetas y Formularios**: Inputs con `<label>` asociado o `aria-label`, mensajes de error referenciados con `aria-describedby`.

### Dimensión 2: Rendimiento y Fluidez Visual
- **Zero Layout Shift (CLS)**: Contenedores de imágenes y medios con `aspect-ratio` o dimensiones explícitas. Skeletons de carga que replican exactamente las dimensiones finales.
- **Animaciones Baratas**: Uso exclusivo de transformaciones de GPU (`transform: translate3d/scale`, `opacity`). Prohibido animar `width`, `height`, `top`, `left` o `margin`.
- **Uso Controlado de `will-change`**: Solo durante animaciones activas; nunca permanente en reposo.
- **Carga Diferida**: Imágenes con `loading="lazy"` y componentes pesados con dynamic import (`next/dynamic` o `React.lazy`).

### Dimensión 3: Theming y Consistencia de Tokens
- **Cero Colores Hardcodeados**: No usar `#hex` o `rgb()` arbitrarios fuera de los tokens semánticos o `DESIGN.md`.
- **Modo Oscuro Impecable**: Ratios de contraste comprobados en Light y Dark mode. Los fondos oscuros usan neutros tintados (`oklch`), nunca negro puro `#000`.
- **Transiciones de Tema**: Sin parpadeos ni elementos que mantengan colores desactualizados al alternar el modo.

### Dimensión 4: Diseño Responsivo y Ergonomía
- **Touch Targets Móviles**: Todo botón, link o control interactivo mide al menos **44x44px** en pantallas táctiles (`p-3`, `min-h-[44px]`).
- **Piso Mínimo de Inputs (Prevención Zoom iOS)**: `font-size: 1rem (16px)` en campos de entrada para evitar que iOS Safari dispare el zoom forzado de pantalla.
- **Cero Desborde Horizontal**: Ningún elemento genera scrollbar horizontal inesperado (`overflow-x: hidden` en el viewport y `min-w-0` en flex items).

### Dimensión 5: Integridad de Implementación
- **Fidelidad al Sistema**: Cumplimiento del contrato de `DESIGN.md` o Tailwind `@theme`.
- **Ausencia de AI Slop**: Cero tarjetas anidadas, cero kickers/eyebrows innecesarios, cero textos con gradientes decorativos.

---

## 🛡️ 2. Hardening: Blindaje contra Datos Reales

### A. Desbordes y Truncamiento de Texto
Los textos reales pueden ser de 1 palabra o de 500 palabras. Prevé:

```tsx
// 1. Truncamiento en una línea con tooltip
<p className="truncate max-w-[200px]" title={fullName}>
  {fullName}
</p>

// 2. Límite multilínea con line-clamp
<p className="line-clamp-2 text-sm text-muted-foreground">
  {description}
</p>

// 3. Flexbox que no colapsa por textos largos
<div className="flex items-center gap-3 min-w-0">
  <Avatar />
  <span className="truncate min-w-0 flex-1">{username}</span>
</div>
```

### B. Expansión de Texto e Internacionalización (i18n)
- **Presupuesto de Espacio**: Diseñar con un **30% a 40% de holgura espacial** (traducciones a idiomas como alemán o francés son notablemente más largas que en inglés o español).
- **Evitar Anchos Fijos**: Usar `px-4 py-2` en botones en lugar de `w-32`.
- **Propiedades Lógicas**: Preferir `ms-` (*margin-inline-start*) y `pe-` (*padding-inline-end*) si la aplicación soporta idiomas RTL (árabe, hebreo).
- **Formateo con `Intl`**: Usar `Intl.NumberFormat` e `Intl.DateTimeFormat` para fechas, monedas y números tabulares (`tabular-nums`).

### C. Los 4 Estados Mandatorios de la UI
Toda vista, tabla o sección que consuma datos asíncronos **debe implementar obligatoriamente los 4 estados**:

1. **`Loading (Skeleton)`**:
   - Estructura esquelética animada (`animate-pulse`) que replica exactamente la altura, anchura y distribución de la UI final para evitar CLS (Cumulative Layout Shift).
2. **`Empty (Sin datos)`**:
   - Ilustración o ícono sutil con mensaje claro explicando la ausencia de datos y un **Call To Action primario** para crear o inicializar el recurso.
3. **`Error (Fallo de red/servidor)`**:
   - Mensaje descriptivo comprensible (sin códigos HTTP crudos) y un botón de reintento (*Retry / Recargar*).
4. **`Success (Datos renderizados)`**:
   - La interfaz completa con datos reales o paginación.

---

## ✨ 3. Checklist de Polish Pre-Ship (Entrega Final)

Antes de marcar una tarea o componente como completado, ejecuta esta verificación:

1. **Prueba de Interacción**:
   - [ ] Estados `:hover`, `:active`, `:focus-visible` y `:disabled` claros en cada botón e input.
   - [ ] Cero retraso perceptible en clics o transiciones (feedback < 150ms).
2. **Prueba en Viewports Reales**:
   - [ ] Móvil estrecho (360px – 390px): sin desbordes horizontales, inputs ≥ 16px, touch targets ≥ 44px.
   - [ ] Tablet (768px – 1024px): distribución equilibrada en grid/flex.
   - [ ] Desktop amplio (1440px+): anchos máximos controlados (`max-w-7xl` o `max-w-prose`).
3. **Prueba de Modo Oscuro**:
   - [ ] Contraste verificado; sin textos grises ilegibles ni bordes excesivamente brillantes.
4. **Limpieza de Código**:
   - [ ] Eliminación de `console.log`, estilos huérfanos o clases duplicadas.
   - [ ] Integración mediante función helper `cn(...)` (`clsx` + `tailwind-merge`).
