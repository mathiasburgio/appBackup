const rateLimit = require("express-rate-limit")
const express = require("express")
const cors = require("cors")
const cron = require('node-cron');
const bodyParser = require("body-parser")
const fs = require("fs")
const path = require("path")
const backuper = require("./backuper")
const downloader = require("./downloader")
const fechas = require("./fechas");
const fetch = require('node-fetch');
const logger = require("./logger");
require('dotenv').config();

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/ping", (req, res)=>{
    res.status(200).send("pong")
})

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 20, // Limite de 20 solicitudes por IP
    message: 'Has excedido el límite de 5 solicitudes en 10 minutos. Por favor intenta más tarde.',
    standardHeaders: true, // Envía información de límite en las cabeceras
    legacyHeaders: false, // Desactiva las cabeceras X-Ratelimit
});


//descarga el ultimo backup como archivo
app.post("/get-last-backup", limiter, (req, res)=>{
    try{
        const { email, password, database } = req.body;
        if (email === process.env.AUTH_EMAIL && password === process.env.AUTH_PASSWORD){
            logger.writeLog1(`/get-last-backup => (${database || "-"})`);
            let pathLastBackup = backuper.getLastBackup(database);
            if(pathLastBackup){
                res.setHeader("Content-Disposition", 'attachment; filename="backup.7z"');
                res.sendFile(pathLastBackup);
            }else{
                throw "no backup";
            }
        }else{
            res.status(200).end();
        }
    }catch(err){
        logger.writeLog1(`/get-last-backup => ERROR => ${err.toString()}`);
        res.status(200).send("ERROR");
    }
})

//ejecuta el downloader (de backups) y guarda el ultimo backup en su carpeta ./downloads
app.post("/download-backup", limiter, async (req, res)=>{
    try{
        const { email, password, database } = req.body;
        if (email === process.env.AUTH_EMAIL && password === process.env.AUTH_PASSWORD) {
            logger.writeLog1(`/download-backup => (${database || "-"})`);
            let databases = process.env.PATH_DATABASE.split(";")
            for(let db of databases){
                if(!database || database == db){
                    await downloader.downloadBackup(db);
                    logger.writeLog1(`downloader.downloadBackup (${db}) => OK`);
                    logger.writeLog2(`downloader.downloadBackup.${db}`, fechas.getNow(true));
                }
            }
            res.send("OK");
        }else{
            res.status(200).end()
        }
    }catch(err){
        logger.writeLog1(`/download-backup => ERROR ${err.toString()}`);
        res.status(200).send("ERROR");
    }
})

//ejecuta el downloader (de file) y descarga los archivos no sincronizados en ./downloads/{folder}
app.post("/download-files", limiter, async (req, res)=>{
    try{
        const { email, password } = req.body;
        if (email === process.env.AUTH_EMAIL && password === process.env.AUTH_PASSWORD) {
            logger.writeLog1(`/download-files`);
            let par = process.env.FILES_TO_DOWNLOAD.split(";");
            for(let routine of par){
                let folder = routine.split(" from ")[0].trim();
                let remoteUrl = routine.split(" from ")[1].trim();
                let count = await downloader.downloadFiles(folder, remoteUrl);
                logger.writeLog1(`downloader.downloadFiles (${folder}) (count ${count}) => OK`);
                logger.writeLog2(`downloader.downloadFiles.${folder}`, fechas.getNow(true));
                logger.writeLog2(`downloader.downloadFiles.${folder}.`, downloader.getFilesLength(folder));
            }
            res.status(200).send("OK");
        }else{
            res.status(200).end();
        }
    }catch(err){
        logger.writeLog1(`/download-files => ERROR ${err.toString()}`);
        res.status(200).send("ERROR");
    }
});

//genera un backup
app.post("/make-backup", limiter, async (req, res)=>{
    try{
        const { email, password, database } = req.body;
        if (email === process.env.AUTH_EMAIL && password === process.env.AUTH_PASSWORD) {
            logger.writeLog1(`/make-backup => (${database || "-"})`);
            let databases = process.env.PATH_DATABASE.split(";")
            for(let db of databases){
                if(!database || database == db){
                    await backuper.makeBackup(db);
                    logger.writeLog1(`backuper.makeBackup (${db}) => OK`);
                    logger.writeLog2(`backuper.makeBackup.${db}`, fechas.getNow(true));
                }
            }
            res.status(200).send("OK")
        }else{
            res.status(200).end();
        }
    }catch(err){
        logger.writeLog1(`/make-backup => ERROR ${err.toString()}`);
        res.status(200).send("ERROR");
    }
})

