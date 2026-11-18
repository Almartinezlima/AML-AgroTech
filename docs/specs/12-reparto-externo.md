# 12 — Reparto con repartidores externos y Telegram

Fase 9F (flujo final). Migración `0020` (corrida el 17 nov 2026).

Los repartidores **no son empleados**: son personas de Villa Charcas que se registran como clientes y a las que el admin les da el rol **Repartidor**. Cuando un pedido a domicilio queda «Listo para salir», el bot avisa a un grupo de Telegram; el primero que acepta en el sitio se lleva la entrega y gana el costo de envío. La tienda les paga lo acumulado.

## Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| HU-RE01 | Como **persona de la zona** quiero registrarme como cliente y que la tienda me dé el rol Repartidor | Alta |
| HU-RE02 | Como **repartidor** quiero un interruptor grande «Estoy disponible / No disponible» | Alta |
| HU-RE03 | Como **repartidor** quiero unirme al grupo de Telegram desde mi panel, para enterarme de cada entrega nueva | Alta |
| HU-RE04 | Como **repartidor** quiero ver las entregas disponibles con zona, dirección, bultos y cuánto gano | Alta |
| HU-RE05 | Como **repartidor** quiero tocar «Aceptar» y que la entrega sea mía; si otro la tomó antes, que me lo diga y desaparezca | Alta |
| HU-RE06 | Como **repartidor** quiero tocar «Recogí el pedido» en la tienda y después entregarlo con el código del cliente | Alta |
| HU-RE07 | Como **repartidor** quiero ver cuánto gané y cuánto me falta cobrar | Alta |
| HU-RE08 | Como **administrador** quiero que el bot publique en el grupo cuando un pedido a domicilio queda listo | Alta |
| HU-RE09 | Como **administrador** quiero «Liberar entrega» si el repartidor que aceptó no aparece | Alta |
| HU-RE10 | Como **administrador** quiero ver cuánto le debo a cada repartidor y marcar «Pagado» (queda quién y cuándo) | Alta |

## Criterios de aceptación

- **Rol (HU-RE01):** el admin lo asigna en `/admin/usuarios`. Al entrar, el repartidor va directo a `/repartidor` (también con Google). El admin no usa ese panel: `/repartidor` lo lleva a `/admin/repartidores`.
- **Disponible (HU-RE02):** `cambiar_disponibilidad(bool)` en `repartidores_estado` (RLS sin políticas: solo por funciones). Sin estar disponible no ve ni acepta entregas (`aceptar_entrega` responde 409 «Primero marca «Estoy disponible»»). Sus entregas ya aceptadas se siguen viendo.
- **Grupo (HU-RE03):** botón «Unirme al grupo de Telegram» con el enlace de `NEXT_PUBLIC_TELEGRAM_GRUPO_REPARTIDORES`. Si la variable falta, el botón no aparece.
- **Disponibles (HU-RE04):** `panel_repartidor()` devuelve en una llamada la disponibilidad, las entregas disponibles, «Mis entregas», ganado, por cobrar y el último pago. Las disponibles traen zona, dirección, bultos y «Ganas Bs. X» (= `costo_envio` del pedido), **sin nombre ni teléfono del cliente**. El panel se actualiza solo cada 10 s (9G) y al volver a la pestaña.
- **Aceptar (HU-RE05):** `aceptar_entrega` bloquea la fila del pedido (`for update`) y exige que siga `empacado` y sin repartidor: el primero se la lleva; al segundo le responde 409 «Otro repartidor ya la tomó.» y la pantalla la saca de la lista. Guarda `pedidos.repartidor_id` y `aceptado_en`; el cliente ve «Un repartidor aceptó tu entrega».
- **Recoger y entregar (HU-RE06):** «Recogí el pedido» (`tomar_pedido`) solo para quien la aceptó: `empacado` → `despachado`, «Salió de la tienda: va en camino». Después entrega con el código ([`11-entrega-cierre.md`](11-entrega-cierre.md)); el pedido queda `completado`. Ya aceptada, el repartidor ve cliente, teléfono (Llamar y WhatsApp) y notas.
- **Ganado y por cobrar (HU-RE07):** ganado = suma de `costo_envio` de sus entregas entregadas o completadas; por cobrar = las que todavía no tienen `pago_repartidor_id`.
- **Telegram (HU-RE08):** trigger `aml_aviso_entrega_disponible` cuando un pedido a domicilio pasa a `empacado` sin repartidor (o se libera). Mensaje: `🛵 Entrega disponible · <zona> · Ganas Bs. X · https://aml-agrotech.onrender.com/repartidor`. Chat en Vault: `aml_telegram_chat_repartidores` (el token es el mismo `aml_telegram_token`). Sin el secreto no envía nada; los pedidos de cuentas `@amlagrotech.test` no avisan. Sale por pg_net después del commit.
- **Liberar (HU-RE09):** `liberar_entrega` (solo admin) desde `/admin/repartidores` o el detalle del pedido, solo si está aceptada y todavía no salió de la tienda. La entrega vuelve a estar disponible, se publica otra vez en el grupo y el cliente ve «Buscando otro repartidor».
- **Pagado (HU-RE10):** `/admin/repartidores` muestra por repartidor lo que se debe, las entregas sin pagar, en curso, si está disponible, el total pagado y el último pago. «Pagado» llama a `pagar_repartidor(id, monto)` con el monto que el admin vio: en una transacción crea la fila en `pagos_repartidor` (monto, entregas, `pagado_por`, `pagado_en`) y marca esas entregas. Si en el medio se entregó otra y el monto cambió, responde 409 y no marca nada. Abajo, los últimos 30 pagos.

## Cómo crear el grupo de Telegram

1. En Telegram: menú → **Nuevo grupo** → nombre «AML Repartidores» → agrega al bot de la tienda (el mismo de los avisos al admin) → Crear.
2. En el grupo: nombre del grupo → **Administradores** → agrega al bot (basta con que pueda enviar mensajes).
3. Escribe cualquier mensaje en el grupo.
4. Abre `https://api.telegram.org/bot<TOKEN>/getUpdates` con el token del bot y copia el `"chat":{"id":-100…}` **con el signo menos**. Si sale vacío, saca y vuelve a agregar al bot, escribe otro mensaje y recarga. (Si el bot tiene un webhook configurado, `getUpdates` no devuelve nada.)
5. En el SQL Editor de Supabase: `select vault.create_secret('-100XXXXXXXXXX', 'aml_telegram_chat_repartidores');`
6. Enlace de invitación: grupo → **Invitar al grupo mediante enlace** → copia el `https://t.me/+…` y cárgalo como `NEXT_PUBLIC_TELEGRAM_GRUPO_REPARTIDORES` en Render (antes del build) y en `.env.local`.

## Seguridad

- El repartidor no lee tablas: todo por funciones `security definer` que revisan el rol (`aml_repartidor_activo`). Nunca ve el código de entrega, precios de costo, pagos ni el correo del cliente.
- `pagos_repartidor` y `repartidores_estado`: RLS activa, sin políticas y sin permisos para `anon` ni `authenticated`.
- API: `requerirRepartidor()` (solo el rol repartidor) para el panel, la disponibilidad y aceptar; `requerirAdmin()` para liberar, deudas y pagar.

## Pantallas

`/repartidor` (interruptor, Telegram, ganado y por cobrar, mis entregas, disponibles), `/repartidor/pedidos/[id]` (recoger y entregar), `/admin/repartidores` (en curso con «Liberar entrega», lo que se debe con «Pagado», últimos pagos), `/admin/usuarios` (asignar el rol).
