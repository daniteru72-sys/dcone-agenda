# DCONE Agenda React — EasyPanel

Aplicación React lista para desplegar con Docker en EasyPanel.

## Variables de entorno / build args

Configura estas tres variables en EasyPanel:

- `VITE_N8N_WEBHOOK_URL`
- `VITE_OWNER_CHAT_ID`
- `VITE_BUSINESS_NAME`

Ejemplo:

```text
VITE_N8N_WEBHOOK_URL=https://n8n.tudominio.com/webhook/selector-agenda
VITE_OWNER_CHAT_ID=5264979411
VITE_BUSINESS_NAME=DCONE BARBER
```

> Vite incorpora estas variables durante el build. Si cambias una variable, haz un nuevo Deploy/Rebuild.

## Despliegue recomendado en EasyPanel

### Opción A — GitHub

1. Crea un repositorio nuevo.
2. Sube todos los archivos de esta carpeta.
3. En EasyPanel crea `App → GitHub`.
4. Selecciona el repositorio.
5. Build method: `Dockerfile`.
6. Container port: `80`.
7. Añade las variables anteriores como Build Args/Environment.
8. Deploy.
9. Añade dominio y activa HTTPS.

### Opción B — Docker Compose / código pegado

También puedes subir la carpeta por Git o construir una imagen propia. Para EasyPanel, GitHub suele ser la opción más sencilla y reproducible.

## Workflow receptor de n8n

### 1. Webhook

- Method: `POST`
- Path: `selector-agenda`
- Response: `Using Respond to Webhook`

### 2. Code — Convertir slots

```javascript
const body = $json.body ?? $json;
const slots = Array.isArray(body.slots) ? body.slots : [];

if (!slots.length) {
  throw new Error("No se recibieron huecos");
}

return slots.map(slot => ({
  json: {
    semana_id: body.semana_id,
    fecha: slot.fecha,
    hora: slot.hora,
    estado: "libre",
    chat_id_reserva: "",
    creado: new Date().toISOString(),
    owner_chat_id: body.owner_chat_id
  }
}));
```

### 3. Google Sheets — Append Row

Hoja: `Huecos`

- `semana_id` → `{{ $json.semana_id }}`
- `fecha` → `{{ $json.fecha }}`
- `hora` → `{{ $json.hora }}`
- `estado` → `{{ $json.estado }}`
- `chat_id_reserva` → `{{ $json.chat_id_reserva }}`
- `creado` → `{{ $json.creado }}`

### 4. Code — Resumen

Mode: `Run Once for All Items`

```javascript
const items = $input.all();

return [{
  json: {
    ok: true,
    huecos_creados: items.length,
    owner_chat_id: items[0]?.json.owner_chat_id || ""
  }
}];
```

### 5. Telegram

Chat ID:

```javascript
{{ $json.owner_chat_id }}
```

Texto:

```text
Agenda abierta correctamente 😎💈

He creado {{ $json.huecos_creados }} huecos para la próxima semana.
```

### 6. Respond to Webhook

Modo Expression:

```javascript
={{
  {
    ok: true,
    huecos_creados: $json.huecos_creados
  }
}}
```

## CORS

Si el navegador bloquea la petición, añade estos headers en `Respond to Webhook` o configura CORS en n8n/proxy:

```text
Access-Control-Allow-Origin: https://agenda.tudominio.com
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Methods: POST, OPTIONS
```

Para una prueba temporal puedes usar `*`, pero en producción usa el dominio exacto.
