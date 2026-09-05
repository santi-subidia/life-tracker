---
name: clean-code
title: Principios de Clean Code y Calidad de Software
category: core
always_on: true
description: Principios de legibilidad, arquitectura limpia, Deep Modules, Seams, Design It Twice, SOLID, DRY y manejo defensivo.
tags: [core, clean-code, architecture]
---

# Principios de Clean Code y Calidad de Software

## 1. Módulos Profundos y Diseño de Interfaces (John Ousterhout)
- **Deep Modules por Defecto**: Diseñar módulos que ofrezcan gran potencia funcional detrás de interfaces mínimas y sencillas de aprender.
- **Evitar Shallow Modules**: No crear wrappers o capas intermedias superfluas que solo replican la interfaz de lo que envuelven sin añadir valor.
- **Ocultamiento de Información (Information Hiding)**: Ocultar los detalles de implementación (estrategias de caché, formatos de serialización, reintentos) para que los llamadores no dependan de ellos.
- **Design It Twice**: Para componentes críticos, evaluar siempre al menos dos alternativas de diseño antes de escribir la solución final.

## 2. Costuras (Seams) y Testabilidad (Michael Feathers)
- **Costuras Claras**: Ubicar los seams en los límites naturales de I/O (bases de datos, APIs externas, reloj del sistema) para permitir testing determinístico sin necesidad de mocks frágiles.
- **Inversión de Dependencias (DIP)**: Los módulos de alto nivel no deben depender de detalles de bajo nivel; ambos deben depender de abstracciones.

## 3. Nombres y Expresividad
- **Lenguaje Ubicuo (`CONTEXT.md`)**: Utilizar consistentemente los términos del dominio de negocio acordados en todo el código.
- **Nombres con Significado**: Variables, funciones y clases deben revelar su intención sin necesidad de comentarios redundantes.
- **Funciones Pequeñas y de Responsabilidad Única (SRP)**: Una función debe hacer una sola cosa y hacerla bien.

## 4. Simplicidad y Manejo Defensivo
- **KISS (Keep It Simple, Stupid)**: Preferir la solución más directa y simple que cumpla con los requisitos.
- **Fail Fast**: Validar entradas y argumentos en las fronteras de las funciones y APIs.
- **Manejo Explícito de Errores**: Prohibido silenciar excepciones o usar bloques `catch` vacíos.
- **Inmutabilidad por Defecto**: Preferir estructuras de datos inmutables y funciones puras cuando sea posible.
