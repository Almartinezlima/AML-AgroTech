# Migraciones de AML AgroTech

Se corren **a mano** en el SQL Editor de Supabase, en orden. Claude Code las escribe; Aldo las ejecuta. Procedimiento: skill `migracion`.

| N.º | Archivo | Qué hace | Corrida |
|---|---|---|---|
| 0001 | `0001_init_schema.sql` | Esquema inicial (perfiles, categorías, productos, pedidos, items, RLS). ⚠️ No coincide del todo con la base real: lo corrige la 0002 | Sí (oct 2026) |
| 0002 | `0002_reconciliar_y_seguridad.sql` | Reconcilia el repo con la base real, crea `es_admin()` y `proteger_campos_perfil`, reescribe las políticas RLS y corrige los avisos de Supabase. Prueba dentro de la transacción que un no admin no puede cambiarse el rol | Sí (nov 2026) |
| 0003 | `0003_modelo_comercio.sql` | Zonas de envío, pedidos con código y totales, pagos, envíos, seguimiento, kardex, funciones transaccionales, buckets de Storage y SKU de productos. Requiere la 0002. Prueba dentro de la transacción una compra y su cancelación | Sí (nov 2026) |
| 0004 | `0004_imagenes_productos.sql` | Foto real en los 33 productos (`imagen_url = '/productos/<sku>.webp'`), sin pisar fotos subidas por el admin. Fuentes en `docs/CREDITOS_IMAGENES.md` | Sí (nov 2026) |
| 0005 | `0005_zonas_villa_charcas.sql` | Deja por escrito las 5 zonas desde Villa Charcas tal como están en la base (por id); cualquier otra queda inactiva | Pendiente (nov 2026) |
| 0006 | `0006_cancelacion_y_pagos.sql` | El cliente solo cancela si el pago sigue pendiente; si el admin cancela algo pagado o en revisión, el pago pasa a `reembolso_pendiente` y luego `reembolsado` (`marcar_reembolsado`). Dashboard con reembolsos pendientes | Pendiente (nov 2026) |
| 0007 | `0007_recojo_y_flota.sql` | Estado `listo_para_recoger` para recojo en tienda; nombre y CI de quien recoge en zonas por flota (`crear_pedido` con 2 parámetros nuevos) | Pendiente (nov 2026) |
