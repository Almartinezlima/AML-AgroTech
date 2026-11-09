# AML AgroTech — Reporte de contexto del proyecto

> Documento de traspaso para continuar el trabajo en un chat nuevo.
> Fecha del reporte: 29 de octubre de 2026
> Materia: SIS324 Ingeniería de Software — USFX, Sucre, Bolivia
> Autores: Aldo Martínez Lima y Alejandro Nava Mamani
> Docente: Ing. Ramiro Durán Quiroga (metodología RUP)

---

## 1. Qué es el proyecto

**AML AgroTech** es una plataforma web de comercio electrónico de insumos agrícolas (agroquímicos, riego, cañerías, herramientas y semillas) pensada para el contexto boliviano (Sucre / Chuquisaca / Villa Charcas).

Aldo quiere que sea más que un proyecto universitario: una base sólida que pueda comercializarse después (por ejemplo con un agroquímico de su pueblo). Por eso se prioriza estructura limpia, coherencia de flujo y diseño profesional.

## 2. Forma de trabajo acordada (vibe coding)

- **Este chat / chat de planificación:** se define lógica, diseño, alcance y se redactan los prompts.
- **Claude Code (en la laptop de Aldo):** programa. Se le pegan prompts completos.
- Aldo no es programador experto; se espera que Claude actúe como dev senior full stack (frontend, backend, base de datos, APIs).
- Las respuestas con preguntas deben ir **numeradas y en negrita** para que Aldo conteste por número.
- Documentación formal (Word/PDF) se hace al final, una vez cerrado el demo.

## 3. Entregas del docente

| Entrega | Estado |
|---|---|
| Visión del Producto (PDF, portada USFX, 5 secciones) | Entregada |
| Interfaz visual (Product Backlog, historias de usuario, interfaz) | Hecha y mostrada |
| Sprint 1 — Subsistema de seguridad / gestión de usuarios (entrega viernes 18) | Hecho |
| Plantillas de Casos de Uso (Excel + StarUML del docente) | Pendiente |
| Pizarra "SDD": 1) Especificación / HU, 2) Planificación (arquitectura y stack), 3) Tareas, 4) Deploy / IA | Referencia de la clase |

Nombre del producto definido: **AML AgroTech — Plataforma de Comercio Electrónico de Insumos Agrícolas**.

## 4. Stack real

- **Next.js 14** (App Router, `src/`), **TypeScript estricto**, **Tailwind CSS** (se cambió Bootstrap por Tailwind en la práctica)
- **Supabase** (Auth + Postgres + RLS), proyecto `aml-agrotech`, región `sa-east-1`
- **Vercel** previsto para deploy (aún no desplegado)
- Carpeta local: `C:\aml-agrotech` (minúsculas, porque npm no acepta mayúsculas)
- Repositorio git inicializado por `create-next-app`

### Reglas críticas (heredadas de AgroGestión)
- Siempre `fechaHoyLocal()`, nunca `.toISOString()` para fechas
- Nunca `.select('*')`: columnas explícitas
- Nunca hard-delete (usar campo `activo`)
- Nunca commitear `.env.local`

## 5. Diseño visual (no cambiar)

Tema oscuro agrícola:

| Uso | Color |
|---|---|
| Fondo | `#0a0f0a` |
| Cards | `#111811` |
| Hover cards | `#162016` |
| Verde acento | `#22c55e` |
| Verde hover | `#16a34a` |
| Texto principal | `#f0fdf4` |
| Texto secundario | `#86efac` |
| Bordes | `#1a2e1a` |

Mobile-first, responsive, comentarios en español.

## 6. Lo que ya está construido

### Frontend (src/app)
- `/` Inicio: hero, 5 categorías, destacados, CTA distribuidor
- `/catalogo` Catálogo con búsqueda, orden, filtro por categoría (**datos reales de Supabase**)
- `/carrito` Carrito con cantidades; al confirmar guarda en Supabase (`pedidos` + `pedido_items`)
- `/pedidos` Historial real del usuario logueado
- `/auth/login` y `/auth/registro` (Supabase Auth real, roles cliente/distribuidor)
- `/admin` Dashboard (**cifras y pedidos aún mock**)
- `/admin/productos` CRUD básico real (agregar, activar/desactivar)
- `/admin/inventario` Stock real con filtros y barra de nivel
- `/admin/usuarios` Interfaz sin datos aún
- `components/layout/Navbar.tsx` y `Footer.tsx`; Navbar dinámico según sesión y rol

