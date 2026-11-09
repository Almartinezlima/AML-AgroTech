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

## Zonas de envío iniciales

| Zona | Tipo | Cómo llega |
|---|---|---|
| Recojo en tienda (Sucre) | recojo | El cliente recoge |
| Sucre urbano | urbano | Entrega propia |
| Villa Charcas | provincia | Flota / encomienda |
| Culpina | provincia | Flota / encomienda |
| Incahuasi | provincia | Flota / encomienda |
