---
name: ui-craftsmanship
title: Dirección de Arte Frontend, Visitor Modes y Craft Floor
description: >-
  Guía de artesanía visual, dirección de arte e ingeniería de interfaz para eliminar el monocultivo de IA
  (AI frontend slop). Establece los 4 Visitor Modes (Persuade, Operate, Read, Experience), el piso de calidad
  (Craft Floor), lista de anti-patrones prohibidos, sistema de color OKLCH y diseño de superficies nativas.
category: frontend
always_on: false
tags: [frontend, ui, ux, design-system, craftsmanship, art-direction, oklch, typography, motion]
---

# UI Craftsmanship: Dirección de Arte & Craft Floor 🎨

Esta skill proporciona las directivas y permisos para crear interfaces con **artesanía visual fuera de serie (*out-of-distribution craft*)**. En lugar de generar interfaces predecibles, tímidas o genéricas (el clásico "AI slop" con fuente Inter, gradientes púrpura/azul y tarjetas dentro de tarjetas), aborda cada interfaz con el criterio de un **Director de Arte e Ingeniero de Interfaz Principal**.

---

## 🏛️ 1. Modos de Superficie (*Visitor Modes*)

El diseño no es uniforme en todo el proyecto; se adapta al objetivo del usuario en la superficie o pantalla específica:

### 1. `Persuade` (El usuario decide y actúa)
- **Dónde aplica**: Landing pages, páginas de marketing, pricing, anuncios, campañas.
- **Filosofía**: El diseño *es* el producto. Requiere alto impacto visual, tipografía con carácter, composiciones asimétricas audaces y narrativa visual enfocada en la conversión.
- **Regla**: Gana la atención desde el primer viewport.

### 2. `Operate` (El usuario completa una tarea)
- **Dónde aplica**: Dashboards, paneles de control, tablas de datos, editores, configuración, herramientas SaaS.
- **Filosofía**: La ergonomía, densidad de información y escaneabilidad superan a la decoración. La personalidad de la marca vive en los micro-detalles (anillos de foco, bordes sutiles, micro-interacciones rápidas), no en ilustraciones invasivas.
- **Regla**: Cero fricción visual; máxima velocidad y predecibilidad.

### 3. `Read` (El usuario busca comprender)
- **Dónde aplica**: Documentación técnica, artículos de blog, guías de usuario, changelogs.
- **Filosofía**: La tipografía es la protagonista. Medida de línea estricta de **45 a 75 caracteres (`max-w-prose` / `ch`)**, ritmo vertical armónico, jerarquía clara de encabezados y lectura descansada.
- **Regla**: Estructurar para escaneo rápido y comprensión profunda.

### 4. `Experience` (El usuario está inmerso en la obra)
- **Dónde aplica**: Portafolios, galerías interactivas, showcases creativos.
- **Filosofía**: La interfaz retrocede y el contenido/artefacto lidera desde el primer segundo.
- **Regla**: La interfaz sirve como marco o escenario; no compite con el contenido.

---

## 🛑 2. El Craft Floor & Lista de Rechazos (*Anti-Patterns*)

Estas son prácticas prohibidas que los modelos de IA aplican por reflejo perezoso. **Recházalas siempre**:

### 🚫 Estructura y Composición
1. **No a las cuadrículas de tarjetas idénticas**: Evitar la cuadrícula repetitiva de `[Ícono redondeado] + [Título h3] + [Párrafo gris]` en cada sección de la página. Varía la jerarquía, el ritmo y la escala.
2. **Prohibido anidar tarjetas dentro de tarjetas (*Cards in cards*)**: Las tarjetas son un contenedor básico; anidarlas demuestra falta de arquitectura visual.
3. **Prohibido el *kicker / eyebrow*** (la píldora/etiqueta flotante con texto en mayúsculas arriba de cada título en cada sección): El encabezado principal debe tener el peso y redacción suficientes para explicarse solo.
4. **No a los números de sección decorativos (`01 / 02 / 03`)** a menos que representen un flujo paso a paso real y secuencial.
5. **No a los modales por reflejo**: No uses modales para tareas que no requieran aislar el foco de atención o interrumpir al usuario. Prefiere drawers, paneles laterales o edición inline.

### 🚫 Color y Superficies
1. **Cero texto gris sobre fondos de color**: En superficies con tinte (fondos azules, oscuros, etc.), el texto secundario debe estar tintado con el matiz (*hue*) del fondo o del texto principal. El gris neutro sobre fondos saturados luce "muerto" y descuidado.
2. **Cero negro o gris puro (`#000000` / `#888888`)**: Utiliza neutros cálidos o fríos tintados (*tinted neutrals*) en espacio `oklch`.
3. **No al texto con gradientes decorativos**: El énfasis se logra con tamaño, peso tipográfico, color sólido contrastante o espaciado.
4. **No al *glassmorphism* o desenfoque decorativo sin función**: El blur solo se justifica en capas superpuestas para mantener legibilidad sobre contenido dinámico que se desplaza.
5. **No a las rayas laterales de color en tarjetas (`border-l-4`)**: Utiliza bordes sutiles completos, fondos con contraste suave o indicadores de estado semánticos.

