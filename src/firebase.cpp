// ------------------------------
// Archivo: firebase.cpp
// ------------------------------
#include "firebase.h"
#include "estado.h"
#include "secrets.h"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig conf;

void configurarFirebase() {
  conf.database_url = FIREBASE_HOST;
  conf.signer.tokens.legacy_token = FIREBASE_KEY;
  Firebase.begin(&conf, &auth);
  Firebase.reconnectWiFi(true);
}

bool permisoFirebase(String mac) {
  // --- LÍNEA DE DEPURACIÓN CLAVE ---
  Serial.print("Intentando verificar permiso para la MAC: [");
  Serial.print(mac);
  Serial.println("]");

  String path = "/macs_permitidas/" + mac;
  Serial.println("Consultando la ruta en Firebase: " + path);

  if (Firebase.RTDB.getBool(&fbdo, path)) {
    if (fbdo.boolData()) {
      Serial.println("✅ MAC permitida. Puedes enviar datos.");
      return true;
    } else {
      Serial.println(
          "⛔ La consulta a Firebase tuvo éxito, pero el valor encontrado no "
          "es 'true'.");
      return false;
    }
  } else {
    Serial.print("❌ Error al ejecutar la consulta getBool: ");
    Serial.println(fbdo.errorReason());
    return false;
  }
}

void registrarDatosSensores() {
  if (!Firebase.ready()) {
    Serial.println("Firebase no está listo, esperando...");
    return;
  }

  String macAddress = obtenerMacAddress();  // Obtener la MAC una sola vez

  // --- PASO 1: Verificar permiso antes de hacer nada más ---
  if (!permisoFirebase(macAddress)) {
    // La función permisoFirebase() ya imprime el motivo,
    // así que no necesitamos más logs aquí.
    return;  // Salir de la función si no hay permiso.
  }

  // --- PASO 2: Si el permiso es válido, proceder a leer y enviar ---
  DatosSensores datos = leerSensores();
  if (!datos.ahtValido && !datos.bmpValido) {
    Serial.println("Lectura de sensores no válida.");
    return;
  }

  estadoAnterior = estadoActual;
  estadoActual = ENVIANDO_DATOS;  // ✨ Esto activa el parpadeo

  int desconexiones = getContadorDesconexiones();

  FirebaseJson json;
  // Datos ubicaion
  json.set("nombre", customNombre);    // 🏷️ Nombre del sensor
  json.set("latitud", customLatitud);  // 📍 Coordenadas
  json.set("longitud", customLongitud);
  json.set("altura", customAltura);

  // 🌡️ Sensores ambientales
  json.set("temperatura", datos.temperatura);
  json.set("humedad", datos.humedad);
  json.set("presion", datos.presion);

  // ⚙️ Estado general
  json.set("estado/aht20", datos.ahtValido ? "OK" : "FALLA");
  json.set("estado/bmp280", datos.bmpValido ? "OK" : "FALLA");

  // 📡 Estado de red
  json.set("estado/ip", WiFi.localIP().toString());
  json.set("estado/ssid", WiFi.SSID());
  json.set("estado/rssi", WiFi.RSSI());  // Nivel de señal
  json.set("estado/reintentos_wifi",
           desconexiones);  // Cuántos intentos para reconectar
  json.set("estado/tiempo_on",
           millis() / 1000);  // Tiempo encendido en segundos

  // 🧠 Información de software
  json.set("estado/ver_firmware", String(FIRMWARE_VERSION));

  // ⏱️ Marca de tiempo generada por Firebase
  json.set("ultimo_reporte/.sv", "timestamp");

  String path = "/sensores_en_tiempo_real/" + macAddress;

  if (Firebase.RTDB.setJSON(&fbdo, path, &json)) {
    // firebase.patch(path.c_str(), json);
    Serial.println("✅ Datos enviados correctamente");
    // datosAnterior = datos;
  } else {
    Serial.println("❌ Error al enviar datos: " + fbdo.errorReason());
  }
}
