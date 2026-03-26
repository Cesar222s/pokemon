// ============================================
// BACKEND SERVER - Express + MongoDB
// ============================================
// Este archivo es un ejemplo de backend para conectar con MongoDB
// Guárdalo como 'server.js' en la raíz del proyecto

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import webpush from 'web-push';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:dev@pokedex.local';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('⚠️ VAPID keys no configuradas. Push deshabilitado.');
}

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// ============================================
// CONEXIÓN A MONGODB
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokedex';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch((err) => console.error('❌ Error conectando a MongoDB:', err));

// ============================================
// SCHEMAS DE EJEMPLO
// ============================================

// Schema para Usuarios (auth)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Schema para suscripciones push
const pushSubscriptionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  subscription: { type: Object, required: true },
  updatedAt: { type: Date, default: Date.now }
});
const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

// Schema para Favoritos
const favoriteSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  pokemonId: { type: Number, required: true },
  pokemonName: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
const Favorite = mongoose.model('Favorite', favoriteSchema);

// Schema para Equipos
const teamSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  pokemons: [{
    pokemonId: Number,
    pokemonName: String
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Team = mongoose.model('Team', teamSchema);

// Schema para Batallas
const battleSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  opponentTeam: [{ pokemonId: Number, pokemonName: String }],
  userTeam: [{ pokemonId: Number, pokemonName: String }],
  result: { type: String, enum: ['win', 'lose', 'draw'] },
  timestamp: { type: Date, default: Date.now }
});
const Battle = mongoose.model('Battle', battleSchema);

async function sendPushToUser(userId, payload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { success: 0, failed: 1, error: 'VAPID keys no configuradas' };
  }

  const subs = await PushSubscription.find({ userId });
  let success = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub.subscription, JSON.stringify(payload));
      success += 1;
    } catch (err) {
      failed += 1;
      if (err.statusCode === 404 || err.statusCode === 410) {
        await PushSubscription.deleteOne({ _id: sub._id });
      }
    }
  }

  return { success, failed, total: subs.length };
}

// ============================================
// RUTAS - AUTH
// ============================================

