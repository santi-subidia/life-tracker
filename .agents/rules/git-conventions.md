---
name: git-conventions
title: Convenciones de Git y Commits Semánticos
category: core
always_on: true
description: Estándares para mensajes de commit (Conventional Commits), flujo de ramas y gestión de cambios.
tags: [core, git, workflow]
---

# Convenciones de Git y Control de Versiones

## 1. Formato de Commits (Conventional Commits)
Los mensajes de commit deben seguir el estándar:
`<tipo>(<alcance opcional>): <descripción concisa en minúsculas y modo imperativo>`

### Tipos Permitidos:
- `feat`: Nueva característica o funcionalidad visible para el usuario/sistema.
- `fix`: Corrección de un error o bug.
- `refactor`: Cambio en el código que no corrige un bug ni añade una característica nueva.
- `perf`: Cambio enfocado en mejorar el rendimiento.
- `style`: Cambios de formato, espacios, comas, sin cambio en lógica de código.
- `docs`: Modificación o adición de documentación o comentarios.
- `test`: Adición o corrección de pruebas unitarias o de integración.
- `chore`: Tareas de mantenimiento, dependencias, tooling o configuración de CI/build.

### Ejemplos:
- `feat(auth): add google oauth login support`
- `fix(booking): prevent duplicate reservation on double click`
- `refactor(db): extract query client into singleton helper`
- `chore(deps): update next to v15.2.0`

## 2. Reglas de Staging y Commits
- Realizar commits atómicos y cohesionados: cada commit debe representar un cambio lógico único.
- Nunca commitear credenciales, variables `.env` privadas o archivos temporales/artefactos de build.
- Verificar el estado con `git status` y `git diff` antes de commitear.
