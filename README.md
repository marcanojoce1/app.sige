# SIGE Venezuela — Arranque del proyecto

Estructura (igual a TallerOS):

```
sige/
  backend/       → Node/Express + PostgreSQL (API)
  web-admin/     → plataforma web, un solo archivo index.html
  mobile/        → app móvil Expo/React Native
```

## 1. Backend

```
cd backend
npm install
copy .env.example .env      (en Windows; en Mac/Linux: cp .env.example .env)
```

Edita `.env` con los datos de tu PostgreSQL de Render (o uno local para probar):

```
DATABASE_URL=postgresql://usuario:password@host:5432/sige_venezuela
JWT_SECRET=algo-largo-y-aleatorio
PORT=4000
```

Crea la base de datos vacía primero (en el mismo servidor de Postgres donde vive TallerOS):

```sql
CREATE DATABASE sige_venezuela;
```

Luego crea las tablas y el primer Super Administrador:

```
npm run initdb
```

Esto crea el usuario `superadmin` / clave `cambiar123` — cámbiala apenas entres.

Arranca el servidor:

```
npm start
```

Debe verse: `SIGE backend corriendo en puerto 4000`

## 2. Plataforma web

Abre `web-admin/index.html` directamente en el navegador (doble clic). Por defecto apunta a `http://localhost:4000/api` — si tu backend corre en otra URL, cambia la constante `API_URL` al inicio del `<script>` del archivo.

Entra con `superadmin` / `cambiar123`. Desde ahí:
1. Crea tu primer colegio (organización) — falta agregar el formulario visual, por ahora se puede probar la ruta directamente:
   ```
   POST http://localhost:4000/api/organizaciones
   { "nombre": "U.E. Mi Colegio", "tipo": "privado" }
   ```
2. Crea al Administrador (Director) de ese colegio:
   ```
   POST http://localhost:4000/api/usuarios
   { "organizacion_id": 1, "rol": "administrador", "nombre_completo": "...", "usuario": "director1", "password": "..." }
   ```
3. Ya logueado como ese Administrador, puedes crear docentes, secretaría, representantes, etc. desde "Usuarios y accesos".

## 3. App móvil

```
cd mobile
npm install
npx expo start
```

Escanea el QR con la app Expo Go en tu teléfono para probarla sin compilar nada todavía. Edita `src/api.js` → `API_URL` para que apunte a tu backend (si pruebas desde el celular, `localhost` no funciona — usa la IP de tu PC en la red local, ej. `http://192.168.1.50:4000/api`).

Cuando quieras el APK real, se sigue el mismo proceso que ya tienes documentado y probado en TallerOS: `npx expo prebuild --platform android` y luego compilar con Gradle en `mobile/android`.

## Qué falta para que sea el sistema completo

Esto es el **núcleo funcionando de punta a punta** (login, roles, permisos granulares, usuarios, instrumentos de evaluación con rúbrica, RAGE calculado en vivo, y documentos con código de validación). Lo que sigue, en el orden del roadmap de la especificación:

- Formularios reales en la web para crear organizaciones/usuarios (hoy se prueban por API directamente)
- Pantallas de Configuración conectadas (catálogos editables)
- Matrícula/expediente de estudiantes, gestión de docentes y horarios
- Boletines en PDF (usar la skill de generación de PDF)
- Asistencia con escaneo de QR desde la cámara del celular
- Pensiones/pagos (subida de comprobante + confirmación)
- Calendario y comunicaciones/circulares
- Publicación en iPhone vía EAS Build cuando el proyecto esté validado en Android

Dime con cuál quieres seguir y lo construimos igual de completo que esto.
