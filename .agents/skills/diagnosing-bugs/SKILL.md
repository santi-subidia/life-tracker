---
name: diagnosing-bugs
description: >-
  Protocolo riguroso de diagnóstico y depuración para bugs complejos y regresiones.
  Úsalo cuando el usuario reporte un bug, fallo, excepción, comportamiento inesperado o lentitud.
---

# Diagnosing Bugs: Diagnóstico Científico & Feedback Loops

Disciplina innegociable para la resolución de bugs difíciles. Prohibido adivinar o aplicar parches sin evidencia reproducible.

> [!CAUTION]
> **Regla Innegociable: Prohibido modificar código sin un Tight Feedback Loop previo**.
> Si no tienes un comando automatizado que reproduzca el error de forma determinística en ROJO, cualquier cambio que hagas en el código es mera especulación.

---

## 🔒 0. Redacción y Seguridad

Antes de capturar traces, logs o salidas de comandos, **redacta todas las credenciales, API keys o tokens**:
- Reemplaza secretos con `<REDACTED>`.
- Inyecta variables de entorno en lugar de escribir contraseñas en scripts de prueba.

---

## 🔄 Las 4 Fases del Diagnóstico

### 🔹 Fase 1: Construir el Feedback Loop (El 90% del trabajo)

Crea un mecanismo de prueba rápido (< 2 segundos), determinístico y aislado. 

**Opciones para construir el loop (en orden de preferencia):**
1. **Test unitario o de integración fallando** en el seam exacto que toca el bug.
2. **Script cURL / HTTP** contra el servidor de desarrollo local con payload específico.
3. **Invocación CLI con fixtures** comparando la salida (`stdout`/`stderr`) contra el snapshot esperado.
4. **Script de navegador headless** (Playwright / Puppeteer) que replique la interacción y valide DOM/consola/red.
5. **Replay de traza capturada**: Guardar el payload/evento real a disco y pasarlo por la función en aislamiento.
6. **Arnés de prueba mínimo (throwaway harness)**: Un pequeño script que instancie la clase con dependencias mockeadas y ejecute el método afectado.

**Criterio de éxito de la Fase 1:**
- Tienes **un solo comando** que has ejecutado y que demuestra el fallo en pantalla (**ROJO**).

---

### 🔹 Fase 2: Reducción y Aislamiento

1. **Aislar variables**: Eliminar capas intermedias hasta que el loop toque el código mínimo necesario.
2. **Bisección (si es regresión)**: Usar `git bisect` entre la versión buena y la rota para identificar el commit exacto causante.
3. **Bugs no determinísticos**: Elevar la tasa de reproducción (ejecutar 100 iteraciones en bucle, inyectar latencia controlada o fijar semillas aleatorias) hasta lograr 100% de reproducibilidad.

---

### 🔹 Fase 3: Hipótesis y Fix Quirúrgico

1. Formular una hipótesis clara: *"El bug ocurre porque X asume Y cuando Z es nulo"*.
2. Verificar la hipótesis inspeccionando el estado exacto en el loop.
3. Aplicar el cambio mínimo necesario respetando la arquitectura y sin efectos secundarios.

---

### 🔹 Fase 4: Demostración en Verde y Prevención de Regresiones

1. Ejecutar el feedback loop de la Fase 1: debe pasar a **VERDE**.
2. Ejecutar la suite completa de pruebas del proyecto para garantizar cero regresiones.
3. Convertir el arnés o script de reproducción en un test permanente del repositorio (`test(regression): ...`).
