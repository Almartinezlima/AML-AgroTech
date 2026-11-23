# Diagrama de despliegue

Dónde corre cada parte en producción. Mermaid no tiene un tipo «despliegue», así que va con `flowchart`: cada recuadro es un **nodo** (`«device»` o `«executionEnvironment»`) con sus artefactos adentro, y cada flecha es una conexión con su protocolo.

```mermaid
flowchart LR
  subgraph DEV["«device» Computadora del equipo"]
    GIT["Repositorio local<br/>Git"]
  end
  subgraph GH["«executionEnvironment» GitHub"]
    REPO["Repositorio AML-AgroTech<br/>rama master"]
  end
  subgraph USR["«device» Celular o PC del usuario"]
    BR["«executionEnvironment» Navegador<br/>React 18 · páginas Next.js<br/>localStorage: carrito"]
  end
  subgraph RENDER["«executionEnvironment» Render · Web Service gratis · Node.js"]
    NX["«artifact» Aplicación Next.js 14<br/>middleware · páginas · API REST /api<br/>pdfkit · optimizador de imágenes"]
  end
  subgraph SUPA["«executionEnvironment» Supabase · sa-east-1"]
    AUTH["Auth"]
    PGR["PostgREST"]
    PG[("Postgres<br/>tablas · RLS · funciones SQL<br/>pg_net · pg_cron")]
    STO[("Storage<br/>productos · comprobantes")]
    VA[("Vault")]
  end
  subgraph TEL["«executionEnvironment» Telegram"]
    BOT["Bot API<br/>api.telegram.org"]
    APP["«device» Telegram del admin"]
    GRP["«device» Grupo de repartidores<br/>(celulares de los repartidores)"]
  end

  GIT -->|git push · Pull Request| REPO
  REPO -->|"despliegue automático al unir a master"| NX
  BR -->|"HTTPS · HTML y JSON"| NX
  BR -->|"HTTPS · login y perfil propio (supabase-js)"| AUTH
  NX -->|"HTTPS · supabase-js con el JWT del usuario"| PGR
  NX -->|HTTPS| AUTH
  NX -->|"HTTPS · subir archivos y URL firmadas"| STO
  PGR --> PG
  PG --> VA
  PG -->|"HTTPS · pg_net, después del commit"| BOT
  BOT --> APP
  BOT --> GRP
  GRP -->|"enlace a /repartidor"| BR
```

## Nodos

| Nodo | Qué corre ahí | Notas |
|---|---|---|
| Celular o PC del usuario | El navegador con la app (React) | El carrito vive en `localStorage`, uno por cuenta. Probado a 360 px |
| Render | La aplicación Next.js: páginas, middleware y la API REST | Plan gratis: la primera visita tras un rato sin uso tarda unos 45 s en despertar. URL: https://aml-agrotech.onrender.com |
| Supabase | Auth, Postgres, Storage y Vault | Postgres tiene `pg_net` (manda los avisos) y `pg_cron` (resumen diario a las 00:00 UTC = 20:00 de Bolivia) |
| Telegram | Bot API, el chat del admin y el grupo de repartidores | Los avisos salen de la base, no de Render: llegan aunque Render esté dormido. El grupo solo recibe «Entrega disponible» con el enlace a `/repartidor` |
| GitHub | El repositorio | Cada fase entra a `master` por Pull Request; Render publica solo al unir |

## Configuración por nodo

- **Render** (variables de entorno): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_WHATSAPP_TIENDA`, `NEXT_PUBLIC_TELEGRAM_GRUPO_REPARTIDORES` (enlace de invitación al grupo) y, opcional, `NEXT_PUBLIC_QR_TIENDA_IMAGEN`. **Ninguna clave secreta**: ni `service_role` ni el token de Telegram.
- **Supabase Vault**: `aml_telegram_token`, `aml_telegram_chat_admin` y `aml_telegram_chat_repartidores`. Sin ellos, los avisos no hacen nada.
- **Migraciones**: `supabase/migrations/0001` a `0022`, todas corridas a mano en el SQL Editor de Supabase.
