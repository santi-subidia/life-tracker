---
name: codebase-design
description: >-
  Vocabulario y principios para diseñar módulos profundos (Deep Modules), costuras limpias (Seams)
  y aplicar 'Design It Twice'. Úsalo al diseñar interfaces, estructurar paquetes o refactorizar.
---

# Codebase Design: Módulos Profundos y Arquitectura Limpia

Principios de diseño inspirados en John Ousterhout (*A Philosophy of Software Design*) y Michael Feathers (*Working Effectively with Legacy Code*).

El objetivo es maximizar el **leverage** para los consumidores del código y la **localidad** para los mantenedores.

---

## 📚 Glosario Fundamental

- **Módulo**: Cualquier unidad con una interfaz y una implementación (función, clase, módulo, servicio, paquete).
- **Interfaz**: Todo lo que un llamador debe saber para usar el módulo correctamente (tipos, invariantes, orden de llamadas, manejo de errores y configuración).
- **Implementación**: El código interno que realiza el trabajo real.
- **Profundidad (Depth)**:
  - **Módulo Profundo (Deep Module)**: Ofrece mucha funcionalidad y valor detrás de una interfaz simple y compacta. *(Ejemplo ideal: `fs.readFile()` o una abstracción de base de datos bien diseñada)*.
  - **Módulo Poco Profundo (Shallow Module)**: La interfaz es casi tan compleja como la implementación. Agrega costo cognitivo sin aportar valor real. *(Evitar wrappers triviales que solo delegan)*.
- **Costura (Seam - Michael Feathers)**: Un punto en el código donde puedes alterar o sustituir un comportamiento sin tener que editar el código en ese lugar (ej. inyección de dependencias, interfaces abstractas, eventos).
- **Adaptador (Adapter)**: La implementación concreta que satisface una interfaz en un Seam (ej. `PostgresUserRepository` vs `InMemoryUserRepository`).

---

## 🎯 Principios de Diseño

### 1. Módulos Profundos por Defecto
Oculta la complejidad interna. Los llamadores deben beneficiarse de validaciones, caché, transacciones o reintentos sin tener que configurarlos explícitamente en cada llamada.

### 2. Design It Twice (Diseña dos veces)
Nunca te quedes con la primera idea de diseño que se te ocurra. Para cualquier interfaz, modelo de datos o seam importante:
1. Propón la **Alternativa A** (usualmente la intuitiva o directa).
2. Propón la **Alternativa B** (un enfoque radicalmente diferente, ej: basada en eventos vs llamada síncrona, o datos inmutables vs mutación).
3. Contrasta pros, contras y trade-offs antes de escribir la implementación.

### 3. Costuras Claras (Seams) para Testabilidad
Coloca los Seams en los bordes naturales de I/O (bases de datos, APIs de terceros, reloj del sistema, sistema de archivos). Esto permite testear la lógica de negocio completa sin necesitar mocks frágiles ni servidores levantados.
