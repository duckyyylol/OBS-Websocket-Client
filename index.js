const { OBSWebSocket } = require("obs-websocket-js");
const express = require("express");
const { configDotenv } = require("dotenv");
const {join} = require("path")

configDotenv({path: join(__dirname, ".env"), quiet: true})

async function connect() {
    try {
        let con = await obs.connect(`ws://${process.env.WS_HOSTNAME}:${process.env.WS_PORT}`, process.env.WS_PASSWORD);
        if(con !== undefined) connected = true;
        return con != undefined ? true : false;
    } catch(e) {
        error = `${e.name} - ${e.message}`;
        connected = false;
        return false;
    }
}

function createPacket(command, data) {
	return JSON.stringify({ command, data, id: 0 });
}

let towerSocket = null;

if(process.env?.TOWERS_WS_URI && (process.env?.TOWERS_WS_URI || "") !== "" && (process.env?.TOWERS_WS_URI || "").startsWith("ws")) {
    console.log("Enabling Towers Socket")
    towerSocket = new WebSocket(process.env.TOWERS_WS_URI)
    
    towerSocket.onmessage = (ev) => {
        let packet = JSON.parse(ev.data);
    
        switch(packet.command) {
            case "hello": {
                console.log(`Towers Socket Connected`)
                towerSocket.send(createPacket("hello", {intents: ['ROSTER']}))
                break;
            }
            case "timer": {
                console.log("TIMER", packet)
                break;
            }
    
            case "nope": {
                console.log("Towers Socket denied permission", packet)
                break;
            }
        }
    
    }
} else {
    console.log("Skipping Towers Socket - Disabled in .env")
}


const obs = new OBSWebSocket();
const webserver = express();

webserver.use(express.json());

let scenes = {
    'Preview': "none",
    'Program': "none"
};
let transition = "none";
let connected = false;
let failures = 0;
let interval;
let error = "none";



(async () => {
    await connect();
})();

obs.on("Hello", () => {
    console.log("hello")
})

obs.on("ConnectionError", (a) => {
    error = `${a.name} - ${a.message}`;
})

obs.on("Identified", () => {
    console.log("identified")
    connected = true;
    console.log(`[OBS IDENTIFIED CLIENT]`)
    if(interval) clearInterval(interval);
})

obs.on("ConnectionClosed", (a) => {
    connected = false;
    console.log(`[WEBSOCKET CONNECTION CLOSED]`)
    error = `${a.name} - ${a.message}`;
    // interval = setInterval(async () => {
    //     if(!connected) {
    //         let con = await connect()
    //         console.log(`Attempting reconnect, ${con ? "successful" : "failed"}`, con)
    //         if(!con) failures+=1;
    //     } else {failures = 0;}
    //     if(failures < 10) console.log(`| ${failures} failure(s) - Exiting at 10 failures`)
    //     if(failures >= 10) {
    //         console.log(`!! ${failures} failures - Exiting`)
    //         failures = 0;
    //         clearInterval(interval);
    //         process.exit()
    //     }
    // }, 10e3)
})

obs.on("CurrentSceneTransitionChanged", (a) => {
    transition = a.transitionName;
})

webserver.get("/set-transition/:transition", async (req, res) => {
    if(!connected) await connect();
    let fail = false;
    if(!connected) {
        if(error === "none") {res.sendStatus(503);} else {
            res.statusCode = 503;
            res.send({error})
        }
        console.log("Restart OBS or Service. Error: ", error)
        return;
    }
    if(transition === req.params.transition) {
        res.sendStatus(200);
        console.log(`Skipped setting transition ${transition} -> ${req.params.transition}`)
        return;
    }
    await obs.call("SetCurrentSceneTransition", {transitionName: req.params.transition}).catch(e => {
        res.statusCode = 401;
        res.send({error: e.message})
        console.log("failed to set transition to " + req.params.transition, e)
        fail = true;
    }).finally(() => {
        if(!fail) res.sendStatus(200)
        if(!fail) {
            console.log(`Setting transition ${transition} -> ${req.params.transition}`)
            transition = req.params.transition;

        }
    })
})

webserver.get("/set-scene/:scene/:type", async (req, res) => {
    if(!connected) await connect();
    let fail = false;
    if(!connected) {
        if(error === "none") {res.sendStatus(503);} else {
            res.statusCode = 503;
            res.send({error})
        }
        console.log("Restart OBS or Service. Error: ", error)
        return;
    }
    if(scenes[req.params.type] === req.params.scene) {
        res.sendStatus(200);
        console.log(`Skipped setting scene ${scenes[req.params.type]} -> ${req.params.scene}`)
        return;
    }

    let validTypes = ["Program", "Preview"];

    if(!req.params.type || !validTypes.includes(req.params.type)) {
        res.statusCode = 401;
        res.send({error: `Argument "type" must be one of the following: ${validTypes.map(t => `"${t}"`).join(", ")} You provided "${req.params.type || "Nothing"}"`})
        return;
    }
    await obs.call(`SetCurrent${req.params.type}Scene`, {sceneName: req.params.scene}).catch(e => {
        res.statusCode = 401;
        res.send({error: e.message})
        console.log("failed to set scene to " + req.params.scene, e)
        fail = true;
    }).finally(() => {
        if(!fail) res.sendStatus(200)
        if(!fail) {
            console.log(`Setting scene ${scenes[req.params.type]} -> ${req.params.scene} on ${req.params.type.toUpperCase()}`)
            // scenes[req.params.type] = req.params.scene;

        }
    })
})

webserver.get("/timer/:minutes", async (req, res) => {
    if(towerSocket === null) {
        res.statusCode = 401;
        res.send({error: "The custom socket is not enabled in .env"})
        return;
    }
    try {
        towerSocket.send(createPacket("duckTimer", (req.params.minutes)))
        res.sendStatus(200);
    } catch(e) {
        res.statusCode = 401;
        res.send({error: e})
    }
})

webserver.listen(process.env.HTTP_PORT, (e) => {
    console.log(e ? "webserver failed to connect" : "webserver listening on port 8181")
})