app.post('/auth/register', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'El correo ya está registrado' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const user = await User.create({ email, passwordHash, passwordSalt: salt });

    const token = Buffer.from(`${user._id}:${Date.now()}`).toString('base64');
    res.status(201).json({ user: { id: user._id, email: user.email }, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const passwordHash = hashPassword(password, user.passwordSalt);
    if (passwordHash !== user.passwordHash) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = Buffer.from(`${user._id}:${Date.now()}`).toString('base64');
    res.json({ user: { id: user._id, email: user.email }, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// RUTAS - PUSH
// ============================================

app.post('/api/push/subscribe', async (req, res) => {
  try {
    const { userId, subscription } = req.body || {};
    if (!userId || !subscription?.endpoint) {
      return res.status(400).json({ message: 'userId y subscription son requeridos' });
    }

    await PushSubscription.findOneAndUpdate(
      { userId },
      { userId, subscription, updatedAt: Date.now() },
      { upsert: true, new: true }
    );

    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Invitacion de amistad (push)
app.post('/friends/invite', async (req, res) => {
  try {
    const { fromUserId, toUserId, fromName } = req.body || {};
    if (!toUserId) return res.status(400).json({ message: 'toUserId es requerido' });

    const payload = {
      title: 'Invitacion de amistad',
      message: `${fromName || fromUserId || 'Alguien'} te invito a ser amigo`,
      url: '/friends',
      kind: 'friend-invite',
      fromUserId,
    };

    const result = await sendPushToUser(toUserId, payload);
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reto de batalla (push)
app.post('/battles/challenge', async (req, res) => {
  try {
    const { fromUserId, toUserId, fromName } = req.body || {};
    if (!toUserId) return res.status(400).json({ message: 'toUserId es requerido' });

    const payload = {
      title: 'Reto de batalla',
      message: `${fromName || fromUserId || 'Alguien'} te ha retado a una batalla`,
      url: '/battle',
      kind: 'battle-challenge',
      fromUserId,
    };

    const result = await sendPushToUser(toUserId, payload);
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// RUTAS - FAVORITOS
// ============================================

// Obtener todos los favoritos de un usuario
app.get('/api/favorites/:userId', async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.params.userId });
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar favorito
app.post('/api/favorites', async (req, res) => {
  try {
    const { userId, pokemonId, pokemonName } = req.body;
    
    // Verificar si ya existe
    const existing = await Favorite.findOne({ userId, pokemonId });
    if (existing) {
      return res.status(400).json({ error: 'Ya está en favoritos' });
    }
    
    const favorite = new Favorite({ userId, pokemonId, pokemonName });
    await favorite.save();
    res.status(201).json(favorite);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar favorito
app.delete('/api/favorites/:userId/:pokemonId', async (req, res) => {
  try {
    await Favorite.deleteOne({ 
      userId: req.params.userId, 
      pokemonId: req.params.pokemonId 
    });
    res.json({ message: 'Eliminado de favoritos' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// RUTAS - EQUIPOS
// ============================================

// Obtener equipos de un usuario
app.get('/api/teams/:userId', async (req, res) => {
  try {
    const teams = await Team.find({ userId: req.params.userId });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear equipo
app.post('/api/teams', async (req, res) => {
  try {
    const { userId, name, pokemons } = req.body;
    const team = new Team({ userId, name, pokemons });
    await team.save();
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar equipo
app.put('/api/teams/:teamId', async (req, res) => {
  try {
    const { name, pokemons } = req.body;
    const team = await Team.findByIdAndUpdate(
      req.params.teamId,
      { name, pokemons, updatedAt: Date.now() },
      { new: true }
    );
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar equipo
app.delete('/api/teams/:teamId', async (req, res) => {
  try {
    await Team.findByIdAndDelete(req.params.teamId);
    res.json({ message: 'Equipo eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// RUTAS - BATALLAS
// ============================================

// Registrar batalla
app.post('/api/battles', async (req, res) => {
  try {
    const { userId, opponentTeam, userTeam, result } = req.body;
    const battle = new Battle({ userId, opponentTeam, userTeam, result });
    await battle.save();
    res.status(201).json(battle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener historial de batallas
app.get('/api/battles/:userId', async (req, res) => {
  try {
    const battles = await Battle.find({ userId: req.params.userId })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(battles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener invitaciones de batalla pendientes
app.get('/battles/invitations', (req, res) => {
  try {
    // En una implementación real, esto vendría de una base de datos
    // Por ahora, retorna un array vacío
    res.json({ invitations: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aceptar invitación de batalla
app.post('/battles/:battleId/accept', async (req, res) => {
  try {
    const { userTeam } = req.body || {};
    if (!userTeam) {
      return res.status(400).json({ message: 'userTeam es requerido' });
    }

    // Crear objeto de batalla activa
    const battle = {
      id: req.params.battleId,
      status: 'active',
      players: {
        player1: { team: userTeam, currentHp: {} },
        player2: { team: [], currentHp: {} }
      },
      turns: [],
      createdAt: new Date()
    };

    res.json({ battle });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rechazar invitación de batalla
app.post('/battles/:battleId/reject', (req, res) => {
  try {
    res.json({ ok: true, message: 'Invitación rechazada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar movimiento en batalla activa
app.post('/battles/:battleId/move', (req, res) => {
  try {
    const { move, pokemonIndex } = req.body || {};
    res.json({
      battle: {
        id: req.params.battleId,
        lastMove: { move, pokemonIndex, timestamp: new Date() }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Terminar batalla y guardar resultado
app.post('/battles/:battleId/finish', async (req, res) => {
  try {
    const { result } = req.body || {};
    const battle = new Battle({
      userId: req.user?.id || 'guest',
      userTeam: result?.userTeam || [],
      opponentTeam: result?.opponentTeam || [],
      result: result?.winner === 'player1' ? 'win' : result?.winner === 'player2' ? 'lose' : 'draw'
    });
    await battle.save();
    res.json({ battle });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener historial de batallas multijugador
app.get('/battles/history', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) {
      return res.json({ battles: [] });
    }
    const battles = await Battle.find({ userId })
      .sort({ timestamp: -1 })
      .limit(20);
    res.json({ battles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' 
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📦 Base de datos: ${MONGODB_URI}`);
});
