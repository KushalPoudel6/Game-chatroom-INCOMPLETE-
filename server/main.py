import asyncio
from websockets.asyncio.server import broadcast, serve
import json
import secrets

HOST_INDEX = 0
LOBBIES = {}

class Player:
    def __init__(self, socket, username):
        self.socket = socket
        self.username = username

class Lobby:
    def __init__(self, code, host_socket, host_username):
        self.code = code
        self.connected = [host_socket]
        self.players = [host_username]

async def lobby(l, player_index):
    async for json_string in l.connected[player_index]:
        print("Received request:")
        print(json_string)
        req = json.loads(json_string)
        if req["type"] == "chat":
            broadcast(l.connected, json_string)
        elif req["type"] == "start_game" and player_index == HOST_INDEX:
            broadcast(l.connected, json_string)

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
    player_index = len(l.connected)
    l.connected.append(socket)
    l.players.append(username)
    resp = json.dumps({
        "type":     "join_success",
        "code":     code,
        "username": username,
        "players":  l.players,
    })
    await socket.send(resp)
    await lobby(l, player_index)

async def route(socket):
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
    async with serve(route, "localhost", 8080) as server:
        await server.serve_forever()

if __name__ == "__main__":
    asyncio.run(main())
