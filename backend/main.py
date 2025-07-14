import asyncio
from websockets.asyncio.server import broadcast, serve
import json
import secrets
import pong

HOST_INDEX = 0
LOBBIES = {}

class Player:
    def __init__(self, username):
        self.username = username
        self.local_msg = None

class Lobby:
    def __init__(self, code, host_socket, host_username):
        self.code = code
        self.connected = [host_socket]
        self.players = [Player(host_username)]

    # Returns player_index
    def add_player(self, socket, username):
        self.connected.append(socket)
        self.players.append(Player(username))
        return len(self.connected) - 1

    def usernames(self):
        return [x.username for x in self.players]

# Select either a local message or a websocket message
async def select_message(l, player_index):
    while True:
        if l.players[player_index].local_msg != None:
            json_string = l.players[player_index].local_msg
            # Consume message
            l.players[player_index].local_msg = None
            return json_string
        try:
            # 1 millisecond timeout
            async with asyncio.timeout(0.001):
                return await l.connected[player_index].recv()
        except TimeoutError:
            pass

def local_broadcast(l, msg):
    for player in l.players:
        player.local_msg = msg

async def lobby(l, player_index):
    while True:
        json_string = await select_message(l, player_index)
        msg = json.loads(json_string)
        if msg["type"] == "chat":
            broadcast(l.connected, json_string)
        elif msg["type"] == "start_game" and player_index == HOST_INDEX:
            broadcast(l.connected, json_string)
            local_msg = json.dumps({ "type": "local_start_game" })
            local_broadcast(l, local_msg)
            pong.start(l)
        elif msg["type"] == "local_start_game":
            await pong.run(l, player_index)

async def create(socket, username):
    code = secrets.token_urlsafe(12)
    LOBBIES[code] = Lobby(code, socket, username)
    resp = json.dumps({
        "type":     "create_success",
        "code":     code,
        "username": username,
    })
    await socket.send(resp)
    await lobby(LOBBIES[code], HOST_INDEX)

async def join(code, socket, username):
    l = LOBBIES[code]
    # TODO: handle invalid code
    msg = json.dumps({
        "type":     "player_joined",
        "username": username,
    })
    broadcast(l.connected, msg)
    player_index = l.add_player(socket, username)
    resp = json.dumps({
        "type":     "join_success",
        "code":     code,
        "username": username,
        "players":  l.usernames(),
    })
    await socket.send(resp)
    await lobby(l, player_index)

async def route(socket):
    print("[Game server] A client has connected.", flush=True)
    async for json_string in socket:
        print("Received request:")
        print(json_string)
        # TODO: handle invalid json
        req = json.loads(json_string)
        match req["type"]:
            case "create":
                await create(socket, req["username"])
            case "join":
                await join(req["code"], socket, req["username"])

async def main():
    async with serve(route, "0.0.0.0", 8080) as server:
        await server.serve_forever()

if __name__ == "__main__":
    print("[Game server] Starting...", flush=True)
    asyncio.run(main())
