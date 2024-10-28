const { exec } = require('child_process');
const archiver = require('archiver');
const { add } = require('node-7z');
const fs = require('fs');
const path = require('path');
const fechas = require("./fechas");

// Función para hacer un respaldo de la base de datos MongoDB
function backupDatabase(backupPath) {
    return new Promise((resolve, reject) => {
        const fullpath = `"C:\\Program Files\\MongoDB\\tools\\mongodump.exe"`;
        const exeName = "mongodump";

        //aqui puedo usar fullpath o exeName
        const dumpCommand = `${fullpath} --db ${process.env.PATH_DATABASE} --gzip --archive=${backupPath}`;
        console.log(dumpCommand);
        exec(dumpCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error al hacer el backup: ${error.message}`);
                return reject(error);
            }
            console.log('Backup creado exitosamente');
            resolve();
        });
    });
}

// Función para cifrar el archivo zip con contraseña
function encryptZip(zipPath, encryptedZipPath) {
    return new Promise((resolve, reject) => {
        const encryptStream = add(encryptedZipPath, zipPath, { password: process.env.ENCRYPT_PASSWORD });
        encryptStream.on('progress', (progress) => {
            console.log(`Progreso: ${progress.percent}%`);
        });

        encryptStream.on('data', (file) => {
            console.log(`Archivo procesado: ${file}`);
        });

        encryptStream.on('end', () => {
            console.log(`Archivo cifrado creado exitosamente en: ${encryptedZipPath}`);
            resolve();
        });

        encryptStream.on('error', (err) => {
            console.error(`Error durante el cifrado: ${err.message}`);
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

async function makeBackup(){
    try{

        const fileName = `${process.env.PATH_DATABASE}_${(new Date().getTime())}.zip`;
        const backupPath = path.join(__dirname, "backups", fileName);
        const encryptedZipPath = backupPath.replace("zip", "7z");
        await backupDatabase(backupPath);
        await encryptZip(backupPath, encryptedZipPath);

        //removeOlds();
        return {error: false, encryptedZipPath: encryptedZipPath};
    }catch(err){
        return {error: true, message: err};
    }
}

function getLastBackup(){
    let files = fs.readdirSync("./backups");
    let file = files.sort().reverse().find(f=>f.endsWith("7z"));
    if(!file) return null;

    let fullpath = path.join(__dirname, "backups", file);
    return fullpath;
}

module.exports = {
    makeBackup,
    removeOlds,
    getLastBackup  
}