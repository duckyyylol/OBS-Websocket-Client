Params## Configuring
---
Main Config File: `.env`

Copy `.env.example` as `.env` and edit its values to configure the client

### Configuration Options
| Option        | Type   | Default   | Required | Description                                                                                                                                                                                                                                                                                                      |
|---------------|--------|-----------|----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| WS_PASSWORD   | string | null      | Yes      | The password to connect to the OBS WebSocket.<br><br>You can copy this password to your clipboard by navigating to **Tools** -> **WebSocket Server Settings** -> **Show Connect Info**<br><br>*If this is your first time using the WebSocket, you may need to enable it and generate a password in the same settings menu.* |
| WS_HOSTNAME   | string | 127.0.0.1 | Yes      | The host to connect to the OBS WebSocket.  Defaults to your local machine.<br><br>**Only change this if you have a reason to**                                                                                                                                                                                          |
| WS_PORT       | number | 4455      | Yes      | The port to connect to the OBS WebSocket.  Defaults to `4455`  <br><br>**Only change this if you also change the WebSocket port within OBS**                                                                                                                                                                             |
| HTTP_PORT     | number | 8181      | Yes      | The port on which the client can be accessed.  Defaults to `8181`. <br><br>**Only change this if the default port is currently being used**                                                                                                                                                                              |
| TOWERS_WS_URI | string | null      | No       | This option allows you to connect to a custom WebSocket server to enable extra actions **with your own code**. <br><br>Current Extras: `/timer`|

## Endpoints (OBS)
---

| Endpoint |Method|Params| Description |
|----------|----------|----------|-------------|
| /set-transition/:transitionName|GET|`transitionName` - The case-sensitive name of the incoming transition in OBS| Sets the transition in OBS. Transition must be triggered manually.|
|/set-scene/:sceneName/:destination|GET|`sceneName` - The case-sensitive name of the incoming scene in OBS<br><br>`destination` - Where to set the scene in OBS ("Preview", "Program") [Case-Sensitive]|Set the current scene in OBS on either Preview or Program

## Endpoints (Extra)
---

| Endpoint |Method|Params| Description |
|----------|----------|----------|-------------|
| /timer/:minutes|GET|`minutes` - The number of minutes to put on the timer| Sets the timer to **x** minute(s).|

## Custom WebSocket Server
---
### Packets

> #### HTTP Endpoint `/timer/:minutes`
> ##### Packet JSON (example, 60 minutes)
> ```jsonc
> {
>     "id": 0,
>     "command": "duckTimer",
>     "data": 60 // Minutes Parameter from HTTP endpoint
> }
> ```