---
name: wait-what
description: >-
  Freno de mano para el asistente cuando una explicación sea confusa, verbosa o se desvíe del objetivo.
  Pausa la ejecución y re-explica en lenguaje técnico simplificado y conciso.
---

# Wait-What: Comando de Rescate y Re-Enfoque

Comando para cuando la conversación pierda claridad, el agente se sobrecomplique o se sienta que no está entendiendo el problema real.

---

## 🛑 Protocolo de Respuesta Inmediata

Cuando se invoque este skill o el usuario diga *"para un momento"*, *"no te entiendo"*, *"wait what"* o *"re-explica esto"*:

1. **Detener cualquier generación de código o acción en curso de inmediato.**
2. **Re-plantear la situación en un máximo de 3 viñetas concisas**:
   - **Dónde estamos**: El estado actual exacto del trabajo.
   - **Qué estamos intentando resolver**: El problema concreto sin tecnicismos superfluos.
   - **Siguiente paso propuesto**: La acción inmediata que se recomienda tomar.
3. **Usar lenguaje canónico**: Utilizar únicamente los términos formales definidos en `CONTEXT.md`.
4. **Pedir confirmación simple**: Preguntar al usuario: *"¿Es esto correcto o prefieres que tomemos otro camino?"*.