### Estado global y seguridad
- `src/context/CarritoContext.tsx`: carrito en memoria (se pierde al recargar)
- `src/context/AuthContext.tsx`: sesión + perfil (rol)
- `src/lib/supabase.ts` (browser) y `src/lib/supabase-server.ts`
- `src/middleware.ts`: protege `/admin`, `/pedidos`, `/carrito` (redirige a login sin sesión)
- Panel Admin visible solo con `rol = 'admin'`

### Base de datos (Supabase)
Tablas: `perfiles`, `categorias`, `productos`, `pedidos`, `pedido_items`.
- `perfiles`: id (FK auth.users), nombre, email, rol (`admin|cliente|distribuidor`), telefono, activo
- Trigger `handle_new_user` crea el perfil al registrarse
- Trigger `update_updated_at` en productos y pedidos
- RLS: lectura pública de productos/categorías activos; escritura solo admin; cada usuario ve solo sus pedidos
- Catálogo inicial: **33 productos reales** con precios de referencia del Observatorio Agroambiental (Sucre, 2º semestre 2023) y Gemini; riego y cañerías son estimados (sin fuente pública)
- Existe un usuario admin creado (`admin@amlagrotech.com`); la contraseña no se guarda en este documento

## 7. Problemas conocidos / pendientes técnicos

1. **Dashboard `/admin`** muestra números inventados (48 productos, 87 usuarios, pedidos "Juan Mamani", etc.). Debe leer de Supabase.
2. **Carrito usa `id: producto.id as unknown as number`**: los ids de producto ahora son UUID (string). Conviene tipar `ItemCarrito.id` como `string`.
3. El carrito no persiste al recargar: agregar `localStorage` dentro de `CarritoProvider`.
4. No se descuenta stock al confirmar pedido (debería hacerse en transacción / función SQL).
5. El admin no ve ni gestiona los pedidos de todos los clientes (RLS ya lo permite).
6. `/admin/usuarios` sin conexión a `perfiles`; falta cambiar rol de un usuario.
7. Falta editar producto (solo hay agregar y activar/desactivar).
8. Política RLS de `perfiles`: se simplificó a "cada usuario ve el suyo"; el admin no puede listar todos. Se resuelve con una función `security definer` `es_admin()` (evita recursión).
9. Políticas `pedidos_usuario` y `pedidos_admin` son ambas `FOR ALL`; revisar que `WITH CHECK` sea correcto.
10. Precios de riego y cañerías son estimados: marcarlos como "referencia" hasta cotizar en tiendas.
11. 4 warnings de ESLint `exhaustive-deps` (benignos).
12. Aún no hay deploy en Vercel ni variables de entorno configuradas allí.
13. `supabase/migrations/0001_init_schema.sql` existe en el repo (creado por Claude Code); mantener las migraciones ahí.

### Incidente resuelto
La URL de Supabase pegada tenía un typo; Claude Code la corrigió usando el `ref` del JWT. Verificar siempre la URL desde Settings → API.

## 8. Próximos pasos sugeridos

1. Corregir tipos (`id` string) y persistir carrito
2. Dashboard admin con datos reales
3. Gestión de pedidos para admin (cambiar estado)
4. Descontar stock al confirmar pedido
5. Gestión de usuarios y roles desde admin
6. Editar productos + imágenes (Supabase Storage)
7. Rol distribuidor: sus propios productos
8. Deploy en Vercel
9. Casos de uso con las plantillas del docente
10. Documentación final (Word) cuando cierre el demo

## 9. Nuevas indicaciones (por definir en el chat nuevo)

Aldo va a probar nuevas habilidades/conectores (YouTube, otros) y tiene parámetros nuevos del docente. Al iniciar el chat nuevo: leer este documento, preguntar qué pidió exactamente el docente y planificar antes de pedir código.

## 10. Seguridad

- Nunca subir `.env.local` ni claves a GitHub
- La clave `anon` es pública por diseño, pero la `service_role` jamás debe ir al frontend
- Contraseñas de prueba deben cambiarse antes de comercializar
