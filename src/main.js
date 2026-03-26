import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { useUiStore } from '@/stores/ui'
import './assets/main.css'

const app = createApp(App)

// Keep pinia instance to allow using stores outside components (router hooks)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Router global loading indicator
const ui = useUiStore(pinia)
router.beforeEach(() => {
	ui.startLoading()
})
router.afterEach(() => {
	ui.stopLoading()
})
router.onError(() => {
	ui.resetLoading()
})

app.mount('#app')

function urlBase64ToUint8Array(base64String) {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
	const rawData = window.atob(base64)
	const outputArray = new Uint8Array(rawData.length)
	for (let i = 0; i < rawData.length; i += 1) {
		outputArray[i] = rawData.charCodeAt(i)
	}
	return outputArray
}

async function registerPushForUser(reg) {
	const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
	const apiBase = import.meta.env.VITE_API_BASE_URL
	if (!publicKey || !apiBase) return

	let user = null
	try {
		user = JSON.parse(localStorage.getItem('user') || 'null')
	} catch {}
	const userId = user?.id || user?.email
	if (!userId) return

	// Solo proceder si el usuario YA ha dado permiso (no pedir aquí)
	if (Notification.permission !== 'granted') return

	const existing = await reg.pushManager.getSubscription()
	const subscription = existing || await reg.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: urlBase64ToUint8Array(publicKey),
	})

	await fetch(`${apiBase}/api/push/subscribe`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ userId, subscription }),
	})
}

// Registrar Service Worker para cache App Shell y offline
if ('serviceWorker' in navigator) {
	console.log('✅ Service Worker API disponible')
	window.addEventListener('load', () => {
		console.log('🔄 Intentando registrar Service Worker...')
		navigator.serviceWorker
			.register('/sw.js')
			.then((reg) => {
				console.log('✅ Service Worker registrado exitosamente', reg.scope)
				console.log('✅ Modo offline habilitado')
				// Actualizaciones del SW
				if (reg.update) reg.update()
				reg.addEventListener('updatefound', () => {
					console.log('🔄 Nueva versión del SW detectada')
					const newSW = reg.installing
					if (!newSW) return
					newSW.addEventListener('statechange', () => {
						console.log('🔄 Estado SW:', newSW.state)
					})
				})
			})
			.catch((err) => {
				console.error('❌ SW registration failed:', err)
				console.error('Detalles:', err.message, err.stack)
			})
	})
} else {
	console.warn('⚠️ Service Worker no soportado en este navegador')
}

// Función para solicitar permiso de notificaciones cuando el usuario lo pida
window.requestNotificationPermission = async function() {
	if (!('Notification' in window)) {
		alert('Tu navegador no soporta notificaciones')
		return false
	}

	if (Notification.permission === 'granted') {
		console.log('✅ Permisos de notificación ya concedidos')
		return true
	}

	if (Notification.permission === 'denied') {
		console.log('❌ Permisos de notificación denegados por el usuario')
		return false
	}

	// Pedir permiso explícitamente
	const permission = await Notification.requestPermission()
	
	if (permission === 'granted') {
		console.log('✅ Permisos de notificación concedidos')
		// Registrar push si se concedió permiso
		if ('serviceWorker' in navigator) {
			const reg = await navigator.serviceWorker.ready
			await registerPushForUser(reg)
		}
		return true
	} else {
		console.log('❌ Usuario denegó permisos de notificación')
		return false
	}
}

// Cargar y escuchar notificaciones (solicitudes de amistad y batallas)
router.afterEach(() => {
	import('@/stores/notifications').then(({ useNotificationsStore }) => {
		const notifications = useNotificationsStore(pinia)
		const auth = useAuthStore(pinia)
		
		if (auth.isAuthenticated) {
			notifications.loadAll()
			// Recargar cada 10 segundos
			if (!window.notificationsInterval) {
				window.notificationsInterval = setInterval(
					() => notifications.loadAll(),
					10000
				)
			}
		}
	})
})
