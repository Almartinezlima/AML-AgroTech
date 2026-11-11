# 00 — Visión, actores y alcance

## Problema

En Chuquisaca, el agricultor compra insumos viajando a Sucre sin saber antes qué hay, cuánto cuesta ni si hay stock. Las tiendas agropecuarias venden por teléfono o WhatsApp, sin catálogo, sin control de inventario y sin seguimiento de envíos a provincias.

## Solución

**AML AgroTech**: tienda en línea de insumos agrícolas con catálogo real en bolivianos, compra en línea, pago por QR/transferencia/contra entrega, envío a provincias por flota o encomienda con seguimiento, e inventario controlado para la tienda.

## Actores

| Actor | Descripción |
|---|---|
| **Visitante** | Navega el catálogo sin cuenta |
| **Cliente** | Agricultor registrado: compra, paga, sigue sus pedidos |
| **Administrador** | Dueño de la tienda: productos, inventario, pagos, despachos, usuarios |
| **Distribuidor** | Proveedor registrado (alcance futuro: publicar sus productos). En esta versión tiene cuenta y perfil, pero sus funciones de venta quedan fuera de alcance |
| **Supabase (sistema externo)** | Autenticación, base de datos y archivos |

## Alcance de esta versión (feria)

Dentro: los 5 pilares completos para Visitante, Cliente y Administrador; API REST documentada; despliegue en Render.

Fuera: pasarela de pago real (el QR es de demostración), portal del distribuidor, facturación electrónica (SIAT), app móvil nativa.

## Zonas de envío (tienda en Villa Charcas)

Estado real de la base (migración `0005`, 10 nov 2026):

| Zona | Tipo | Costo | Cómo llega | Contra entrega |
|---|---|---|---|---|
| Recojo en tienda (Villa Charcas) | recojo | Bs. 0 | El cliente recoge cuando el pedido está "Listo para recoger" | Sí |
| Villa Charcas (entrega en el pueblo) | urbano ("En el pueblo") | Bs. 10 | Entrega propia a la dirección | Sí |
| Culpina | provincia ("Por flota") | Bs. 10 | Flota, con guía; recoge la persona indicada (nombre y CI) | No |
| Incahuasi | provincia ("Por flota") | Bs. 10 | Flota, con guía; recoge la persona indicada (nombre y CI) | No |
| Sucre (recojo en la terminal de buses) | provincia ("Por flota") | Bs. 15 | Flota hasta la terminal; recoge la persona indicada | No |
