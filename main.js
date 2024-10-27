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
require('dotenv').config();

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/ping", (req, res)=>{
    res.status(200).send("pong")
})

const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutos en milisegundos
    max: 5, // Limite de 5 solicitudes por IP
    message: 'Has excedido el límite de 5 solicitudes en 10 minutos. Por favor intenta más tarde.',
    standardHeaders: true, // Envía información de límite en las cabeceras
    legacyHeaders: false, // Desactiva las cabeceras X-Ratelimit
});


//descarga el ultimo backup como archivo
app.post("/get-last-backup", limiter, (req, res)=>{
    const { email, password } = req.body;
    if (email === process.env.AUTH_EMAIL && password === process.env.AUTH_PASSWORD) {
        let pathLastBackup = backuper.getLastBackup();
        if(pathLastBackup){
            res.setHeader("Content-Disposition", 'attachment; filename="backup.7z"');
            res.sendFile(pathLastBackup);
        }else{
            res.send("NO BACKUP");
        }
    }else{
        res.status(200).send("ERROR");
    }
})

//ejecuta el downloader y guarda el ultimo backup en su carpeta ./downloads
app.post("/download-backup", limiter, async (req, res)=>{
    const { email, password } = req.body;
    if (email === process.env.AUTH_EMAIL && password === process.env.AUTH_PASSWORD) {
        await downloader.downloadBackup();
        res.send("OK");
    }else{
        res.status(200).send("ERROR");
    }
})

//genera un backup
app.post("/make-backup", limiter, async (req, res)=>{
    const { email, password } = req.body;
    if (email === process.env.AUTH_EMAIL && password === process.env.AUTH_PASSWORD) {
        backuper.makeBackup()
        .then(ret=>{
            //se proceso el backup
            console.log("Backup realizado " + fechas.getNow(true));
            res.status(200).send("OK")
        })
    }else{
        res.status(200).send("ERROR");
    }
})

if(process.env.BACKUP_MODE == "backup" || process.env.BACKUP_MODE == "both"){
    cron.schedule('0 */6 * * *', () => {
        console.log('Generando backup...');
        backuper.makeBackup();
    });
}

if(process.env.BACKUP_MODE == "download" || process.env.BACKUP_MODE == "both"){
    cron.schedule('0 */6 * * *', () => {
        console.log('Descargando backup...');
        downloader.downloadBackup();
    });
}

if(fs.existsSync("./backups") == false) fs.mkdirSync("./backups");
if(fs.existsSync("./downloads") == false) fs.mkdirSync("./downloads");

app.listen(Number(process.env.PORT), ()=>{
    console.log("Escuchando en http://localhost:" + process.env.PORT)
})