# SIGE Venezuela — cómo reemplazar tu proyecto local

1. Descomprime este zip.
2. Copia TODO el contenido de la carpeta `sige` que viene aquí, y pégalo en `C:\sige`, reemplazando los archivos existentes cuando te pregunte (di "Reemplazar" a todo).
3. Abre PowerShell y ejecuta, uno por uno:

```
cd C:\sige
git add .
git commit -m "Servir web-admin desde el backend"
git push
```

4. Ve al dashboard de Render → `app.sige` y espera a que vuelva a decir "Live" o "Deployed" (Render redespliega solo al detectar el push).
5. Abre `https://app-sige.onrender.com` en el navegador — ahora debe cargarte directamente la pantalla de login de la plataforma (ya no el JSON de antes), porque el backend ahora también sirve la web.
6. Entra con `superadmin` / `cambiar123`.

Cuando confirmes que esto funciona, seguimos conectando el subdominio `sige.mjservices.app` en Cloudflare, igual que hiciste con `taller.mjservices.app`.
