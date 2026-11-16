# Diagramas UML de AML AgroTech

Los diagramas están escritos en **Mermaid** dentro de cada `.md`: GitHub los dibuja solo, y como son texto se revisan en cada Pull Request igual que el código. Están hechos a partir del código y de las migraciones de hoy (`src/`, `supabase/migrations/0001` a `0015`). Si un diagrama contradice al código, manda el código.

| Diagrama | Archivo | Qué muestra |
|---|---|---|
| Casos de uso | [`casos-de-uso.md`](casos-de-uso.md) | Actores (Visitante, Cliente, Administrador, Distribuidor, Supabase, Telegram) y los 33 casos de uso por pilar, con «include» y «extend» |
| Clases | [`clases.md`](clases.md) | Las 16 tablas de la base como clases, con atributos, multiplicidad, funciones SQL y enumeraciones |
| Componentes | [`componentes.md`](componentes.md) | Navegador (páginas y contextos), servidor Next.js (middleware y API REST), Supabase (Auth, Postgres, Storage, Vault, pg_net, pg_cron) y Telegram |
| Despliegue | [`despliegue.md`](despliegue.md) | Navegador → Render → Supabase → Telegram, y GitHub → Render |
| Secuencia | [`secuencia.md`](secuencia.md) | Realizar pedido y orden de compra, paso a paso con las rutas y funciones reales |
| Estados | [`estados.md`](estados.md) | Pedido, pago y orden de compra |

## Notas

- Mermaid no tiene tipos propios para casos de uso, componentes ni despliegue. Esos tres se dibujan con `flowchart`, con estereotipos UML en el texto (`«actor»`, `«include»`, `«device»`, `«executionEnvironment»`, `«artifact»`). Cada archivo explica su notación.
- Las fuentes de texto de estos diagramas son [`../specs/06-casos-de-uso.md`](../specs/06-casos-de-uso.md) (catálogo de casos de uso), [`../ARQUITECTURA.md`](../ARQUITECTURA.md) (arquitectura, pila y API) y [`../api/openapi.yaml`](../api/openapi.yaml) (contrato de la API).
- Para verlos fuera de GitHub: pegar el bloque en https://mermaid.live.