### 🚫 Gráficos y Decoración
1. **No a los SVGs "tipo boceto" o ilustraciones falsas con ruido/grano (`feTurbulence`)**: Si no hay ilustraciones vectoriales profesionales o fotografías reales, usa geometría pura, tipografía o gráficos de datos reales.
2. **No a los emojis como sistema de íconos**: Usa librerías consistentes de íconos vectoriales (Lucide, Heroicons, Phosphor) con el mismo grosor de trazo (*stroke-width*) y escala óptica.
3. **No a las sombras duras de bloque (`box-shadow: 4px 4px 0`)** salvo en diseños estrictamente neobrutalistas intencionales.

---

## 📐 3. Leyes de Tipografía, Espaciado y Movimiento

### 🔤 Tipografía
- **Medida Áurea de Lectura**: Los párrafos de lectura deben contener entre **45 y 75 caracteres por línea** (`max-w-prose` o `65ch`).
- **Piso Mínimo Móvil**: En formularios móviles, los inputs deben tener al menos **16px (1rem)** de `font-size`. Tamaños menores provocan que iOS Safari haga zoom automático forzado al enfocar, rompiendo la composición.
- **Tracking Calibrado**: En titulares grandes, aplica tracking ligeramente negativo (`-0.02em` a `-0.03em`). Nunca uses tracking inferior a `-0.04em`.
- **Interlineado Inverso**: A mayor ancho de columna o mayor tamaño de fuente, ajusta el `line-height` de manera inversa (títulos grandes: `leading-tight` ~1.1-1.2; cuerpo extenso: `leading-relaxed` ~1.6-1.75).
- **Compensación en Dark Mode**: El texto claro sobre fondo oscuro tiende a expandirse ópticamente. Aumenta sutilmente el tracking y el `line-height` en modo oscuro.

### 🎨 Espacio de Color `OKLCH`
- Modela paletas usando `oklch(L C H)` donde:
  - `L` (Lightness/Luminosidad: 0% a 100%): Garantiza ratios de contraste WCAG AA predecibles.
  - `C` (Chroma/Saturación: 0 a 0.3+): Controla la intensidad del color.
  - `H` (Hue/Matiz: 0 a 360°): Define el tono de color.
- Asegura siempre contraste WCAG AA:
  - **Texto normal**: Contraste ≥ 4.5:1.
  - **Texto grande (≥18pt o 14pt bold)**: Contraste ≥ 3:1.

### ⏱️ Movimiento y Micro-interacciones
- **Duraciones según el propósito**:
  - `100–150ms`: Feedback inmediato (hover, active, toggle, click).
  - `150–300ms`: Cambios de estado en componentes (abrir dropdown, acordeón, tabs).
  - `300–500ms`: Transiciones de layout, modales o cambios de vista.
- **Curvas de Aceleración**:
  - **Salidas más rápidas que las entradas** (*exit faster than entrance*).
  - Usar curvas naturales de desaceleración: `cubic-bezier(0.16, 1, 0.3, 1)` o `ease-out`.
  - 🚫 **Prohibido el rebote (*bounce/elastic*) por defecto**: daña la percepción de velocidad y profesionalismo.
- **Soporte Mandatorio de `prefers-reduced-motion`**:
  - Proporcionar siempre una variante para usuarios con sensibilidad al movimiento, reemplazando desplazamientos espaciales por transiciones suaves de opacidad y color, sin apagar el feedback de estado.

---

## 🖌️ 4. Superficies Nativas del Navegador

Los detalles marcan la diferencia entre una interfaz "ensamblada por defecto" y una con verdadera artesanía:

1. **Selección de Texto (`::selection`)**:
   - `selection:bg-primary/20 selection:text-primary-foreground` estilizado acorde a la paleta.
2. **Color de Cursor (`caret-color`)**:
   - Asignar el color de acento de la marca en inputs y textareas.
3. **Anillos de Foco Accesibles (`:focus-visible`)**:
   - `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` (o `focus-visible:ring-offset-background`).
4. **Barras de Desplazamiento (`scrollbar-gutter / scrollbar-color`)**:
   - Evitar saltos de layout (*layout shift*) con `scrollbar-gutter: stable`.
5. **Números Tabulares en Datos Financieros/Métricas**:
   - `font-variant-numeric: tabular-nums` o clase `tabular-nums` para evitar que las columnas salten cuando los dígitos cambian.

---

## 📋 5. Contrato de Diseño: `DESIGN.md`

Cuando un proyecto posea o requiera un sistema visual formal, utiliza `DESIGN.md` en la raíz del proyecto como la **única fuente de verdad** para tokens de color, tipografía, espaciado, elevación y radios. Consulta la plantilla en `templates/DESIGN.template.md`.
