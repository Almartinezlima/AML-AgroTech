# Diagrama de casos de uso

Fuente: [`../specs/06-casos-de-uso.md`](../specs/06-casos-de-uso.md) (catálogo, HU y relaciones). Mermaid no tiene un tipo «casos de uso», así que se dibuja con `flowchart`:

| En el diagrama | Significa |
|---|---|
| Caja `«actor»` | Actor (persona o sistema externo) |
| Óvalo `CU-nn` | Caso de uso |
| Recuadro con título | Límite del sistema (un pilar de AML AgroTech) |
| Línea continua | El actor participa en el caso de uso |
| Flecha punteada `«include»` / `«extend»` | Relación entre casos de uso |
| Flecha `hereda` | Generalización entre actores |

Para que se lea, va un diagrama por pilar. En todos, los casos de uso del Administrador, del Distribuidor y del Repartidor «incluyen» CU-02 Iniciar sesión con su rol; no se dibuja esa línea en cada uno.

## 1. Actores

```mermaid
flowchart BT
  V["«actor»<br/>Visitante"]
  C["«actor»<br/>Cliente"]
  A["«actor»<br/>Administrador"]
  D["«actor»<br/>Distribuidor"]
  R["«actor»<br/>Repartidor"]
  S["«actor» «sistema»<br/>Supabase"]
  T["«actor» «sistema»<br/>Telegram"]
  C -->|hereda| V
  A -->|hereda| V
  D -->|hereda| V
  R -->|hereda| V
  S ~~~ T
```

## 2. Seguridad

```mermaid
flowchart LR
  V["«actor»<br/>Visitante"]
  C["«actor»<br/>Cliente"]
  A["«actor»<br/>Administrador"]
  D["«actor»<br/>Distribuidor"]
  S["«actor» «sistema»<br/>Supabase Auth"]
  subgraph SEG["AML AgroTech · Seguridad"]
    CU01(["CU-01 Registrarse"])
    CU02(["CU-02 Iniciar / cerrar sesión"])
    CU03(["CU-03 Recuperar contraseña"])
    CU04(["CU-04 Gestionar usuarios y roles"])
  end
  V --- CU01
  V --- CU03
  C --- CU02
  A --- CU02
  D --- CU02
  A --- CU04
  CU04 -.->|«include»| CU02
  CU01 --- S
  CU02 --- S
  CU03 --- S
```

## 3. E-commerce

```mermaid
flowchart LR
  V["«actor»<br/>Visitante"]
  C["«actor»<br/>Cliente"]
  A["«actor»<br/>Administrador"]
  subgraph ECO["AML AgroTech · E-commerce"]
    CU05(["CU-05 Explorar catálogo"])
    CU06(["CU-06 Ver ficha de producto"])
    CU07(["CU-07 Gestionar carrito"])
    CU08(["CU-08 Realizar pedido"])
    CU09(["CU-09 Consultar mis pedidos"])
    CU10(["CU-10 Cancelar pedido"])
    CU11(["CU-11 Gestionar productos"])
    CU12(["CU-12 Ver panel de control"])
    CU32(["CU-32 Descargar recibo de compra PDF"])
    DS(["Descontar stock"])
    DV(["Devolver stock"])
  end
  CU13(["CU-13 Pagar pedido"])
  CU16(["CU-16 Elegir zona de envío"])
  V --- CU05
  V --- CU06
  V --- CU07
  C --- CU07
  C --- CU08
  C --- CU09
  C --- CU10
  C --- CU32
  A --- CU10
  A --- CU11
  A --- CU12
  A --- CU32
  CU08 -.->|«include»| CU16
  CU08 -.->|«include»| CU13
  CU08 -.->|«include»| DS
  CU10 -.->|«include»| DV
  CU32 -.->|«extend»<br/>pedido confirmado| CU09
```

## 4. Pagos

