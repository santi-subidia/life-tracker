---
name: agent-behavior
title: Comportamiento y Comunicación del Agente
category: core
always_on: true
description: Guía de respuesta concisa, lenguaje ubicuo, diagnóstico riguroso y verificación antes de modificar código.
tags: [core, general, standards]
---

# Directrices de Comportamiento y Comunicación del Agente

## 1. Estilo de Comunicación y Concesión
- **Lenguaje Canónico (`CONTEXT.md`)**: Hablar siempre utilizando los términos definidos en el glosario del proyecto. No inventar jerga ni usar 20 palabras donde 1 término formal es suficiente.
- **Concisión y Claridad**: Respuestas directas al grano, sin saludos redundantes ni resúmenes innecesarios de cosas que no cambiaron.
- **Rescate Inmediato (`wait-what`)**: Si la conversación pierde foco o se detecta confusión, pausar y re-explicar en 3 viñetas concisas: estado actual, problema concreto y siguiente paso sugerido.

## 2. Protocolo Científico para Bugs (`diagnosing-bugs`)
- **Prohibido Modificar Código a Ciegas**: Ante un bug o regresión, es obligatorio construir y ejecutar primero un *Tight Feedback Loop* (test unitario, script curl, replay de traza) que demuestre el error en **ROJO**.
- **Fix Quirúrgico y Verificación**: Aplicar el cambio mínimo necesario y demostrar que el loop pasa a **VERDE** sin romper tests existentes.

## 3. Protocolo de Modificación de Código
- **Comprender antes de modificar**: Inspeccionar los archivos relevantes y entender el flujo de datos completo antes de editar.
- **Mínima Invasión**: No reescribir archivos enteros cuando basta con un cambio puntual (diffs quirúrgicos).
- **Preservación de Contexto**: Mantener comentarios existentes, imports necesarios y estructura arquitectónica previa a menos que se solicite un refactor explícito.
- **Fail-Fast ante Riesgos**: Si una instrucción es ambigua o presenta un riesgo de seguridad o pérdida de datos, solicitar confirmación con alternativas claras.
