const { OBSWebSocket } = require("obs-websocket-js");
const express = require("express");

async function connect() {
    try {
        let con = await obs.connect("ws://127.0.0.1:4455", "t7BSuzktL2FmuiGz");
        if(con !== undefined) connected = true;
        return con != undefined ? true : false;
    } catch(e) {
        error = `${e.name} - ${e.message}`;
        connected = false;
        return false;
    }
}

const obs = new OBSWebSocket();
const webserver = express();

webserver.use(express.json());

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

webserver.listen(8181, (e) => {
    console.log(e ? "webserver failed to connect" : "webserver listening on port 8181")
})