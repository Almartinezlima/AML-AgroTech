# 9 nov 2026 — Fase 0: reglas y especificación

## Contexto

- Lab 10: subir la primera versión a **Render** y enviar enlace, número de grupo (20), nombre de la app (AML AgroTech) e integrantes (Aldo Martínez Lima, Miguel Alejandro Nava Mamani). Los 3 mejores proyectos van a la feria de software y no dan examen.
- Pedido del docente (pizarra y cuaderno): SDD con historias de usuario y casos de uso, pila de desarrollo, arquitectura de web services con API REST, los pilares funcionando (seguridad, pagos, distribución, e-commerce + almacenamiento) y diagramas UML (casos de uso, clases, componentes, despliegue).

## Revisión del estado real

- GitHub coincide con la laptop (solo faltaba `CONTEXTO_PROYECTO.md`).
- El documento de contexto del 29 oct decía que el carrito guardaba pedidos: **no es así**. "Confirmar pedido" solo muestra un número aleatorio y `/pedidos` no está conectado. 0 pedidos en la base.
- Vulnerabilidad: un usuario puede cambiar su propio `rol` (política `perfil_update` sin proteger columnas).
- `0001_init_schema.sql` no coincide con la base real.

## Qué se hizo

- `CLAUDE.md` con las reglas de trabajo y técnicas (adaptadas de AgroGestión).
- `.claude/settings.json` (commits sin firma de IA) y skills `verificar`, `migracion`, `cerrar-frente`.
- `docs/`: README, ESTADO, ARQUITECTURA (capas, modelo de datos, API REST, carpetas) y `specs/` con historias de usuario, criterios y casos de uso de los 5 pilares.

## Decisiones

- 5 pilares: E-commerce, Seguridad, Pagos, Distribución, Almacenamiento.
- Zonas: Recojo en tienda, Sucre urbano, Villa Charcas, Culpina, Incahuasi.
- QR de pago de demostración (repo y Render públicos).
- Una rama por fase; Pull Request a `master`.
- Deploy en Render recién con la app terminada.
