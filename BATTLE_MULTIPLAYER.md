# 🎮 Guía: Batallas Multijugador con Amigos

## ¿Cómo funciona?

Ahora puedes batallar con tus amigos en línea. El sistema incluye:

- ✅ Selector de amigos en la pantalla de batalla
- ✅ Envío de retos por notificación push
- ✅ Aceptación/rechazo de invitaciones
- ✅ Batallas en tiempo real
- ✅ Historial de batallas

---

## 📋 Pasos para batallar

### 1️⃣ **Agregar amigos**
1. Ve a la pestaña **"Amigos"**
2. Copia tu **ID** (tu email)
3. Comparte tu ID con tu amigo
4. Pega el ID de tu amigo en el campo "Código de amigo"
5. Haz clic en **"Agregar"**

Verás una lista de amigos con un botón **"🎮 Batalla"**.

### 2️⃣ **Enviar reto**

**Opción A: Desde Amigos**
1. En la sección Amigos, haz clic en el botón **"🎮 Batalla"** de tu amigo
2. Automáticamente irás a la pantalla de batalla con el amigo seleccionado

**Opción B: Desde Batalla**
1. Ve a la pestaña **"Batalla"**
2. Haz clic en **"👥 Batalla con Amigo"**
3. Selecciona un amigo de la lista
4. Escribe el nombre de tu Pokémon (ej: pikachu, charizard)
5. Haz clic en **"🔥 Retar a batalla"**

Tu amigo recibirá una **notificación push** con texto:
> "Alguien te ha retado a una batalla"

### 3️⃣ **Responder a un reto**
1. Aceptar la notificación de batalla
2. Verás el panel de invitación
3. Escribe tu Pokémon
4. Haz clic en **"✅ Aceptar"**

### 4️⃣ **Batalla en línea**
Una vez ambos jugadores aceptan, la batalla comienza:

- **Turno-basado**: Cada jugador ataca por turnos
- **Efectividad de tipos**: Se calcula el daño según los tipos
- **Historial**: Se registran todos los movimientos
- **Ganador**: Cuando un Pokémon llega a 0 HP

---

## 🛠️ Requisitos del servidor

Para que las batallas en línea funcionen, **necesitas tener el backend corriendo**:

### 1. Instalar dependencias del servidor
```bash
npm install express mongoose cors dotenv web-push
```

### 2. Copiar configuración de ejemplo
```bash
Copy-Item server.example.js server.js
```

### 3. Configurar MongoDB

**Opción A: Local (recomendado para desarrollo)**
- Asegúrate de tener MongoDB instalado
- Ejecuta `mongod` en una terminal separada

**Opción B: Cloud (MongoDB Atlas)**
- Ve a [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
- Crea un cluster gratis
- Copia la cadena de conexión
- Pega en `.env`: `MONGODB_URI=mongodb+srv://...`

### 4. Iniciar el servidor
```bash
npm run server
```

Deberías ver:
```
✅ Conectado a MongoDB
Backend server ejecutándose en puerto 3000
```

### 5. En otra terminal, inicia el frontend
```bash
npm run dev
```

---

## 📱 Notificaciones Push

Las invitaciones de batalla usan **Web Push Notifications**. Para recibirlas:

1. La app te pedirá permiso para notificaciones
2. Haz clic en **"Permitir"**
3. Recibirás notificaciones cuando te retasn

> ⚠️ Las notificaciones requieren HTTPS o localhost (en desarrollo)

---

## 🐛 Solución de problemas

### "No se puede conectar con el servidor"
- ✅ Asegúrate de que MongoDB esté corriendo
- ✅ Verifica que el servidor esté en puerto 3000
- ✅ Revisa que `VITE_API_BASE_URL=http://localhost:3000` en `.env`

### "No aparecen invitaciones"
- ✅ Revisa que ambos usuarios estén logueados
- ✅ Comprueba que tengas permiso para notificaciones
- ✅ Abre la consola (F12) para ver errores

### "El amigo no aparece en la lista"
- ✅ Verifica que agregaste el ID correcto
- ✅ Actualiza la página (F5)
- ✅ Pide a tu amigo que comparta de nuevo su ID

---

## 🎯 Próximas mejoras

- [ ] Batallas en equipo (vs 3 Pokémon)
- [ ] Chat en vivo durante la batalla
- [ ] Rankings globales
- [ ] Recompensas (monedas, ítems)
- [ ] Torneos entre amigos
- [ ] Grabación de batallas

---

## 📚 Archivos modificados

- `src/stores/battle.js` - Métodos para batallas multijugador
- `src/stores/battles.js` - Store de invitaciones (NUEVO)
- `src/views/Battle.vue` - UI para selector de amigos
- `src/views/Friends.vue` - Botón de batalla directa
- `server.example.js` - Endpoints de batalla
- `package.json` - Scripts del servidor

