# Script de Backup para Servidores

Este script permite realizar copias de seguridad en servidores y, a su vez, ejecutarlo en servidores locales para descargar dichas copias.

## Requisitos

- **7-Zip**: Asegúrate de que 7-Zip esté instalado y accesible desde la línea de comandos.
- **MongoDB Tools**: Debes tener las herramientas de MongoDB (mongotools) instaladas y accesibles desde la línea de comandos.
- **Variables de Entorno**: Configura las variables de entorno necesarias.

## Configuración

1. Copia el archivo `.env_example` y renómbralo a `.env`.
2. Edita los parámetros en `.env` para adaptarlos a tus necesidades.

### Modos de Operación

El sistema puede trabajar en tres modos diferentes, definidos por la variable de entorno `BACKUP_MODE`:

- **BACKUP_MODE = backup**: Realiza backups de sí mismo.
- **BACKUP_MODE = download**: Descarga backups de otro servidor.
- **BACKUP_MODE = both**: Realiza ambas acciones.

### Ejecución Automática

El sistema ejecuta la acción configurada cada 6 horas.

## Endpoints

Todos los endpoints requieren que se envíen en el cuerpo de la solicitud el `email` y `password`, los cuales deben coincidir con los configurados en el archivo `.env`.

### Endpoints Disponibles

- **POST /get-last-backup**  
  Devuelve el último archivo de backup almacenado en `./backups`.

- **POST /download-backup**  
  Ejecuta el descargador interno para descargar el último archivo de backup y almacenarlo en `./downloads`.

- **POST /make-backup**  
  Genera un backup y lo almacena en `./backups`.

## Ejemplo de Uso

A continuación, se muestran ejemplos de cómo interactuar con los endpoints utilizando `curl`:

1. Obtener el último backup:

   ```bash
   curl -X POST http://<tu-servidor>/get-last-backup -H "Content-Type: application/json" -d '{"email": "tu_email", "password": "tu_password"}'

2. Descargar el último backup:

   ```bash
   curl -X POST http://<tu-servidor>/download-backup -H "Content-Type: application/json" -d '{"email": "tu_email", "password": "tu_password"}'

3. Hacer un nuevo backup:

   ```bash
   curl -X POST http://<tu-servidor>/get-last-backup -H "Content-Type: application/json" -d '{"email": "tu_email", "password": "tu_password"}'
