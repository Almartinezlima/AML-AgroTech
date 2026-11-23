# 00 — Visión, actores y alcance

## Problema

En Chuquisaca, el agricultor compra insumos viajando a Sucre sin saber antes qué hay, cuánto cuesta ni si hay stock. Las tiendas agropecuarias venden por teléfono o WhatsApp, sin catálogo, sin control de inventario y sin seguimiento de envíos a provincias.

## Solución

**AML AgroTech**: tienda en línea de insumos agrícolas con catálogo real en bolivianos, compra en línea, pago con QR (la única forma de pago), entrega con código de 4 dígitos (recojo en tienda, repartidores externos de la zona o flota a provincias) con seguimiento, inventario controlado y abastecimiento con proveedores mayoristas.

## Actores

| Actor | Descripción |
|---|---|
| **Visitante** | Navega el catálogo y arma el carrito sin cuenta |
| **Cliente** | Agricultor registrado: compra, paga, sigue sus pedidos y descarga el recibo de compra |
| **Administrador** | Dueño de la tienda: verifica pagos, prepara y deja «Listo para salir», entrega en tienda, despacha por flota, paga a los repartidores; productos, inventario, usuarios, proveedores y órdenes de compra |
| **Repartidor** | Persona externa de la zona: se registra como cliente y el admin le da el rol. Acepta entregas a domicilio, las recoge en la tienda, las entrega con el código del cliente y gana el costo de envío |
| **Distribuidor** | Proveedor mayorista (Sucre o Santa Cruz) que le vende a la tienda: publica sus presentaciones y atiende las órdenes de compra. El rol lo asigna solo el admin |
| **Supabase (sistema externo)** | Autenticación, base de datos, archivos, secretos (Vault) y tareas programadas (`pg_net`, `pg_cron`) |
| **Telegram (sistema externo)** | Entrega los avisos al chat del administrador y al grupo de repartidores |

## Alcance de esta versión (feria)

Dentro: los 5 pilares (e-commerce, seguridad, pagos, distribución y almacenamiento) para Visitante, Cliente y Administrador; preparación con responsable en cada paso; entrega con código y reparto con repartidores externos (grupo de Telegram, aceptar entrega y pago al repartidor); el abastecimiento con el Distribuidor (presentaciones, órdenes de compra, recepción y margen); recibo de compra en PDF; avisos por Telegram; API REST documentada con OpenAPI; despliegue en Render.

Fuera: verificación automática del QR con el banco (el admin verifica cada comprobante a mano), facturación electrónica (SIAT), avisos al cliente, app móvil nativa. Lo que sigue después de la feria está en [`../MEJORAS_FUTURAS.md`](../MEJORAS_FUTURAS.md).

## Zonas de envío (tienda en Villa Charcas)

Las zonas vigentes (migración `0010`: recojo en tienda, Villa Charcas y sus distritos a domicilio, Incahuasi y Culpina por flota; Sucre inactiva) están en [`04-distribucion.md`](04-distribucion.md). El admin las edita en `/admin/zonas`.
