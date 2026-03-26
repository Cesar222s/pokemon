# ⚡ Quick Start: Batallas con Amigos

## 🚀 En 5 minutos

### Paso 1: Prepara el servidor (Terminal 1)
```bash
# Copiar servidor  
Copy-Item server.example.js server.js

# Instalar dependencias backend
npm install express mongoose cors dotenv web-push

# Iniciar MongoDB (si es local)
mongod

# Esperar a que diga "✅ Conectado a MongoDB"
```

### Paso 2: Inicia el frontend (Terminal 2)
```bash
npm run dev
```

Abre http://localhost:5173 en tu navegador

### Paso 3: Configura cuentas

**Usuario A:**
1. Regístrate con `user1@test.com` / `password123`
2. Ve a **"Amigos"** → Copia tu ID (email)
3. Comparte el ID

**Usuario B:**
1. Abre el navegador en privado/incógnita
2. Regístrate con `user2@test.com` / `password123`
3. Ve a **"Amigos"** → Pega el ID de User A
4. Haz clic **"Agregar"**

### Paso 4: ¡Batalla!

**User A:**
1. Ve a **"Batalla"** → **"👥 Batalla con Amigo"**
2. Selecciona a `user2@test.com`
3. Escribe: `pikachu`
4. Haz clic **"🔥 Retar a batalla"**

**User B:**
1. Verá una **notificación push**
2. Haz clic para aceptar
3. Escribe: `charizard`
4. Haz clic **"✅ Aceptar"**

¡**LISTO! ¡A BATALLAR!** ⚡

---

## 🐛 Si no funciona

**Error: "No se puede conectar con el servidor"**
```bash
# Verificar que MongoDB esté corriendo
mongod  # Terminal nueva

# Verificar que estás ejecutando el servidor
npm run server  # Terminal nueva
```

**Error: "MongoDB connection refused"**
```bash
# Instalar MongoDB localmente desde:
# https://www.mongodb.com/try/download/community
```

**Error: "No hay invitaciones"**
- Recarga la página (F5)
- Ve a la consola (F12) para ver errores
- Verifica que el servidor esté corriendo

---

## 💡 Tips

- Abre **2 navegadores/ventanas privadas** para simular 2 jugadores
- Los nombres de Pokémon deben estar en minúsculas: `pikachu`, `charizard`
- La batalla se calcula automáticamente
- Puedes ver el historial en tu perfil

---

## 🎯 Próximo paso

Lee [BATTLE_MULTIPLAYER.md](BATTLE_MULTIPLAYER.md) para instrucciones detalladas

