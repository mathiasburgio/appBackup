const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const fechas = require('./fechas');

//EDITAR ESTOS CAMPOS SEGUNDO CORRESPONDA <<<<<<<<<-----------IMPORTANTE
const folderFiles = "imagenes"; //nombre de la carpeta local
const urlFiles = "http://localhost:4000"; //url de cdn.mateflix

async function downloadBackup() {
    try {
        const response = await fetch(process.env.SERVER_URL + "/get-last-backup", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: process.env.AUTH_EMAIL, password: process.env.AUTH_PASSWORD })
        });

        if (!response.ok) throw new Error(`Error en la descarga: ${response.statusText}`);

        // Guardar el archivo como backup con la fecha y hora
        const fileStream = fs.createWriteStream(path.join(__dirname, 'downloads', 'backups', `backup_${Date.now()}.7z`));
        await new Promise((resolve, reject) => {
            response.body.pipe(fileStream);
            response.body.on('error', reject);
            fileStream.on('finish', resolve);
        });

        fs.appendFileSync(path.join(__dirname, '/downloads/log.txt'), fechas.getNow(true) + " => backup database\n");
        console.log('Backup descargado exitosamente.');
    } catch (err) {
        console.error(`Error al descargar el backup: ${err.message}`);
    }
}

async function downloadFiles(){
    let _birthtime = 0;// se autocompleta posteriormente

    //crea la carpeta local y busca el archivo de paginacion
    let folderPath = path.join(__dirname, "/downloads/files/", folderFiles);
    if(fs.existsSync(folderPath) == false) fs.mkdirSync(folderPath);
    if(fs.existsSync(folderPath + "/_birthtime.txt")){
        _birthtime = fs.readFileSync(folderPath + "/_birthtime.txt", "utf-8");
    }

    //FALTA GESTION DE PAGINACION
    let response = await fetch(urlFiles + '/request-backup', {
        method: 'POST',
        headers:{ 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey: "asd-123", GLOBAL_PATH: "/public", birthtime: _birthtime })
    })
    let data = await response.json();
 
    let errores = [];
    try{
        for(let file of data.files){
            const response = await fetch(urlFiles + file.relativePath);
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
        fs.appendFileSync(path.join(__dirname, '/downloads/log.txt'), `${fechas.getNow(true)} => backup files (${data.files.length}) - bithtime ${_birthtime.toString()} \n` );
        console.log("descargados: " + data.files.length);
        fs.writeFileSync(folderPath + "/_birthtime.txt", _birthtime.toString());
    }catch(err){
        errores.push(err);
    }
    return errores;
}

function getFilesLength(){
    let files = fs.readdirSync( path.join(__dirname, "downloads", "files", folderFiles));
    return files.length;
}
function getLog(lines=30){
    let data = fs.readFileSync( path.join(__dirname, "downloads", "log.txt"), "utf-8");
    let dataLines = data.split("\n");
    return dataLines.slice(dataLines.length - lines).join("\n");
}
function getLastFilesDateTime(){
    let data = fs.readFileSync( path.join(__dirname, "downloads", "log.txt"), "utf-8");
    let dataLines = data.split("\n");
    dataLines.reverse();
    let aux = dataLines.find(line=>line.includes("backup files"));
    if(aux) return aux.split("=>")[0].trim();
    return "???";
}
function getLastBackupDateTime(){
    let data = fs.readFileSync( path.join(__dirname, "downloads", "log.txt"), "utf-8");
    let dataLines = data.split("\n");
    dataLines.reverse();
    let aux = dataLines.find(line=>line.includes("backup database"));
    if(aux) return aux.split("=>")[0].trim();
    return "???";
}

module.exports = {
    downloadBackup: downloadBackup,
    downloadFiles: downloadFiles,
    getFilesLength,
    getLog,
    getLastFilesDateTime,
    getLastBackupDateTime
}