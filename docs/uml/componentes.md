# Diagrama de componentes

Cómo se arma la aplicación por dentro y qué interfaz usa cada parte. Mermaid no tiene un tipo «componentes», así que va con `flowchart`: cada recuadro es un componente (o un grupo de componentes) y cada flecha dice qué interfaz usa.

## 1. Vista general

```mermaid
flowchart TB
  subgraph NAV["«componente» Navegador · React 18"]
    PAG["Páginas Next.js<br/>(App Router)"]
    CTX["Contextos<br/>AuthContext · CarritoContext"]
    CLI["Cliente de la API<br/>pedirApi · useDatosApi"]
    SBN["supabase-js navegador<br/>lib/supabase.ts"]
    LS[("localStorage<br/>carrito por cuenta")]
    SW["Swagger UI<br/>/api-docs"]
  end
  subgraph SRV["«componente» Servidor Next.js 14 · Node.js"]
    MW["Middleware<br/>sesión + rol por ruta"]
    API["API REST<br/>Route Handlers src/app/api/**"]
    LIBAPI["lib/api<br/>sesion · validacion zod · respuestas"]
    PDF["Recibo de compra<br/>pdfkit · qrcode"]
    SBS["supabase-js servidor<br/>@supabase/ssr · cookies"]
  end
  subgraph SUP["«componente» Supabase"]
    AUTH["Auth<br/>usuarios · JWT"]
    REST["PostgREST"]
    PG[("Postgres<br/>tablas · RLS · funciones SQL · triggers")]
    STO[("Storage<br/>productos público · comprobantes privado")]
    VAULT[("Vault<br/>secretos de Telegram")]
    NET["pg_net<br/>HTTP asíncrono"]
    CRON["pg_cron<br/>resumen 20:00"]
  end
  TG["«componente externo»<br/>Telegram Bot API"]

  PAG --> CTX
  PAG --> CLI
  CTX --> LS
  CTX --> SBN
  SW -->|GET /api/openapi| API
  CLI -->|"HTTPS · JSON { data } / { error }"| MW
  MW --> API
  MW -->|getUser · rol| SBS
  API --> LIBAPI
  API --> PDF
  LIBAPI --> SBS
  SBN -->|"login · registro · recuperar · perfil propio"| AUTH
  SBN -->|perfil propio con RLS| REST
  SBS -->|JWT del usuario| AUTH
  SBS -->|"select · rpc(función SQL)"| REST
  SBS -->|subir y firmar URL| STO
  REST --> PG
  PG -->|trigger encola| NET
  CRON -->|aml_aviso_resumen_diario| PG
  PG -->|lee token y chat| VAULT
  NET -->|"HTTPS sendMessage"| TG
```

**Clave de seguridad:** la API usa la clave pública (`anon`) con el JWT del usuario, nunca la `service_role`. Lo que el usuario puede ver o cambiar lo decide la base con RLS y funciones `security definer`, además del middleware y de los chequeos de rol de la API (tres capas).

## 2. Páginas del navegador

```mermaid
flowchart LR
  subgraph PUB["Públicas"]
    P1["/ · /catalogo · /producto/[id]"]
    P2["/carrito"]
    P3["/auth/login · /auth/registro<br/>/auth/recuperar · /auth/restablecer"]
    P4["/api-docs"]
  end
  subgraph CLIENTE["Con sesión de cliente"]
    C1["/checkout · /checkout/exito"]
    C2["/pedidos · /pedidos/[id]"]
    C3["/cuenta · /cuenta-desactivada"]
  end
  subgraph ADMIN["Rol admin"]
    A1["/admin · /admin/productos"]
    A2["/admin/pedidos · /admin/pagos · /admin/envios · /admin/zonas"]
    A3["/admin/inventario · /admin/inventario/[productoId]"]
    A4["/admin/abastecimiento · /admin/abastecimiento/distribuidores<br/>/admin/abastecimiento/ordenes/[id] · /admin/margen"]
    A5["/admin/usuarios"]
  end
  subgraph DIST["Rol distribuidor"]
    D1["/distribuidor · /distribuidor/ordenes/[id]"]
  end
  CTXA["AuthContext<br/>sesión y perfil"]
  CTXC["CarritoContext<br/>carrito por cuenta"]
  PUB --> CTXA
  CLIENTE --> CTXA
  ADMIN --> CTXA
  DIST --> CTXA
  P2 --> CTXC
  C1 --> CTXC
  P1 --> CTXC
```

El middleware pide sesión en `/checkout`, `/pedidos` y `/cuenta`, rol `admin` en `/admin/**` y rol `distribuidor` en `/distribuidor/**`, verificados en el servidor.

## 3. API REST y funciones SQL

42 rutas y 50 operaciones; contrato completo en [`../api/openapi.yaml`](../api/openapi.yaml) y en vivo en `/api-docs`.

```mermaid
flowchart LR
  subgraph API["API REST /api"]
    R1["Catálogo<br/>/productos · /productos/imagen<br/>/categorias · /zonas-envio"]
    R2["Pedidos<br/>/pedidos · /pedidos/cotizar · /pedidos/ultima-entrega<br/>/pedidos/{id} · /cancelar · /estado · /nota · /anular-prueba"]
    R3["Pagos<br/>/pagos · /pagos/{id}/comprobante<br/>/verificar · /reembolso"]
    R4["Inventario<br/>/inventario/movimientos"]
    R5["Panel<br/>/dashboard · /margen"]
    R6["Usuarios<br/>/usuarios · /usuarios/{id}"]
    R7["Abastecimiento<br/>/distribuidores · /distribuidor/ficha<br/>/distribuidor/presentaciones · /distribuidor/ordenes<br/>/abastecimiento/reponer · /ordenes-compra/**"]
    R8["Sistema<br/>/salud · /openapi"]
  end
  subgraph SQL["Funciones SQL (Postgres)"]
    F1["crear_pedido · cancelar_pedido<br/>cambiar_estado_pedido · anular_pedido_prueba"]
    F2["registrar_comprobante · verificar_pago<br/>marcar_reembolsado"]
    F3["registrar_movimiento"]
    F4["resumen_dashboard"]
    F5["crear_ordenes_compra · guardar_linea_orden_compra<br/>enviar_ · cancelar_ · aceptar_ · rechazar_<br/>despachar_ · recibir_orden_compra<br/>anular_orden_compra_prueba"]
    F6["es_admin · es_distribuidor<br/>proteger_campos_perfil · handle_new_user"]
    F7["Avisos: aml_enviar_telegram<br/>triggers aml_aviso_* · aml_aviso_resumen_diario"]
  end
  STO[("Storage")]
  R2 --> F1
  R3 --> F2
  R3 --> STO
  R1 --> STO
  R4 --> F3
  R5 --> F4
  R7 --> F5
  R6 --> F6
  F1 -. trigger .-> F7
  F2 -. trigger .-> F7
  F3 -. trigger .-> F7
  F5 -. trigger .-> F7
```

Las lecturas simples (listas, detalle) son `select` con columnas explícitas sobre las tablas, filtradas por RLS. Toda escritura que mueve stock, dinero o estados pasa por una función SQL en una sola transacción.
