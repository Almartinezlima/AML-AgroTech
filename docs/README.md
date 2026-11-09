# Documentación de AML AgroTech

**Regla de oro:** si un documento contradice al código o a Supabase, **manda el código**. Los documentos se actualizan al cerrar cada fase.

## Qué leer primero

1. [`../CLAUDE.md`](../CLAUDE.md) — reglas de trabajo y técnicas.
2. [`ESTADO.md`](ESTADO.md) — dónde estamos hoy y qué sigue.
3. [`ARQUITECTURA.md`](ARQUITECTURA.md) — arquitectura, modelo de datos y API REST.
4. La especificación del pilar que se va a trabajar, en [`specs/`](specs/).

## Especificación (SDD: especificar → planificar → tareas → implementar)

| Documento | Pilar |
|---|---|
| [`specs/00-vision.md`](specs/00-vision.md) | Visión, actores y alcance |
| [`specs/01-ecommerce.md`](specs/01-ecommerce.md) | E-commerce |
| [`specs/02-seguridad.md`](specs/02-seguridad.md) | Seguridad |
| [`specs/03-pagos.md`](specs/03-pagos.md) | Pagos |
| [`specs/04-distribucion.md`](specs/04-distribucion.md) | Distribución |
| [`specs/05-almacenamiento.md`](specs/05-almacenamiento.md) | Almacenamiento (inventario) |
| [`specs/06-casos-de-uso.md`](specs/06-casos-de-uso.md) | Catálogo de casos de uso (base para StarUML) |

## Carpetas

| Carpeta | Qué hay |
|---|---|
| `specs/` | Historias de usuario, criterios de aceptación y casos de uso |
| `api/` | Contrato OpenAPI de la API REST (desde la Fase 2) |
| `uml/` | Diagramas UML exportados (al final) |
| `sesiones/` | Qué se hizo en cada sesión, con fecha adelante |
