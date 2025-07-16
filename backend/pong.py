import asyncio
from websockets.asyncio.server import broadcast
import json

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

# Only call this once, when lobby host starts the game
def start(l):
    l.game = Pong()
    asyncio.ensure_future(update(l))

async def run(l, player_index):
    # NOTE: In the future we might want select_message instead
    async for json_string in l.connected[player_index]:
        msg = json.loads(json_string)
        if msg["type"] == "pong_move":
            index = msg["player_index"]
            if msg["action"] == "up":
                l.game.player_vel_y[index] = 1.0
            elif msg["action"] == "down":
                l.game.player_vel_y[index] = -1.0
            else:
                l.game.player_vel_y[index] = 0

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
            print("player1 point", flush=True)
            # TODO
            l.game.reset(1)
        elif ball_left <= -1.0:
            print("player2 point", flush=True)
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
