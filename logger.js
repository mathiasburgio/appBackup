const fs = require("fs");
const path = require("path");
const fechas = require("./fechas");

let log = path.join(__dirname, "log1.txt");
let log2 = path.join(__dirname, "log2.txt");

function writeLog1(text){
    fs.appendFileSync(log, `${fechas.getNow(true)} => ${text}\n`);
}
function writeLog2(key, value){
    let content = fs.readFileSync(log2, "utf-8");
    let data = JSON.parse(content);
    data[key] = value;
    fs.writeFileSync(log2, JSON.stringify(data, null, 2));
}

function getLog1(lines = 100){
    let content = fs.readFileSync(log, "utf-8");
    let aux = content.split("\n");
    aux.reverse();
    if(aux.length > lines) aux.length = lines;
    return aux.reverse();
}
function getLog2(){
    let content = fs.readFileSync(log2, "utf-8");
    return content;
}


module.exports = {
    writeLog1,
    writeLog2,
    getLog1,
    getLog2
}