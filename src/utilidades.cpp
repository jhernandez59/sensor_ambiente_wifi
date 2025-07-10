// ------------------------------
// Archivo: utilidades.cpp
// ------------------------------
#include "utilidades.h"
#include <ESP8266WiFi.h>
#include "estado.h"

void informacionSistema() {
  Serial.println("\n📟 Información del sistema:");
  Serial.printf("Estado: %s\n", estadoDispositivoATexto(estadoActual));
  Serial.printf("MAC: %s\n", WiFi.macAddress().c_str());
  Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("RSSI: %d dBm\n", WiFi.RSSI());
  Serial.printf("OTA para Usuario listo. Accede a http://%s/update\n",
                WiFi.localIP().toString().c_str());
  Serial.println();
}

void gestionarComandosSerie() {
  if (Serial.available()) {
    String comando = Serial.readStringUntil('\n');
    comando.trim();

    if (comando == "reset") {
      Serial.println(
          "🔁 RESET TOTAL: Borrando credenciales WiFi y todos los parámetros "
          "personalizados...");

      // 1. Borra las credenciales WiFi que gestiona WiFiManager
      wm.resetSettings();

      // 2. Borra tus parámetros personalizados de la EEPROM
      clearConfigEEPROM();

      Serial.println(
          "¡Borrado completo! Reiniciando para entrar en modo portal.");
      delay(1000);
      ESP.restart();
    }

    if (comando == "clear") {
      Serial.println(
          "🧹 CLEAR: Borrando solo los parámetros personalizados (nombre, lat, "
          "lon...).");
      Serial.println("Las credenciales WiFi se conservarán.");

      // Borra solo tus parámetros personalizados de la EEPROM
      clearConfigEEPROM();

      Serial.println(
          "¡Parámetros borrados! Reiniciando para recargar valores por "
          "defecto.");
      delay(1000);
      ESP.restart();
    }

    if (comando == "info") {
      informacionSistema();
    }
  }
}