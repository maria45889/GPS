import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue, set, push } from 'firebase/database'

// CONFIGURACIÓN DE FIREBASE
// Necesitas crear un proyecto en https://console.firebase.google.com/
// 1. Crea un proyecto nuevo
// 2. Habilita Realtime Database
// 3. Copia las credenciales aquí

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  databaseURL: "https://TU_PROYECTO-default-rtdb.firebaseio.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

// Funciones para la base de datos en tiempo real
export const shareLocation = (userId, locationData) => {
  const locationRef = ref(database, `locations/${userId}`)
  set(locationRef, {
    ...locationData,
    timestamp: Date.now(),
    lastUpdate: new Date().toISOString()
  })
}

export const listenToLocation = (userId, callback) => {
  const locationRef = ref(database, `locations/${userId}`)
  onValue(locationRef, (snapshot) => {
    const data = snapshot.val()
    callback(data)
  })
}

export const stopListening = (userId) => {
  const locationRef = ref(database, `locations/${userId}`)
  onValue(locationRef, null) // Detener escucha
}

export const generateUserId = () => {
  return push(ref(database, 'users')).key
}

export default database