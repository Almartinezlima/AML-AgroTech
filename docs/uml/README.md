# Diagramas UML de AML AgroTech

Los diagramas están escritos en **Mermaid** dentro de cada `.md`: GitHub los dibuja solo, y como son texto se revisan en cada Pull Request igual que el código. Están hechos a partir del código y de la base real (`src/`, `supabase/migrations/0001` a `0022`), revisados el 22 nov 2026. Si un diagrama contradice al código, manda el código.

| Diagrama | Archivo | Qué muestra |
|---|---|---|
| Casos de uso | [`casos-de-uso.md`](casos-de-uso.md) | Actores (Visitante, Cliente, Administrador, Repartidor, Distribuidor, Supabase, Telegram) y los 50 casos de uso por pilar, con «include» y «extend» |
| Clases | [`clases.md`](clases.md) | Las 21 tablas de la base como clases, con atributos, multiplicidad, funciones SQL y enumeraciones |
| Componentes | [`componentes.md`](componentes.md) | Navegador (páginas por rol y contextos), servidor Next.js (middleware y API REST), Supabase (Auth, Postgres, Storage, Vault, pg_net, pg_cron) y Telegram (chat del admin y grupo de repartidores) |
| Despliegue | [`despliegue.md`](despliegue.md) | Navegador → Render → Supabase → Telegram (admin y repartidores), y GitHub → Render |
| Secuencia | [`secuencia.md`](secuencia.md) | Realizar pedido con QR, orden de compra, preparar y dejar «Listo para salir», y reparto externo con código y pago al repartidor |
| Estados | [`estados.md`](estados.md) | Pedido, pago, pago al repartidor y orden de compra |

## Notas

- Mermaid no tiene tipos propios para casos de uso, componentes ni despliegue. Esos tres se dibujan con `flowchart`, con estereotipos UML en el texto (`«actor»`, `«include»`, `«device»`, `«executionEnvironment»`, `«artifact»`). Cada archivo explica su notación.
- Las fuentes de texto de estos diagramas son [`../specs/06-casos-de-uso.md`](../specs/06-casos-de-uso.md) (catálogo de casos de uso), [`../ARQUITECTURA.md`](../ARQUITECTURA.md) (arquitectura, pila y API) y [`../api/openapi.yaml`](../api/openapi.yaml) (contrato de la API).
- Para verlos fuera de GitHub: pegar el bloque en https://mermaid.live.
