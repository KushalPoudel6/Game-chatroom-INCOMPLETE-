import asyncio
from websockets.asyncio.server import broadcast, serve
from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError
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

    def local_broadcast(self, msg):
        for player in self.players:
            player.local_msg = msg

    # Returns player_index
    def add_player(self, socket, username):
        self.players.append(Player(username))
        msg = json.dumps({
            "type":     "player_joined",
            "username": username,
        })
        broadcast(self.connected, msg)
        player_index = len(self.connected)
        self.connected.append(socket)
        return player_index

    def remove_player(self, player_index):
        self.connected.pop(player_index)
        username = self.players.pop(player_index).username
        msg = json.dumps({
            "type":     "player_left",
            "username": username,
        })
        broadcast(self.connected, msg)
        msg = json.dumps({
            "type":         "local_player_left",
            "player_index": player_index,
        })
        self.local_broadcast(msg)

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

async def lobby(l, player_index):
    while True:
        try:
            json_string = await select_message(l, player_index)
        except (ConnectionClosedOK, ConnectionClosedError):
            print("[Game server] A client has disconnected (in lobby()).", flush=True)
            l.remove_player(player_index)
            return

        msg = json.loads(json_string)
        if msg["type"] == "local_player_left":
            if player_index > msg["player_index"]:
                player_index -= 1
        elif msg["type"] == "chat":
            broadcast(l.connected, json_string)
        elif msg["type"] == "start_game" and player_index == HOST_INDEX:
            broadcast(l.connected, json_string)
            local_msg = json.dumps({ "type": "local_start_game" })
            l.local_broadcast(local_msg)
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
    try:
        await socket.send(resp)
    except (ConnectionClosedOK, ConnectionClosedError):
        print("[Game server] A client has disconnected (in create()).", flush=True)
        del(LOBBIES[code])
        return
    await lobby(LOBBIES[code], HOST_INDEX)

# TODO: probably need a mutex
async def join(code, socket, username):
    try:
        l = LOBBIES[code]
    except KeyError:
        msg = json.dumps({ "type": "unknown_code" })
        try:
            await socket.send(msg)
        except (ConnectionClosedOK, ConnectionClosedError):
            print("[Game server] A client has disconnected (in join()).", flush=True)
        return
    if username in l.usernames():
        msg = json.dumps({ "type": "name_taken" })
        try:
            await socket.send(msg)
        except (ConnectionClosedOK, ConnectionClosedError):
            print("[Game server] A client has disconnected (in join()).", flush=True)
        return
    player_index = l.add_player(socket, username)
    resp = json.dumps({
        "type":     "join_success",
        "code":     code,
        "username": username,
        "players":  l.usernames(),
    })
    try:
        await socket.send(resp)
    except (ConnectionClosedOK, ConnectionClosedError):
        print("[Game server] A client has disconnected (in join()).", flush=True)
        l.remove_player(player_index)
        return
    await lobby(l, player_index)

async def route(socket):
    print("[Game server] A client has connected.", flush=True)
    try:
        async for json_string in socket:
            print("Received request:", flush=True)
            print(json_string, flush=True)
            # TODO: handle invalid json
            req = json.loads(json_string)
            match req["type"]:
                case "create":
                    await create(socket, req["username"])
                case "join":
                    await join(req["code"], socket, req["username"])
    except (ConnectionClosedOK, ConnectionClosedError):
        print("[Game server] A client has disconnected (in route()).", flush=True)

async def main():
    async with serve(route, "0.0.0.0", 8080) as server:
        await server.serve_forever()

if __name__ == "__main__":
    print("[Game server] Starting...", flush=True)
    asyncio.run(main())
