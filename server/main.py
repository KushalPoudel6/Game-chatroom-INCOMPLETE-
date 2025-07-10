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

class Pong:
    def reset(self, starter_index):
        self.ball_x = 0.0
        self.ball_y = 0.0
        if starter_index == 0:
            self.ball_vel_x = -1.0
        else:
            self.ball_vel_x = 1.0
        self.ball_vel_y = 0.0
        self.player_y = [0.0, 0.0]
        self.player_vel_y = [0.0, 0.0]

    def __init__(self):
        self.reset(0)

class AABB:
    def __init__(self, pos_x, pos_y, scale_x, scale_y):
        self.x = pos_x - scale_x / 2
        self.y = pos_y - scale_y / 2
        self.width = scale_x
        self.height = scale_y

def overlap(aabb1, aabb2):
    return aabb1.x < aabb2.x + aabb2.width and aabb1.x + aabb1.width > aabb2.x and \
            aabb1.y < aabb2.y + aabb2.height and aabb1.y + aabb1.height > aabb2.y

async def update(l):
    delta_time = 1 / 64
    while True:
        l.game.ball_x += l.game.ball_vel_x * delta_time
        l.game.ball_y += l.game.ball_vel_y * delta_time
        l.game.player_y[0] += l.game.player_vel_y[0] * delta_time
        l.game.player_y[1] += l.game.player_vel_y[1] * delta_time
        ball_scale = 0.06
        ball_top = l.game.ball_y + ball_scale / 2.0
        ball_bottom = l.game.ball_y - ball_scale / 2.0
        ball_right = l.game.ball_x + ball_scale / 2.0
        ball_left = l.game.ball_x - ball_scale / 2.0
        if ball_top >= 1.0 or ball_bottom <= -1.0:
            l.game.ball_vel_y *= -1.0

        influence = 0.5
        paddle_x_scale = 0.04
        paddle_y_scale = 0.6
        left_paddle_aabb = AABB(-0.9, l.game.player_y[0], paddle_x_scale, paddle_y_scale)
        ball_aabb = AABB(l.game.ball_x, l.game.ball_y, ball_scale, ball_scale)
        if overlap(left_paddle_aabb, ball_aabb):
            l.game.ball_vel_x *= -1.0
            l.game.ball_vel_y += l.game.player_vel_y[0] * influence

        right_paddle_aabb = AABB(0.9, l.game.player_y[1], paddle_x_scale, paddle_y_scale)
        if overlap(right_paddle_aabb, ball_aabb):
            l.game.ball_vel_x *= -1.0
            l.game.ball_vel_y += l.game.player_vel_y[1] * influence

        if ball_right >= 1.0:
            print("player1 point")
            # TODO
            l.game.reset(1)
        elif ball_left <= -1.0:
            print("player2 point")
            # TODO
            l.game.reset(0)

        msg = json.dumps({
            "type":         "game_tick",
            "player1_y":    l.game.player_y[0],
            "player2_y":    l.game.player_y[1],
            "ball_x":       l.game.ball_x,
            "ball_y":       l.game.ball_y,
        })
        broadcast(l.connected, msg)
        await asyncio.sleep(delta_time)

async def lobby(l, player_index):
    async for json_string in l.connected[player_index]:
        #print("Received message:")
        #print(json_string)
        msg = json.loads(json_string)
        if msg["type"] == "chat":
            broadcast(l.connected, json_string)
        elif msg["type"] == "start_game" and player_index == HOST_INDEX:
            l.game = Pong()
            asyncio.ensure_future(update(l))
            broadcast(l.connected, json_string)
        elif msg["type"] == "pong_move":
            index = msg["player_index"]
            if msg["action"] == "up":
                l.game.player_vel_y[index] = 1.0
            elif msg["action"] == "down":
                l.game.player_vel_y[index] = -1.0
            else:
                l.game.player_vel_y[index] = 0

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
