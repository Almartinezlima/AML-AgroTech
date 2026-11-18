# 00 — Visión, actores y alcance

## Problema

En Chuquisaca, el agricultor compra insumos viajando a Sucre sin saber antes qué hay, cuánto cuesta ni si hay stock. Las tiendas agropecuarias venden por teléfono o WhatsApp, sin catálogo, sin control de inventario y sin seguimiento de envíos a provincias.

## Solución

**AML AgroTech**: tienda en línea de insumos agrícolas con catálogo real en bolivianos, compra en línea, pago con QR (desde la fase 9F, la única forma de pago), envío a provincias por flota o encomienda con seguimiento, e inventario controlado para la tienda.

## Actores

| Actor | Descripción |
|---|---|
| **Visitante** | Navega el catálogo y arma el carrito sin cuenta |
| **Cliente** | Agricultor registrado: compra, paga, sigue sus pedidos y descarga la recibo de compra |
| **Administrador** | Dueño de la tienda: productos, inventario, pagos, despachos, usuarios, proveedores y órdenes de compra |
| **Distribuidor** | Proveedor mayorista (Sucre o Santa Cruz) que le vende a la tienda: publica sus presentaciones y atiende las órdenes de compra. El rol lo asigna solo el admin |
| **Supabase (sistema externo)** | Autenticación, base de datos, archivos, secretos (Vault) y tareas programadas (`pg_net`, `pg_cron`) |
| **Telegram (sistema externo)** | Entrega los avisos al chat del administrador |

## Alcance de esta versión (feria)

Dentro: los 5 pilares (e-commerce, seguridad, pagos, distribución y almacenamiento) para Visitante, Cliente y Administrador; el abastecimiento con el Distribuidor (presentaciones, órdenes de compra, recepción y margen); recibo de compra en PDF; avisos por Telegram al admin; API REST documentada con OpenAPI; despliegue en Render.

Fuera: pasarela de pago con confirmación automática (el admin verifica cada comprobante a mano), facturación electrónica (SIAT), avisos al cliente, app móvil nativa.

## Zonas de envío (tienda en Villa Charcas)

Las zonas vigentes (migración `0010`: recojo en tienda, Villa Charcas y sus distritos a domicilio, Incahuasi y Culpina por flota; Sucre inactiva) están en [`04-distribucion.md`](04-distribucion.md). El admin las edita en `/admin/zonas`.
