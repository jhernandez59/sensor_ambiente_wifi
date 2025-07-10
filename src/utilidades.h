// ------------------------------
// Archivo: utilidades.h
// ------------------------------
#ifndef UTILS_H
#define UTILS_H

#include "eeprom.h"    // <---  para borrar la EEPROM
#include "red_wifi.h"  // <--- para acceder a 'wm'

#define FIRMWARE_VERSION "1.0.1 Regalo"

void informacionSistema();
void gestionarComandosSerie();

#endif