app.post("/get-log", limiter, async(req, res)=>{
    const { email, password, log } = req.body;
    if (email === process.env.AUTH_EMAIL && password === process.env.AUTH_PASSWORD) {
        if(log == "log1"){
            res.status(200).send(logger.getLog1());
        }else if(log == "log2"){
            res.status(200).send(logger.getLog2());
        }else{
            res.status(200).send("{}");//nada
        }
    }else{
        res.status(200).json({message: "error login"})
    }
})

app.get("/", (req, res)=>{
    res.sendFile( path.join(__dirname, "index.html") )
})

if(process.env.BACKUP_MODE == "backup" || process.env.BACKUP_MODE == "both"){
    let min = 0;//itera para ir haciendo el backup de cada BD cada 10 minutos
    process.env.PATH_DATABASE.split(";").forEach(db=>{
        cron.schedule(`${min} 4 * * *`, async () => {
            try{
                logger.writeLog1(`auto backup => ${db}`);
                await backuper.makeBackup(db);
                logger.writeLog1(`backuper.makeBackup (${db}) => OK`);
                logger.writeLog2(`backuper.makeBackup.${db}`, fechas.getNow(true));
            }catch(err){
                logger.writeLog1(`backuper.makeBackup (${db}) => ERROR => ${err.toString()}`);
            }
        });
        min += 10;
    })
}

if(process.env.BACKUP_MODE == "download" || process.env.BACKUP_MODE == "both"){
    let minDb = 0;//itera para ir haciendo el backup de cada BD cada 10 minutos
    process.env.PATH_DATABASE.split(";").forEach(db=>{
        cron.schedule(`${min} 5 * * *`, async () => {
            try{
                logger.writeLog1(`auto download => ${db}`);
                await downloader.downloadBackup(db);
                logger.writeLog1(`downloader.downloadBackup (${db}) => OK`);
                logger.writeLog2(`downloader.downloadBackup.${db}`, fechas.getNow(true));
            }catch(err){
                logger.writeLog1(`downloader.downloadBackup (${db}) => ERROR => ${err.toString()}`);
            }
        });
        minDb += 10;
    });

    let minFiles = 0;//itera para ir haciendo el backup de cada BD cada 10 minutos
    process.env.FILES_TO_DOWNLOAD.split(";").forEach(folderRemoteUrl=>{

        let folder = folderRemoteUrl.split(" from ")[0].trim();
        let remoteUrl = folderRemoteUrl.split(" from ")[1].trim();
        
        cron.schedule(`${min} 6 * * *`, async () => {
            try{
                logger.writeLog1(`auto download files => ${folder}`);
                let count = await downloader.downloadFiles(folder, remoteUrl);
                logger.writeLog1(`downloader.downloadFiles (${folder}) (count ${count}) => OK`);
                logger.writeLog2(`downloader.downloadFiles.${folder}`, fechas.getNow(true));
                logger.writeLog2(`downloader.downloadFiles.${folder}.`, downloader.getFilesLength(folder));
            }catch(err){
                logger.writeLog1(`downloader.downloadFiles (${folder}) => ERROR => ${err.toString()}`);
            }
        });
        minFiles += 10;
    });
}

if(fs.existsSync("./backups") == false) fs.mkdirSync("./backups");
if(fs.existsSync("./downloads") == false) fs.mkdirSync("./downloads");
if(fs.existsSync("./downloads/backups") == false) fs.mkdirSync("./downloads/backups");
if(fs.existsSync("./downloads/files") == false) fs.mkdirSync("./downloads/files");
if(fs.existsSync("./log1.txt") == false) fs.writeFileSync("./log1.txt", "CREATED\n");
if(fs.existsSync("./log2.txt") == false) fs.writeFileSync("./log2.txt", "{}");

app.listen(Number(process.env.PORT), ()=>{
    console.log("Escuchando en http://localhost:" + process.env.PORT)
})