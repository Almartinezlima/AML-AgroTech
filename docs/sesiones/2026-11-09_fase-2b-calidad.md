# 9 nov 2026 — Fase 2B: arreglos de autenticación y pruebas E2E

Rama `fase/2b-calidad`, creada desde `fase/2-comercio`.

## 1. Qué estaba roto

| # | Problema | Consecuencia |
|---|---|---|
| 1 | `/auth/restablecer` aceptaba **cualquier** sesión abierta (`data.session ? 'listo'`) | Abrir un enlace de recuperación en un navegador con el admin logueado cambiaba la contraseña **del admin** (pasó hoy) |
| 2 | El login mostraba siempre "Correo o contraseña incorrectos" | `email_not_confirmed` y los límites de intentos quedaban escondidos |
| 3 | `/auth/recuperar` no avisaba de la sesión abierta | Origen del caso 1 |
| 4 | Registro siempre decía "Revisa tu correo" | Con "Confirm email" apagado no entraba directo; "correo ya registrado" no se distinguía |
| 5 | Carrito en una sola clave de `localStorage` | El carrito de una cuenta lo veía (y lo compraba) la siguiente en el mismo navegador |
| 6 | `AuthContext` conservaba el perfil anterior si la lectura fallaba, y una respuesta lenta podía pisar a la cuenta nueva | Se podía ver el rol de otra cuenta un instante (p. ej. "Panel Admin") |
| 7 | **Encontrado por las pruebas:** tras entrar, `router.push('/carrito')` usaba la precarga que Next hizo **sin sesión** (la redirección al login) | Después de iniciar sesión te devolvía al login |
| 8 | El middleware ignoraba `?siguiente=` si ya había sesión, y perdía la query del destino | No volvía a donde iba |
| 9 | Carrito y checkout mostraban "carrito vacío" mientras leían el guardado | Parpadeo engañoso al recargar |
| 10 | Dos `next dev` (3000 y 3001) compartiendo `.next` y cookies de `localhost` | 404 falsos, lentitud extrema y sesiones mezcladas |

## 2. Qué se arregló

- **Restablecer** (`src/app/auth/restablecer/`): el formulario se habilita **solo** con el evento `PASSWORD_RECOVERY` (Supabase lo emite al canjear el `code` del enlace). Sin enlace en la URL, o con un enlace que este navegador no pidió → "Enlace inválido o vencido". Muestra **a qué correo** se le cambia la contraseña; antes de guardar comprueba que la sesión siga siendo esa cuenta; al terminar `signOut()` global y aviso. Respaldo: el `amr` del token debe decir `recovery` de hace menos de 15 min (`src/lib/auth/recuperacion.ts`).
- **Recuperar**: con sesión abierta avisa "Vas a cerrar la sesión de X en este navegador" y hace `signOut({ scope: 'local' })` antes de pedir el enlace.
- **Mensajes reales** (`src/lib/auth/mensajes.ts`): por `error.code` (`invalid_credentials`, `email_not_confirmed` + botón **Reenviar correo**, límites de intentos, `user_banned`, correo ya registrado, contraseña débil, sin conexión…). Si el código no se conoce, se muestra igual.
- **Registro**: con sesión devuelta entra directo a `/catalogo` (o a `?siguiente=`); sin sesión, pantalla "Revisa tu correo" con reenviar (`_components/RevisaCorreo.tsx`). Si había otra cuenta abierta, la cierra antes.
- **Login**: cuenta desactivada → `/cuenta-desactivada`; destino validado con `rutaInterna()` (`src/lib/auth/redireccion.ts`: solo rutas internas, sin `//`, `\`, caracteres de control ni `/auth/*`).
- **Navegación completa** (`window.location`) al entrar, registrarse y salir: no queda nada en memoria de la cuenta anterior ni precargas hechas sin sesión.
- **Carrito por cuenta** (`CarritoContext`): clave `aml-carrito-v2:<usuario>`; lo armado como invitado se suma al entrar; la clave vieja compartida se descarta; nuevo estado `listo` con skeleton.
- **AuthContext**: un solo camino (`INITIAL_SESSION`), perfil `null` al cambiar de cuenta y respuestas viejas descartadas.
- **Middleware**: respeta `?siguiente=` validado y conserva la query.

## 3. Pruebas E2E

- `@playwright/test` (devDependency) + Chromium. `playwright.config.ts`, `tests/e2e/*.spec.ts`, `docs/PRUEBAS.md`.
- Scripts: `test:e2e`, `test:e2e:ui`, `test:e2e:prod` (compila en `.next-e2e` vía `NEXT_DIST_DIR` en `next.config.mjs`; Render no cambia).
- Credenciales en `.env.test.local` (plantilla `.env.test.example`). Nunca service role.

### Resultado (`npm run test:e2e:prod`, dos corridas seguidas)

**23 pasaron · 0 fallaron · 0 omitidas** (~2,4 min).

| Archivo | Pruebas | Resultado |
|---|---|---|
| `seguridad.spec.ts` | 11 | ✅ 11 |
| `compra.spec.ts` | 1 | ✅ |
| `pagos-distribucion.spec.ts` | 1 | ✅ |
| `inventario.spec.ts` | 2 | ✅ 2 |
| `responsive.spec.ts` | 8 | ✅ 8 |

Fallos que hubo en el camino: 1 de la app (punto 7, arreglado en la app) y varios de la prueba misma (selectores con dos coincidencias, esperar a que termine "Salir").

## 4. Evidencia

- `npx tsc --noEmit`: sin errores. `npm run lint`: sin warnings ni errores.
- Build de producción: OK (`next build` en `.next-e2e`, el mismo que corre `test:e2e:prod`). No se corrió `npm run build` sobre `.next` porque había dos `npm run dev` de Aldo abiertos usándolo.
- Capturas 1280/412/360 de login (con error), registro, recuperar y restablecer (inválido): ancho de página igual al de la pantalla en todas.

## 5. Base de datos

- Sin migraciones nuevas. Se confirmó que la **0002 y la 0003 ya están corridas** (buckets `productos` y `comprobantes`, `es_admin`, kardex con movimientos).
- Datos de prueba: 61 cuentas `e2e+…` y 15 pedidos E2E (de todas las corridas de hoy). No se borró nada.

## 6. Pendientes para Aldo

1. Crear `.env.test.local` con `E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD` si todavía no está (las pruebas de admin las leyeron de tu configuración local, así que ya existen en algún `.env*.local`; conviene dejarlas en `.env.test.local`).
2. Cerrar los dos `npm run dev` (3000 y 3001) y dejar uno solo.
3. Revisar que la contraseña del admin sea la que querés (se cambió por error con el bug del punto 1).
4. Para la feria: opción para ocultar los datos `e2e+…` en el dashboard y las listas del panel.
