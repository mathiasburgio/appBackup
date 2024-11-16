const { exec } = require('child_process');
const archiver = require('archiver');
const { add } = require('node-7z');
const fs = require('fs');
const path = require('path');
const fechas = require("./fechas");
const logger = require("./logger");

// Función para hacer un respaldo de la base de datos MongoDB
function backupDatabase(db, backupPath) {
    return new Promise((resolve, reject) => {
        const os = process.platform;
        const mongoDumpPath = (os == "win32" ? `"C:\\Program Files\\MongoDB\\tools\\mongodump.exe"` : "mongodump");

        //aqui puedo usar fullpath o exeName
        const dumpCommand = `${mongoDumpPath} --db ${db} --gzip --archive=${backupPath}`;
        //console.log(dumpCommand);
        exec(dumpCommand, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }
            resolve();
        });
    });
}

// Función para cifrar el archivo zip con contraseña
function encryptZip(zipPath, encryptedZipPath) {
    return new Promise((resolve, reject) => {
        const encryptStream = add(encryptedZipPath, zipPath, { password: process.env.ENCRYPT_PASSWORD });
        encryptStream.on('progress', (progress) => {
            //console.log(`Progreso: ${progress.percent}%`);
        });

        encryptStream.on('data', (data) => {
            //console.log(`Archivo procesado: ${data.file}`);
        });

        encryptStream.on('end', () => {
            //console.log(`Archivo cifrado creado exitosamente en: ${encryptedZipPath}`);
            resolve();
        });

        encryptStream.on('error', (err) => {
            reject(err);
        });
    });
}

function removeOlds(){
    let files = fs.readdirSync("./backups");
    files.sort().reverse();//mas nuevos 1ro
    let maxCopies = 10;//numero de copias q mantengo en el servidor
    let aux = 0;//contador de archivos. Cuando llega al maxCopies empieza a borrar el resto
    for(let file of files){
        let fullpath = path.join(__dirname, "backups", file);
        if(file.endsWith(".zip")){
            //borra todos los q no estan cifrados
            fs.unlinkSync( fullpath );
        }else if(file.endsWith(".7z")){
            if(aux >= maxCopies) fs.unlinkSync( fullpath );
            aux++;
        }else{
            //nada que hacer maquina, aqui solo trabajamos con los archivos generados por este script
        }
    }
}

async function makeBackup(database=null){
    try{

        const fileName = `backup_${(new Date().getTime())}_${database}.zip`;
        const backupPath = path.join(__dirname, "backups", fileName);
        const encryptedZipPath = backupPath.replace("zip", "7z");
        await backupDatabase(database, backupPath);
        await encryptZip(backupPath, encryptedZipPath);

        fs.rmSync(backupPath);//borra el .zip
        return encryptedZipPath;
    }catch(err){
        throw err;
    }
}

function getLastBackup(database=null){
    let files = fs.readdirSync("./backups");
    let file = files.sort().reverse().find(f=>f.endsWith(database ? database + ".7z" : ".7z"));
    if(!file) return null;
    let fullpath = path.join(__dirname, "backups", file);
    return fullpath;
}

module.exports = {
    makeBackup,
    removeOlds,
    getLastBackup  
}