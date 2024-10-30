const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const fechas = require('./fechas');
const logger = require("./logger");

async function downloadBackup(database=null) {
    try {
        const response = await fetch(process.env.REMOTE_BACKUP_SERVER + "/get-last-backup", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: process.env.AUTH_EMAIL, password: process.env.AUTH_PASSWORD, database: database })
        });

        if (!response.ok) throw new Error(`Error en la descarga: ${response.statusText}`);

        // Guardar el archivo como backup con la fecha y hora
        const fileStream = fs.createWriteStream(path.join(__dirname, 'downloads', 'backups', `backup_${Date.now()}_${database}.7z`));
        await new Promise((resolve, reject) => {
            response.body.pipe(fileStream);
            response.body.on('error', reject);
            fileStream.on('finish', resolve);
        });
    } catch (err) {
        throw err;
    }
}

async function downloadFiles(folder, remoteUrl){
    let errores = [];
    
    let domain = remoteUrl.substring(0, remoteUrl.indexOf("/", 7));
    let relativeUrl = remoteUrl.substring(domain.length);

    let _birthtime = "1990-01-01T10:10";// se autocompleta posteriormente

    //crea la carpeta local y busca el archivo de paginacion
    let folderPath = path.join(__dirname, "/downloads/files/", folder);
    if(fs.existsSync(folderPath) == false) fs.mkdirSync(folderPath);
    if(fs.existsSync(folderPath + "/_birthtime.txt")){
        _birthtime = fs.readFileSync(folderPath + "/_birthtime.txt", "utf-8");
    }

    //FALTA GESTION DE PAGINACION
    let response = await fetch(domain + '/request-backup', {
        method: 'POST',
        headers:{ 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey: process.env.FILES_TO_DOWNLOAD_PRIVATE_KEY, GLOBAL_PATH: relativeUrl, birthtime: _birthtime })
    })
    let data = await response.json();
    if(data.error) throw data.message;
    
    //console.log(data);

    //limito los archivos a descargar
    if(data.files.length > Number(process.env.FILES_TO_DOWNLOAD_PER_CALL)) data.files.length = Number(process.env.FILES_TO_DOWNLOAD_PER_CALL);
    
    try{
        for(let file of data.files){
            const response = await fetch(remoteUrl + file.relativePath);
            const writer = fs.createWriteStream(folderPath + "/" + file.name);
            response.body.pipe(writer);
    
            writer.on('finish', () => {
                // Grabo OK
                //console.log("Descarga completada");
            });
        
            writer.on('error', (err) => {
                errores.push(err)
                //console.error("Error al descargar:", err);
            });
            _birthtime = file.birthtime;
        }
        fs.writeFileSync(folderPath + "/_birthtime.txt", _birthtime.toString());
    }catch(err){
        errores.push(err);
    }
    if(errores.length > 0){
        throw errores.join("\n");
    }

    return data.files.length;//devuelve la cantidad descargada
}

function getFilesLength(folder){
    try{
        let files = fs.readdirSync( path.join(__dirname, "downloads", "files", folder) );
        return files.length || 0;
    }catch(err){
        return 0;
    }
}

module.exports = {
    downloadBackup: downloadBackup,
    downloadFiles: downloadFiles,
    getFilesLength,
}