```mermaid
flowchart LR
  C["«actor»<br/>Cliente"]
  A["«actor»<br/>Administrador"]
  S["«actor» «sistema»<br/>Supabase Storage"]
  subgraph PAG["AML AgroTech · Pagos"]
    CU13(["CU-13 Pagar pedido con QR"])
    CU14(["CU-14 Subir comprobante de pago"])
    CU15(["CU-15 Verificar pago y reembolsar"])
  end
  C --- CU13
  C --- CU14
  A --- CU15
  CU14 -.->|«extend»<br/>hasta que queda en revisión| CU13
  CU14 --- S
  CU15 --- S
```

## 5. Distribución

```mermaid
flowchart LR
  C["«actor»<br/>Cliente"]
  A["«actor»<br/>Administrador"]
  subgraph DIS["AML AgroTech · Distribución"]
    CU16(["CU-16 Elegir zona de envío"])
    CU17(["CU-17 Seguir pedido"])
    CU18(["CU-18 Gestionar pedidos y despachos"])
    CU19(["CU-19 Gestionar zonas de envío"])
  end
  C --- CU16
  C --- CU17
  A --- CU18
  A --- CU19
```

## 6. Almacenamiento y abastecimiento

```mermaid
flowchart LR
  A["«actor»<br/>Administrador"]
  D["«actor»<br/>Distribuidor"]
  subgraph ALM["AML AgroTech · Almacenamiento"]
    CU20(["CU-20 Registrar entrada / ajuste"])
    CU21(["CU-21 Consultar kardex"])
    CU22(["CU-22 Ver alertas de stock"])
  end
  subgraph ABA["AML AgroTech · Abastecimiento"]
    CU23(["CU-23 Gestionar proveedores"])
    CU24(["CU-24 Gestionar presentaciones"])
    CU25(["CU-25 Armar y enviar orden de compra"])
    CU26(["CU-26 Cancelar orden de compra"])
    CU27(["CU-27 Responder orden<br/>aceptar · rechazar"])
    CU28(["CU-28 Despachar orden de compra"])
    CU29(["CU-29 Recibir orden de compra"])
    CU30(["CU-30 Seguir orden de compra"])
    CU31(["CU-31 Consultar margen"])
    VR(["Ver qué reponer"])
    RK(["Registrar entrada en el kardex"])
    CP(["Actualizar costo promedio"])
  end
  A --- CU20
  A --- CU21
  A --- CU22
  A --- CU23
  A --- CU25
  A --- CU26
  A --- CU29
  A --- CU30
  A --- CU31
  D --- CU24
  D --- CU27
  D --- CU28
  D --- CU30
  CU25 -.->|«include»| VR
  CU29 -.->|«include»| RK
  CU29 -.->|«include»| CP
```

## 7. Avisos por Telegram

```mermaid
flowchart LR
  S["«actor» «sistema»<br/>Supabase<br/>pg_net · pg_cron · Vault"]
  T["«actor» «sistema»<br/>Telegram"]
  subgraph AVI["AML AgroTech · Avisos"]
    CU33(["CU-33 Avisar al administrador"])
  end
  CU08(["CU-08 Realizar pedido"])
  CU14(["CU-14 Subir comprobante"])
  CU20(["CU-20 Registrar entrada / ajuste"])
  CU27(["CU-27 Responder orden de compra"])
  CU28(["CU-28 Despachar orden de compra"])
  S --- CU33
  CU33 --- T
  CU33 -.->|«extend»<br/>pedido nuevo · stock bajo| CU08
  CU33 -.->|«extend»<br/>comprobante por revisar| CU14
  CU33 -.->|«extend»<br/>stock bajo| CU20
  CU33 -.->|«extend»<br/>aceptada · rechazada| CU27
  CU33 -.->|«extend»<br/>despachada| CU28
  CU35b(["CU-35 Reportar faltante"])
  CU33 -.->|«extend»<br/>faltante| CU35b
```

Condición de todos los «extend» de CU-33: la cuenta no es de prueba y los secretos de Telegram están en Vault. El resumen diario de las 20:00 lo inicia `pg_cron` (actor Supabase) sin otro caso de uso.

