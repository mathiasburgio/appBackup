const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function downloadBackup() {
    try {
        const response = await fetch(process.env.SERVER_URL + "/get-last-backup", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: process.env.AUTH_EMAIL, password: process.env.AUTH_PASSWORD })
        });

        if (!response.ok) throw new Error(`Error en la descarga: ${response.statusText}`);

        // Guardar el archivo como backup con la fecha y hora
        const fileStream = fs.createWriteStream(path.join(__dirname, 'downloads', `backup_${Date.now()}.7z`));
        await new Promise((resolve, reject) => {
            response.body.pipe(fileStream);
            response.body.on('error', reject);
            fileStream.on('finish', resolve);
        });

        console.log('Backup descargado exitosamente.');
    } catch (err) {
        console.error(`Error al descargar el backup: ${err.message}`);
    }
}

module.exports.downloadBackup = downloadBackup;