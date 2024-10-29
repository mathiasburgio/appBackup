const fs = require("fs");
const path = require("path");
const fechas = require("./fechas");

let log = path.join(__dirname, "log.txt");
let log2 = path.join(__dirname, "log2.txt");

function writeLog(text){
    fs.appendFileSync(log, `${fechas.getNow(true)} => ${text}\n`);
}
function writeLog2(key, value){
    let content = fs.readFileSync(log2, "utf-8");
    let data = JSON.parse(content);
    data[key] = value;
    fs.writeFileSync(log2, JSON.stringify(data, null, 2));
}

function getLog(lines = 100){
    let content = fs.readFileSync(log2, "utf-8");
    let aux = content.split("\n");
    aux.reverse();
    aux.length = 100;
    return aux.reverse().join("\n");
}
function getLog2(asJson = false){
    let content = fs.readFileSync(log2, "utf-8");
    return asJson ? JSON.parse(content) : content;
}


module.exports = {
    writeLog,
    writeLog2,
    getLog,
    getLog2
}