## 8. Preparación y «Listo para salir» (fase 9C; desde la 9F, solo el admin)

```mermaid
flowchart LR
  A["«actor»<br/>Administrador"]
  T["«actor» «sistema»<br/>Telegram"]
  subgraph PRE["AML AgroTech · Preparación"]
    CU34(["CU-34 Preparar pedido<br/>empezar y marcar productos"])
    CU35(["CU-35 Reportar faltante"])
    CU36(["CU-36 Resolver faltante"])
    CU37(["CU-37 Dejar «Listo para salir»"])
    CU38(["CU-38 Imprimir etiquetas"])
    CU52(["CU-52 Avisar al grupo<br/>de repartidores"])
    VER(["Verificar todo marcado<br/>y sin faltantes abiertos"])
  end
  A --- CU34
  A --- CU35
  A --- CU36
  A --- CU37
  A --- CU38
  CU35 -.->|«extend»<br/>si falta un producto| CU34
  CU37 -.->|«include»| VER
  CU38 -.->|«extend»<br/>una por bulto| CU37
  CU52 -.->|«extend»<br/>a domicilio| CU37
  CU52 --- T
```

- Desde la 9F no hay rol Almacén: todo lo hace el Administrador en «Por preparar».
- Mientras un faltante (CU-35) siga abierto, CU-37 no se puede completar: lo destraba CU-36.
- Cada caso deja su paso en la línea de tiempo del pedido con **quién** y **cuándo** (CU-17 Seguir pedido).

## 9. Entrega, reparto externo y cierre (fases 9D y 9F)

```mermaid
flowchart LR
  C["«actor»<br/>Cliente"]
  R["«actor»<br/>Repartidor externo"]
  A["«actor»<br/>Administrador"]
  T["«actor» «sistema»<br/>Telegram"]
  subgraph ENT["AML AgroTech · Entrega y reparto"]
    CU39(["CU-39 Ver código de entrega"])
    CU47(["CU-47 Marcar disponibilidad"])
    CU48(["CU-48 Aceptar entrega"])
    CU40(["CU-40 Recoger el pedido<br/>en la tienda"])
    CU42(["CU-42 Entregar con código"])
    CU49(["CU-49 Ver ganado<br/>y por cobrar"])
    CU43(["CU-43 Desbloquear código"])
    CU44(["CU-44 Confirmar recepción<br/>por flota"])
    CU45(["CU-45 Calificar entrega<br/>Recibí conforme"])
    CU50(["CU-50 Liberar entrega"])
    CU51(["CU-51 Pagar al repartidor"])
    BLO(["Bloquear la entrega:<br/>el primero se la lleva"])
    VER(["Verificar código<br/>máx. 5 intentos"])
  end
  C --- CU39
  C --- CU44
  C --- CU45
  R --- CU47
  R --- CU48
  R --- CU40
  R --- CU42
  R --- CU49
  A --- CU42
  A --- CU43
  A --- CU44
  A --- CU50
  A --- CU51
  CU48 -.->|«include»| BLO
  CU42 -.->|«include»| VER
  CU43 -.->|«extend»<br/>5 intentos fallidos| CU42
  CU50 -.->|«extend»<br/>si no la recogió| CU48
  CU42 --- T
```

- El Repartidor entrega a domicilio; el Administrador entrega en tienda (recojo) y puede entregar a domicilio si lo lleva él.
- CU-48 exige que el repartidor esté disponible (CU-47). Las entregas disponibles no muestran el nombre ni el teléfono del cliente hasta que se aceptan.
- CU-39 lo ve **solo el dueño**: ni el repartidor ni el admin.
- Telegram avisa al grupo de repartidores (CU-52, sección 8) y al admin de la entrega, del código bloqueado y de una calificación de 1 o 2 estrellas (CU-33).
- CU-41 (cobro en efectivo) y CU-46 (recibir el efectivo) se retiraron en la 9F: solo se paga con QR.
