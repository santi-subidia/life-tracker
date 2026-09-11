# ADR-0003: Segregación Estricta de Roles RBAC (Admin de Cuentas vs Usuarios de SOMA)

- **Estado**: Aceptado
- **Fecha**: 2026-09-11
- **Decisores**: Subi, Tech Lead / Orchestrator, System Architect

## Contexto y Problema
SOMA evoluciona de un entorno mono-usuario en desarrollo hacia una plataforma multi-usuario donde múltiples personas pueden utilizar el sistema de forma independiente y segura.
Se requiere un esquema de control de acceso basado en roles (RBAC) con una premisa de negocio cardinal:
1. El rol `admin` tiene como **única función** la administración y gestión de las cuentas de acceso (crear usuarios, asignar roles, activar/desactivar cuentas, resetear credenciales).
2. Los administradores **no** utilizan ni tienen acceso a los módulos de vida personal de SOMA (Salud, Hábitos, Finanzas, Notas, etc.) para preservar la estricta privacidad de los usuarios.
3. El rol `user` es el destinatario de las capacidades de SOMA y no tiene acceso a las funciones ni rutas administrativas.
4. No existe auto-registro público abierto; la creación de cuentas es privada y gestionada exclusivamente por los administradores.

## Opciones Consideradas (Design It Twice)

### Opción A: Superusuario Universal (Admin con acceso total a SOMA y gestión de usuarios)
- **Pros**: Un único rol con permisos crecientes; el admin puede "probar" o usar su propia instancia de SOMA con la misma cuenta.
- **Contras**: Viola el principio de menor privilegio (*Principle of Least Privilege*); diluye la responsabilidad del rol admin; genera riesgos de privacidad si un administrador técnico accede a módulos íntimos (salud, finanzas personales); contradice el requerimiento explícito del usuario.

### Opción B: Segregación Estricta de Dominios (Admin exclusivo de Identidad vs User operativo de SOMA)
- **Pros**:
  - Cumplimiento exacto de la directriz de producto de Subi: *"un rol admin que lo único que haga es manejar las cuentas de acceso luego tenemos los usuarios que van a ser los que utilicen SOMA"*.
  - Máximo aislamiento de responsabilidades y privacidad por diseño (*Privacy by Design*).
  - En la API: Políticas de autorización claras (`AdminOnly` en `/api/admin/*` y `UserOnly` en `/api/*` del Life OS).
  - En el Frontend: Redirección automática según rol: el `admin` es dirigido a `/admin` y el `user` a `/hoy`.
- **Contras**: Si un administrador desea tener su propio Life OS en SOMA, debe crearse una cuenta separada con rol `user`.

## Decisión
Se adopta la **Opción B: Segregación Estricta de Dominios (Admin exclusivo de Identidad vs User operativo de SOMA)**.

## Consecuencias
- **Positivas**:
  - El rol `admin` sólo interactúa con la API de administración y el panel `/admin`.
  - El rol `user` sólo interactúa con las APIs y vistas de SOMA.
  - La seguridad de la API no depende de roles acumulativos sino de políticas disyuntas y verificables por JWT claim `role`.
- **Riesgos y Mitigaciones**:
  - *Bloqueo involuntario de admin*: Se garantiza un usuario admin inicial presembrado mediante migración SQL (`admin@soma.local`).
