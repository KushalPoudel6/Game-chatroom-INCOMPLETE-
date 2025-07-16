from websockets.asyncio.server import broadcast
import json

HOST_INDEX = 0

class ChopstickPlayer:
    def __init__(self):
        self.left = 1
        self.right = 1
        self.eliminated = False

    def get_hand(self, hand):
        if hand:
            return self.right
        return self.left
    
    def set_hand(self, hand, value):
        if hand:
            self.right = value
            return
        self.left = value

def start(l):
    l.game_info = [ChopstickPlayer() for _ in l.players]
    l.turn = 0
    resp = json.dumps({
        "type":         "start_chopsticks",
        "game_info":    serialize_game_info(l.game_info),
        "turn":         0,
    })
    broadcast(l.connected, resp) 


async def run(l, player_index):
    print(str(player_index) + " has run", flush=True)
    async for json_string in l.connected[player_index]:
        msg = json.loads(json_string)
        print("CT Message: ", end=" ", flush=True)
        print(msg, flush=True)
        if msg["type"] == "chopsticks_move":
            move = msg["move"]  # {"type": "hit"/"transfer", ...}

            failed_resp = json.dumps({
                "type":      "start_chopsticks",
                "game_info": serialize_game_info(l.game_info),
                "turn":      msg["turn"],
                "event":     "redo_turn",
            })
            if msg["turn"] != l.turn:
                await l.connected[player_index].send(failed_resp)
                continue
            # Hitting:
            if move["type"] == "hit":
                try:
                    target_index = move["target"]
                    target_hand = move["target_hand"]
                    source_hand = move["source_hand"]

                    source_val = l.game_info[player_index].get_hand(source_hand)
                    target_val = l.game_info[target_index].get_hand(target_hand)

                    # validate hands
                    if not (1 <= source_val <= 4 and 1 <= target_val <= 4):
                        broadcast(l.connected, failed_resp)
                        continue
                    if (source_val + target_val) > 4:
                        result = 0
                    else:
                        result = (source_val + target_val) % 5
                    l.game_info[target_index].set_hand(target_hand, result)

                except (KeyError, IndexError):
                    broadcast(l.connected, failed_resp)
                    continue

            # Transfering
            elif move["type"] == "transfer":
                amount = move["amount"]
                direction = move["direction"]

                if valid_transfer(l.game_info[player_index].left, l.game_info[player_index].right, amount, direction):
                    if direction == "L->R":
                        l.game_info[player_index].left -= amount
                        l.game_info[player_index].right += amount
                    else:
                        l.game_info[player_index].left += amount
                        l.game_info[player_index].right -= amount
                else:
                    broadcast(l.connected, failed_resp)
                    continue

            # Elimination:
            for p in l.game_info:
                if p.left == 0 and p.right == 0:
                    p.eliminated = True

            alive_players = [i for i, p in enumerate(l.game_info) if not p.eliminated]

            # Game over check:
            if len(alive_players) == 1:
                winner_name = l.players[alive_players[0]].username
                resp = json.dumps({
                    "type":      "start_chopsticks",
                    "game_info": serialize_game_info(l.game_info),
                    "turn":      None,
                    "winner":    winner_name,
                    "event":     "game_over",
                })
                broadcast(l.connected, resp)
                return

            # Sucessfull move, continue game
            l.turn = (l.turn + 1) % len(l.connected)
            while l.game_info[l.turn].eliminated:
                l.turn = (l.turn + 1) % len(l.connected)
            resp = json.dumps({
                "type":      "start_chopsticks",
                "game_info": serialize_game_info(l.game_info),
                "turn":      l.turn,
                "event":     "valid",
            })
            broadcast(l.connected, resp)



def valid_transfer(left: int, right: int, amount: int, direction: str) -> bool:
    # Must be within valid hand range
    if not (0 <= left <= 4 and 0 <= right <= 4 and 0 < amount <= 4):
        return False

    if direction == "L->R":
        if left < amount:
            return False
        new_left = left - amount
        new_right = right + amount
    elif direction == "R->L":
        if right < amount:
            return False
        new_right = right - amount
        new_left = left + amount
    else:
        return False  

    # Must remain within valid hand range
    if new_left > 4 or new_right > 4:
        return False

    #cannot be the same as previous hand
    if new_right == left and new_left == right:
        return False
    # Must be a real change
    return (new_left, new_right) != (left, right)

def serialize_game_info(game_info):
    return [
        {
            "left": p.left,
            "right": p.right,
            "eliminated": p.eliminated,
        } for p in game_info
    ]