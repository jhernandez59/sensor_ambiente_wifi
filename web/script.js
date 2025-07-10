// script.js
// 1. Importaciones (sin cambios)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 2. Configuración de Firebase (sin cambios)
const firebaseConfig = {
  apiKey: "AIzaSyCtXrGlTEXBzQdbYTFSE0vOEJKmYj1AAf4",
  authDomain: "esp8266-sensor-8d08f.firebaseapp.com",
  databaseURL: "https://esp8266-sensor-8d08f-default-rtdb.firebaseio.com",
  projectId: "esp8266-sensor-8d08f",
  storageBucket: "esp8266-sensor-8d08f.firebasestorage.app",
  messagingSenderId: "760893441338",
  appId: "1:760893441338:web:c2522c7eff4b97b50a3c03",
};

// 3. Inicialización y configuración (sin cambios)
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const params = new URLSearchParams(location.search);
const mac = params.get("mac") || "68C63A87F36C";
const path = `/sensores_en_tiempo_real/${mac}`;

// Funciones de utilidad (sin cambios)
function calcularSensacionTermica(tempC, humedad) {
  //... (código sin cambios)
  if (tempC === null || humedad === null) return "-";
  const tempF = (tempC * 9) / 5 + 32;
  if (tempF < 80 || humedad < 40) return tempC;
  let hi =
    -42.379 +
    2.04901523 * tempF +
    10.14333127 * humedad -
    0.22475541 * tempF * humedad -
    0.00683783 * tempF * tempF -
    0.05481717 * humedad * humedad +
    0.00122874 * tempF * tempF * humedad +
    0.00085282 * tempF * humedad * humedad -
    0.00000199 * tempF * tempF * humedad * humedad;
  return Math.round((((hi - 32) * 5) / 9) * 10) / 10;
}

// Lógica de estado del sensor
let ultimoTimestampRecibido = 0; // Se guardará en milisegundos
const UMBRAL_DESCONEXION_MS = 300 * 1000; // 5 minutos, en milisegundos

function actualizarEstadoSensor() {
  if (ultimoTimestampRecibido === 0) {
    document.getElementById("estado_sensor").textContent = "Esperando datos...";
    return;
  }

  // --> CORRECCIÓN: Trabajamos todo en milisegundos para ser consistentes.
  const timestampActual = Date.now();
  const diferenciaMs = timestampActual - ultimoTimestampRecibido;
  const diferenciaSegundos = Math.floor(diferenciaMs / 1000);

  const estadoSpan = document.getElementById("estado_sensor");

  if (diferenciaMs < UMBRAL_DESCONEXION_MS) {
    estadoSpan.textContent = `En línea (hace ${diferenciaSegundos} s) ✅`;
    estadoSpan.style.color = "green";
  } else {
    const minutosPasados = Math.floor(diferenciaSegundos / 60);
    estadoSpan.textContent = `Desconectado (última vez hace ${minutosPasados} min) ❌`;
    estadoSpan.style.color = "red";
  }
}

// Referencia a Firebase
const sensorRef = ref(database, path);
let unsubscribe;

// Listener principal de Firebase
unsubscribe = onValue(
  sensorRef,
  (snapshot) => {
    const data = snapshot.val();
    if (data) {
      console.log("Datos recibidos:", data);

      document.getElementById("nombre").textContent =
        data.nombre || "Sin nombre";

      // --> CORRECCIÓN: Comprobamos si el valor es un número antes de usar .toFixed()
      document.getElementById("temp").textContent =
        typeof data.temperatura === "number"
          ? data.temperatura.toFixed(1) + " °C 🌡️"
          : "-";
      document.getElementById("hum").textContent =
        typeof data.humedad === "number"
          ? data.humedad.toFixed(1) + " % 💧"
          : "-";
      document.getElementById("pres").textContent =
        typeof data.presion === "number"
          ? data.presion.toFixed(1) + " hPa 🌬️"
          : "-";

      if (data.estado) {
        document.getElementById("ip").textContent = data.estado.ip || "-";
        document.getElementById("rssi").textContent =
          data.estado.rssi + " dBm 📶";
        document.getElementById("firmware").textContent =
          data.estado.ver_firmware || "-";
      }

      // --> CORRECCIÓN: Guardamos el timestamp en milisegundos tal como viene de Firebase
      if (data.last_updated) {
        ultimoTimestampRecibido = data.last_updated;
      }

      actualizarEstadoSensor();

      if (
        typeof data.temperatura === "number" &&
        typeof data.humedad === "number"
      ) {
        const sensacion = calcularSensacionTermica(
          data.temperatura,
          data.humedad
        );
        document.getElementById("sensacion").textContent =
          sensacion.toFixed(1) + " °C 🧣";
      }

      if (data.latitud && data.longitud) {
        document.getElementById(
          "coordenadas"
        ).textContent = `${data.latitud}, ${data.longitud}`;
        obtenerClimaExterior(data.latitud, data.longitud);
      }
    } else {
      // (código de "sensor no encontrado" sin cambios)
    }
  },
  (error) => {
    console.error("Error al leer los datos de Firebase:", error);
    document.getElementById("nombre").textContent = "Error de conexión";
  }
);

// Limpieza y temporizadores
window.addEventListener("pagehide", () => {
  if (unsubscribe) {
    console.log("Cancelando la escucha de Firebase...");
    unsubscribe();
  }
});

setInterval(actualizarEstadoSensor, 10000);

// Lógica de OpenWeatherMap
const apiKey = "c313eb999e2d697113ca276d4a4c4ffa";
let ultimoClimaTimestamp = 0; // --> MEJORA: Variable para "cachear" la llamada a la API

function obtenerClimaExterior(lat, lon) {
  const ahora = Date.now();
  // --> MEJORA: Solo llama a la API si han pasado más de 30 minutos
  if (ahora - ultimoClimaTimestamp < 1800000) {
    // 30 minutos en milisegundos
    console.log("Usando datos de clima cacheados.");
    return;
  }

  console.log("Obteniendo nuevos datos de clima exterior...");
  ultimoClimaTimestamp = ahora; // Actualiza el timestamp de la última llamada

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=es&appid=${apiKey}`;
  fetch(url)
    .then((response) => response.json())
    .then((clima) => {
      document.getElementById("temp_ext").textContent =
        clima.main.temp.toFixed(1) + " °C 🌡️";
      document.getElementById("hum_ext").textContent =
        clima.main.humidity + " % 💧";
      document.getElementById("pres_ext").textContent =
        clima.main.pressure + " hPa 🌬️";
      document.getElementById("ubicacion_ext").textContent = clima.name + " 🌎";
    })
    .catch((error) => {
      console.error("Error al consultar OpenWeatherMap:", error);
    });
}
