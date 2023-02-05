/**
 * ==============================
 * FUNCIONES DE CONEXION AL JUEGO
 * ============================== 
 */

var started = false

function startTracker(){
    if(!started){
        started = true;
        connectToSocket();
    }
}

function stopTracker(){
    if(started){
        started = false;
        closeConection();
    }
}

var serverHost = "ws://localhost:8080"; //Por defecto, el puerto del WebServer del QUsb2Snes es el 8080
var socket = null;
var consoleName = null;

function setConectionText(text){
    document.getElementById("conectionStatus").innerHTML = text;
}

function connectToSocket(){
    setConectionText("Conectando...");
    socket = new WebSocket(serverHost); //Conectar al QUsb2Snes
    socket.binaryType = 'arraybuffer';

    socket.onerror = function(event) {
        closeConection();
        setConectionText("Error");
    }

    socket.onopen = lookForConsole;
}

function lookForConsole(event){
    setConectionText("Conectado, buscando dispositivo...");
    socket.send(JSON.stringify({
        Opcode: "DeviceList",
        Space: "SNES"
    }));

    socket.onmessage = connectToConsole;
}

function connectToConsole(event){
    var results = JSON.parse(event.data).Results;
    if (results.length < 1) {
        setConectionText("No hay ningun dispositivo");
        return;
    }
    consoleName = results[0];
    
    socket.send(JSON.stringify({ //Conexión a la consola
        Opcode : "Attach",
        Space : "SNES",
        Operands : [consoleName]
    }));
    socket.send(JSON.stringify({
        Opcode : "Info",
        Space : "SNES"
    }));
    socket.onmessage = empezarALeer; //Una vez confirmada la conexión, comenzamos a leer la memoria del juego
    setConectionText("Conectado a " + consoleName);

}

function empezarALeer(){
    intervaloLectura = setInterval(leer, 200);
}

function closeConection(){
    if (socket !== null) {
        socket.onopen = function () {};
        socket.onclose = function () {};
        socket.onmessage = function () {};
        socket.onerror = function () {};
        socket.close();
        socket = null;
        setConectionText("Desconectado");
    }
    clearInterval(intervaloLectura);
}

/**
 * ======================================
 * FUNCIONES LEYENDO LA MEMORIA DEL JUEGO
 * ======================================
*/

var INICIO_MEMORIAS = 0xF50000;
var INICIO_GUARDADO = INICIO_MEMORIAS + 0xF000;

function leerMemoria(dir, tam, fun){ //Por algún motivo, si llamo directamente a socket.send, no puedo leer la respuesta
    socket.send(JSON.stringify({
        Opcode : "GetAddress",
        Space : "SNES",
        Operands : [dir.toString(16), tam.toString(16)]
    }));

    socket.onmessage = fun;
}

var inventario = new Uint8Array();

function leer(){
    leerMemoria(INICIO_GUARDADO + 0x340, 0xFF, function(event){
        inventario = new Uint8Array([...new Uint8Array(event.data)]);
        trackear(inventario);
    });
}

//inventario[0] = 0x7EF340 address (1st inventory address on WRAM)
var tracker = new Array(35); //sobra espacio

function trackear(inventario){
    
    //bow
    switch(inventario[0]){
        case 0:
            tracker[0] = 0;
            break;
        case 1:
        case 2:
            tracker[0] = 1;
            break;
        case 3:
        case 4:
            tracker[0] = 2;
            break;
    }

    //boom
    tracker[1] = inventario[1];

    //hook
    tracker[2] = inventario[2];
    
    //bombs
    if(inventario[3] > 0){
        tracker[3] = 1;
    }
    else{
        tracker[3] = 0;
    }

    //shroom
    tracker[4] = inventario[4];

    //fire rod
    tracker[5] = inventario[5];

    //ice rod
    tracker[6] = inventario[6];

    //bombos
    tracker[7] = inventario[7];

    //ether
    tracker[8] = inventario[8];
    
    //quake
    tracker[9] = inventario[9];

    //lamp
    tracker[10] = inventario[10];

    //hammer
    tracker[11] = inventario[11];

    //shovel VER CODIGO RANDO
    //flute VER CODIGO RANDO


    //Pendants: bitfield, gbr
    tracker[33] = inventario[52];
    //Crystals: bitfield, .342 7516
    tracker[34] = inventario[58];

    actualizaTracker(tracker)
}

function actualizaTracker(tracker){
    document.getElementById("arco").innerHTML = "| Arco |<br>" + tracker[0].toString();
    document.getElementById("boom").innerHTML = "| Boom |<br>" + tracker[1].toString();
    document.getElementById("hook").innerHTML = "| Hook |<br>" + tracker[2].toString();
    document.getElementById("bomb").innerHTML = "| Bomb |<br>" + tracker[3].toString();
    document.getElementById("mush").innerHTML = "| Mush |<br>" + tracker[4].toString();
    document.getElementById("frod").innerHTML = "| FRod |<br>" + tracker[5].toString();
    document.getElementById("irod").innerHTML = "| IRod |<br>" + tracker[6].toString();
    document.getElementById("bombos").innerHTML = "| Bbos |<br>" + tracker[7].toString();
    document.getElementById("ether").innerHTML = "| Ethe |<br>" + tracker[8].toString();
    document.getElementById("quake").innerHTML = "| Quak |<br>" + tracker[9].toString();
    document.getElementById("lamp").innerHTML = "| Lamp |<br>" + tracker[10].toString();
    document.getElementById("hammer").innerHTML = "| Hamr |<br>" + tracker[11].toString();
    document.getElementById("pendants").innerHTML = "| gbr |<br>" + tracker[33].toString();
    document.getElementById("crystals").innerHTML = "|.342 7516|<br>" + tracker[34].toString();
}