
list_of_players = ['bob', 'joe', 'yak']

players = {}
#Player dictionary of lists, using user ID, 
#player['ch'] = [3, 4, 0, False]  - > [hand1, hand2, order to play, Eliminated]

#initializing the players
#players will look something like: {'bob': [1, 1, 0, False], 'joe': [1, 1, 1, False]}
for x in range(len(list_of_players)):
    players[list_of_players[x]] = [1, 1, x, False]



#hit someone's hand, transfer

def hit(players, opp_id, to_hand, hitting_power):
    players[opp_id][to_hand] += hitting_power
    if players[opp_id][to_hand] > 4:
        players[opp_id][to_hand] = 0
    if players[opp_id][0] == 0 and players[opp_id][1] == 0:
        players[opp_id][3] = True
    return

def transfer(players: dict, player_id: str, new_hand: tuple):
    players[player_id][0] = new_hand[0]
    players[player_id][1] = new_hand[1]
    return

def play_turn(players, player_id):
    user_Choice = 0
    #get what the user wants between hitting or transfering
    user_Choice = int(input(f"{player_id}, do you want to (0) hit or (1) transfer? "))
    mc = players[player_id]
    if user_Choice == 0: #hitting
        #which player to hit?
        opp_id = input(f"{player_id}, Which player do you want to hit? ")
        from_hand = int(input('Which hand do you wanna hit with? 0 for left, 1 for right'))
        to_hand = int(input('Which hand do you wanna hit? 0 for left, 1 for right'))
        hit(players, opp_id, to_hand, mc[from_hand])
    elif user_Choice == 1:
        complete = False
        while not complete:
            left_hand = int(input(f"Enter new count for left hand: "))
            right_hand = int(input(f"Enter new count for right hand: "))
            if valid_transfer(mc[0], mc[1], left_hand, right_hand):
                transfer(players, player_id, (left_hand, right_hand))
                complete = True
            else:
                print('This is not a valid transfer bozo')
    return

def valid_transfer(left_1, right_1, left_2, right_2) ->bool:
    impossible = False
    for i in (left_1, left_2, right_1, right_2):
        if i > 4 or i < 0:
            return False


    if (left_1, right_1) == (left_2, right_2) or (right_1, left_1) == (left_2, right_2) or not left_1 + right_1 == left_2 + right_2:
        return False
    else:
        return True

    
def play_game(players):
    persons_turn = 0 #the 0'th persons turn
    game_over = False
    people_eliminated = 0
    while not game_over:
        name = list_of_players[persons_turn] #name/id of person whose turn it is
        if not players[name][3]: #if they are not dead
            play_turn(players, name)
        
        persons_turn += 1
        #print(persons_turn)
        print(len(list_of_players))
        if persons_turn >= len(list_of_players):
            persons_turn = 0

        if people_eliminated >= len(list_of_players) - 1:
            game_over = True
            


print(players)
play_game(players)

# Test cases to check the validity of transfers
print(valid_transfer(3, 2, 4, 1))  # Should return True
print(valid_transfer(1, 1, 2, 0))  # Should return True
print(valid_transfer(1, 3, 0, 4))  # Should return True 
print(valid_transfer(1, 3, 4, 0))  # Should return True

print(valid_transfer(3, 2, 3, 2))  # Should return False 
print(valid_transfer(3, 2, 5, 0))  # Should return False 
print(valid_transfer(3, 2, 2, 2))  # Should return False 