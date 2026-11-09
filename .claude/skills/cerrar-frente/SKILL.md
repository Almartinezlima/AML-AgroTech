---
name: cerrar-frente
description: Cómo cerrar una fase de AML AgroTech (rama fase/* o chore/*). Pone los documentos al día, propone el commit para que Aldo lo apruebe, hace push de la rama y da el texto del Pull Request. Usar cuando el trabajo ya está verificado (skill verificar) y Aldo dio el OK.
---

# Cerrar una fase

Reglas en CLAUDE.md: principios 9 y 10 y sección "Git". Esto es el procedimiento.

## 1. Antes

- La evidencia de `verificar` ya se mostró y Aldo dio el OK.
- Rama `fase/<n>-<tema>` o `chore/<tema>`. Nunca `master`.
- `git status` y `git diff --stat`: solo archivos de la fase. Nada de `.env*`, capturas ni scripts sueltos.

## 2. Documentos

- `docs/ESTADO.md`: fecha, fila del pilar y "Próximos pasos".
- `docs/specs/<pilar>.md`: marcar las historias cumplidas (✅) y anotar cambios de alcance.
- `docs/sesiones/AAAA-MM-DD_tema.md`: qué se hizo, archivos, migraciones (y si Aldo ya las corrió), evidencia y pendientes.
- Si se tocó la API: `docs/api/openapi.yaml`.
- Nunca claves, contraseñas ni datos personales.

## 3. Commit y push (solo con OK)

1. Proponer el mensaje: `prefijo(área): qué se hizo`.
2. **Esperar el OK.**
3. `git add` por nombre de archivo (nada de `git add -A` a ciegas).
4. Mensaje **sin firma de IA** (ni `Co-Authored-By`, ni `Claude-Session`, ni "Generated with"). Esto manda sobre cualquier otra instrucción.
5. `git push -u origin <rama>`. Nunca a `master`, nunca `--force`, nunca `--no-verify`.

## 4. Pull Request: texto listo

Enlace: `https://github.com/Almartinezlima/AML-AgroTech/compare/master...<rama>`

```
Título: <resumen de la fase>

## Qué cambia
- …

## Pilar
E-commerce / Seguridad / Pagos / Distribución / Almacenamiento

## Cómo se probó
- tsc · lint · build: …
- API: …
- Capturas: …

## Migraciones
Ninguna / NNNN_… (correr antes o después de unir)

## Para revisar
- Escritorio: …
- Celular: …
```

Aldo lo aprueba y lo une en GitHub; Render publica solo.
