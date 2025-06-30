
import asyncio
import websockets
import json
import uuid
from collections import defaultdict

list_of_clients = []
list_of_names = []
list_of_lobbies = {}
game_moves = {}

"""
    Closes all sockets in a lobby
"""
async def cleanup_lobby(code):
    if code in list_of_lobbies:
        for ws in list_of_lobbies[code][1]:
            if ws.open:
                await ws.close()
        del list_of_lobbies[code]
    if code in game_moves:
        del game_moves[code]

"""
    Casts a message to all sockets in a list
"""
async def multicast(sockets: list, message):
    for socket in sockets:
        if socket.open:
            try:
                await socket.send(message)
            except websockets.exceptions.ConnectionClosed:
                print(f"Failed to send to socket: {socket}")
                continue

"""
flow
"""
async def play_chopsticks(code):
    info = []
    eliminated = []
    turn = 0
    size = len(list_of_lobbies[code][0])
    lobby = list_of_lobbies[code][1]

    for i in range(size):
        info.append([list_of_lobbies[code][0][i], 1, 1, i, False])
    
    while (len(eliminated) < size - 1):
        if turn in eliminated:
            turn = (turn + 1) % size
            continue

        try:
            """# Send game state update to all players
            update_message = json.dumps({
                "type": "update chop lobby",
                "info": info,
                "turn": turn
            })
            await multicast(lobby, update_message)
            """
            # Send turn notification to current player
            turn_message = json.dumps({
                "type": "your chop turn",
                "info": info,
                "turn": turn
            })
            
            if lobby[turn].open:
                await lobby[turn].send(turn_message)
            else:
                print(f"Player {turn}'s socket is closed — ending game.")
                # Tell the opponent
                other = (turn + 1) % size
                if lobby[other].open:
                    await lobby[other].send(json.dumps({
                        "type": "opponent disconnected",
                        "turn": turn
                    }))
                # Clean up
                await cleanup_lobby(code)
                return    

            # Wait for player's move
            try:
                move_msg = await asyncio.wait_for(game_moves[code].get(), timeout=300.0)
                print(f"Received move from player {turn}: {move_msg}")  # Debug log

                # Process the move
                if move_msg['type'] == 'hit':
                    from_h = move_msg["from_h"]
                    to_h = move_msg["to_h"]
                    opp = move_msg["op"]
                    
                    # Calculate damage
                    damage = info[turn][2] if from_h else info[turn][1]
                    
                    # Apply damage
                    if to_h:  # right hand
                        new_value = info[opp][2] + damage
                        info[opp][2] = 0 if new_value > 4 else new_value
                    else:  # left hand
                        new_value = info[opp][1] + damage
                        info[opp][1] = 0 if new_value > 4 else new_value
                
                elif move_msg['type'] == 'transfer':
                    new_hands = move_msg['new_h']
                    info[turn][1] = new_hands[0]
                    info[turn][2] = new_hands[1]

                print(f"Move processed successfully. New game state: {info}")  # Debug log

                # Check for eliminations after the move
                for k in range(size):
                    if info[k][1] == 0 and info[k][2] == 0 and not info[k][4]:
                        info[k][4] = True
                        eliminated.append(k)
                        print(f"Player {k} eliminated")  # Debug log

                # Move to next turn
                turn = (turn + 1) % size

                # Send immediate state update after move
                post_move_update = json.dumps({
                    "type": "update chop lobby",
                    "info": info,
                    "turn": turn
                })
                await multicast(lobby, post_move_update)

            except asyncio.TimeoutError:
                print(f"Timeout waiting for move from player {turn}")
                continue
            except Exception as e:
                print(f"Error processing move: {e}")
                continue

        except websockets.exceptions.ConnectionClosed as e:
            print(f"Connection closed during game: {e}")
            return
        except Exception as e:
            print(f"Unexpected error during game: {e}")
            return

async def handle_game_messages(websocket, code, is_host=False):
    if code not in game_moves:
        create_game_queue(code)
    
    try:
        async for message in websocket:
            try:
                info = json.loads(message)
                print(f"Game message received: {info}")  # Debug log

                if info['type'] == 'start chopsticks':
                    if is_host:
                        print('Starting chopsticks game for code:', code)
                        await play_chopsticks(code)
                elif info['type'] in ['hit', 'transfer']:
                    print(f"Queueing move for game {code}: {info}")  # Debug log
                    await game_moves[code].put(info)
                    print("Move queued successfully")  # Debug log
                elif info['type'] == 'chat message':
                    await multicast(
                        list_of_lobbies[code][1],
                        json.dumps(info)
                    )
                    print(f"Relayed chat in lobby {code}: {info['sender']}: {info['text']}")
            except json.JSONDecodeError as e:
                print(f"Invalid game message received: {e}")
            except Exception as e:
                print(f"Error handling game message: {e}")
    except websockets.exceptions.ConnectionClosed:
        print(f"Connection closed for {'host' if is_host else 'player'} in lobby {code}")
    except Exception as e:
        print(f"Unexpected error in game messages handler: {e}")

def create_game_queue(code):
    if code not in game_moves:
        game_moves[code] = asyncio.Queue()

async def echo(websocket):
    try:
        async for message in websocket:
            try:
                info = json.loads(message)
                print(f"Received message: {info}")  # Debug log

                match info['type']:
                    case 'begin':
                        await websocket.send(json.dumps({"type": "enter screen"}))
                    
                    case 'unique name':
                        if info['data'] in list_of_names:
                            await websocket.send(json.dumps({
                                "type": 'check unique name',
                                "data": False
                            }))
                        else:
                            list_of_names.append(info['data'])
                            await websocket.send(json.dumps({
                                "type": 'check unique name',
                                "data": True,
                                "name": info['data']
                            }))
                    
                    case 'joinable lobby':
                        if info['data'] in list_of_lobbies:
                            list_of_lobbies[info['data']][0].append(info['name'])
                            
                            # Update all players in lobby
                            await multicast(list_of_lobbies[info['data']][1], json.dumps({
                                "type": "update lobby",
                                "players": list_of_lobbies[info['data']][0],
                                "code": info['data']
                            }))

                            list_of_lobbies[info['data']][1].append(websocket)
                            
                            # Send confirmation to joining player
                            await websocket.send(json.dumps({
                                "type": 'check joinable lobby',
                                "data": True,
                                "code": info['data'],
                                "players": list_of_lobbies[info['data']][0]
                            }))
                            
                            await handle_game_messages(websocket, info['data'], is_host=False)
                            return
                        else:
                            await websocket.send(json.dumps({
                                "type": 'check joinable lobby',
                                "data": False
                            }))
                    
                    case 'create lobby':
                        room_code = str(uuid.uuid4())[:8]
                        list_of_lobbies[room_code] = [[info['data']], [websocket]]
                        create_game_queue(room_code)
                        
                        await websocket.send(json.dumps({
                            "type": "lobby initialized",
                            "code": room_code,
                            "players": list_of_lobbies[room_code][0]
                        }))
                        
                        await handle_game_messages(websocket, room_code, is_host=True)
                        return

            except json.JSONDecodeError as e:
                print(f"Invalid message format: {e}")
                continue
                
    except websockets.exceptions.ConnectionClosed:
        print("WebSocket connection closed")
    except Exception as e:
        print(f"Unexpected error in echo handler: {e}")

async def main():
    print("Starting server on localhost:8080...")
    async with websockets.serve(echo, "localhost", 8080):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())