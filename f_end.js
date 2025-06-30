class Client{

    constructor(){
      this.username = ""
      this.socket = new WebSocket('ws://localhost:8080');
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        // Request the list of existing names from the server
        const msg = JSON.stringify({
          type: "begin"
        });
        this.sendMessage(msg);
      };
      this.socket.onmessage = (event) => {
        console.log('Message from server:', event.data);
        let a;
        try{
          a = JSON.parse(event.data);
          message_handler(a)
        }
        catch(err)
        {
          console.error("Failed to parse server message:", err.message);
        }
      };
  
      this.socket.onclose = () => {
        console.log('WebSocket connection closed');
      };
      this.socket.onerror = (error) => {
        console.log('WebSocket error:', error);
      };
  
    };
    
    sendMessage(message)
    {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(message);
        console.log('Sent message:', message);
      } else {
        console.log('WebSocket is not open');
      }
    }
}

function enter_screen()
{
    console.log('1')
    const items = document.getElementById('items'); //go to the specific div
    const div = document.createElement('div')
    div.id = "enter screen"
    const header = document.createElement("h2")
    header.id =  'discription'
    header.innerText = 'Enter name:'
    const user_input = document.createElement('input')
    user_input.id = "Username"
    user_input.placeholder = "Select a name"
    user_input.type = "text"
    console.log('2')

    div.appendChild(header)
    div.appendChild(user_input)
    items.appendChild(div)

    console.log('3')

    user_input.onchange = (event) => {
      const message = JSON.stringify({
        type: "unique name",
        data: event.target.value
      })
      client.sendMessage(message)
    }
    
    return
}

function enter_lobby()
{
  console.log("4")
  const items = document.getElementById('items'); //go to the specific div
  const div = document.createElement('div');
  div.id = "enter lobby";
  items.appendChild(div);
  //create a lobby button
  const create = document.createElement("button");
  create.id = "create lobby";
  create.innerText = "Create a lobby";
  div.appendChild(create)
  //join a lobby button
  const join = document.createElement("button");
  join.id = "join lobby";
  join.innerText = "Join a lobby with a lobby code";
  div.appendChild(join)
  create.onclick = () => {
    const msg = JSON.stringify({
      type: "create lobby",
      data: client.username
    })
    client.sendMessage(msg)
  }
  join.onclick = () => {
    const get_id = document.createElement("input");
    get_id.innerText = "Enter code"
    div.appendChild(get_id);
    
    get_id.onchange = (event) => {
      const msg = JSON.stringify({
        type: "joinable lobby",
        data: event.target.value,
        name: client.username
      });
      client.sendMessage(msg)

    }
    
  }

}

function game_lobby(code, list_of_names)
{
  const items = document.getElementById('items'); //go to the specific div
  const div = document.createElement('div');
  div.id = "game lobby";
  items.appendChild(div);
  addChatToLobby(code);
  const h1 = document.createElement("h1");
  h1.innerText = `${list_of_names[0]}'s Lobby`;
  const h2 = document.createElement("h2");
  h2.innerText = `Lobby code: ${code}`;
  div.appendChild(h1);
  div.appendChild(h2);
  for (let i = 0; i < list_of_names.length; i++)
  {
    let names = `${list_of_names[i]}`;
    if (i == 0)
    {
      names += " (Host) ";
    }
    if (list_of_names[i] == client.username)
    {
      names += " (Me)";
    }
    names += "\n";
    let display_name = document.createElement("p")
    display_name.innerText = names
    div.append(display_name)
  }
  //All the games you could possibly play are listed here, for now just chopsticks
  
  if (list_of_names[0] == client.username)
  {
    const start = document.createElement("button")
    start.innerText = "Begin chopsticks"
    div.appendChild(start)
    start.onclick = () =>{
      //send a message and the list and code of a started game
      const msg = JSON.stringify({
        type: "start chopsticks",
        data: code
      })
      client.sendMessage(msg)
    }
  }

}

function is_valid_transfer(l1, l2, r1, r2){
  let l = [l1,l2,r1,r2]
  for (let i = 0; i < 4; i++)
  {
    if (l[i] > 4 || l[i] < 0)
    {
      return false
    }
  }
  if (l1 == r2 || l2 == r1 || l1 + r1 != l2 + r2)
  {
    return false
  }
 return true
}

function updateGameState(info, turn) {
  const items = document.getElementById('items');
  items.innerHTML = "";  // Clear previous game state
  const d_hands = document.createElement('div');
  d_hands.id = "chopstick-hands";
  
  // Display the current player's turn
  let q = document.createElement('p');
  q.innerText = `${info[turn][0]}: L:${info[turn][1]}    R:${info[turn][2]}   (Currently this person's turn)`;
  d_hands.appendChild(q);
  
  // Show the updated hands of all players
  let p = document.createElement('p');
  for (let i = 0; i < info.length; i++) {
      if (i === turn) continue;  // Skip current turn player, already displayed
      p.innerText += `${info[i][0]}: L:${info[i][1]}    R:${info[i][2]}`;
      p.innerHTML += '<br>';
  }
  d_hands.appendChild(p);
  
  items.appendChild(d_hands);
  console.log("Updated game state for other player turns");
}


// Function for the player's turn to make a move
function playerTurnMove(info, turn) {
  const items = document.getElementById('items');
  items.innerHTML = "";  // Clear previous elements
  const d_moves = document.createElement('div');
  const d_hands = document.createElement('div');
  d_moves.id = 'd_moves';
  d_hands.id = "chopstick-hands";
  
  items.appendChild(d_moves);
  items.appendChild(d_hands);

  const total_players = info.length;
  const my_turn = info[turn][0] === client.username;

  if (my_turn) {
      // Creating buttons for making moves
      const hitR = document.createElement('button');
      const hitL = document.createElement('button');
      hitR.innerText = 'Hit with right';
      hitL.innerText = 'Hit with left';
      d_moves.appendChild(hitL);
      d_moves.appendChild(hitR);
      
      // Set up move actions for each hand
      const l1 = info[turn][1];
      const r1 = info[turn][2];
      const total_hand = l1 + r1;

      // Handling hit with right
      hitR.onclick = () => handleHitMove(info, turn, d_hands, true, total_players);

      // Handling hit with left
      hitL.onclick = () => handleHitMove(info, turn, d_hands, false, total_players);

      // Option for transferring hands if applicable
      if (total_hand != 1 && total_hand != 8) {
          const transfer = document.createElement('button');
          transfer.innerText = 'TRANSFER';
          d_moves.appendChild(transfer);
          
          transfer.onclick = () => {
              createTransferOptions(d_moves, l1, r1, turn);
          };
      }
  } else {
      updateGameState(info, turn);
  }
}

// Helper function to handle "Hit" moves based on selected hand
function handleHitMove(info, turn, d_hands, isRightHand, total_players) {
  d_hands.innerHTML = "";  // Clear previous hands display
  let m = document.createElement('p');
  m.innerText = `${info[turn][0]}: L:${info[turn][1]}    R:${info[turn][2]}   (Pick opponent's hand to hit)`;
  d_hands.appendChild(m);

  for (let i = 0; i < total_players; i++) {
      if (i === turn) continue;  // Skip current player
      
      let p = document.createElement('span');
      p.innerText = `${info[i][0]}: `;
      
      // Buttons for each opponent hand
      let b_L = document.createElement('button');
      let b_R = document.createElement('button');
      b_L.innerText = info[i][1];
      b_R.innerText = info[i][2];
      
      d_hands.appendChild(p);
      d_hands.appendChild(b_L);
      d_hands.appendChild(b_R);
      
      // On-click events for hitting left or right hand of opponent
      b_L.onclick = () => sendMoveMessage(isRightHand, false, turn, i);
      b_R.onclick = () => sendMoveMessage(isRightHand, true, turn, i);
  }
}

// Helper function to create transfer options for player turn
function createTransferOptions(d_moves, l1, r1, turn) {
  const d_transfer = document.createElement('div');
  d_transfer.id = "div-transfer";
  d_moves.appendChild(d_transfer);
  
  const inp = document.createElement("input");
  inp.id = "transfer-count";
  inp.type = "number";
  inp.max = 4;
  inp.min = 1;
  inp.value = 1;
  const LtoR = document.createElement("button");
  const RtoL = document.createElement("button");
  LtoR.innerText = "L --> R";
  RtoL.innerText = "L <-- R";
  
  d_transfer.appendChild(LtoR);
  d_transfer.appendChild(RtoL);
  d_transfer.appendChild(inp);
  
  LtoR.onclick = () => {
      let v = parseInt(inp.value);
      if (is_valid_transfer(l1, l1 - v, r1, r1 + v)) {
          const message = JSON.stringify({
              type: "transfer",
              turn: turn,
              new_h: [l1 - v, r1 + v]
          });
          client.sendMessage(message);
          d_moves.innerHTML = "";
      } else {
          window.alert('Invalid transfer!');
      }
  };
  
  RtoL.onclick = () => {
      let v = parseInt(inp.value);
      if (is_valid_transfer(l1, l1 + v, r1, r1 - v)) {
          const message = JSON.stringify({
              type: "transfer",
              turn: turn,
              new_h: [l1 + v, r1 - v]
          });
          client.sendMessage(message);
          d_moves.innerHTML = "";
      } else {
          window.alert('Invalid transfer!');
      }
  };
}

function sendMoveMessage(from_h, to_h, hitter, op) {
  const msg = JSON.stringify({
      type: "hit",
      from_h: from_h,
      to_h: to_h,
      hitter: hitter,
      op: op
  });
  client.sendMessage(msg);
  document.getElementById("d_moves").innerHTML = "";  // Clear move options
}

function addChatToLobby(code) {
  const items = document.getElementById("items");

  const chatWrapper = document.createElement("div");
  chatWrapper.id = "chat-wrapper";
  chatWrapper.style.marginTop = "20px";
  chatWrapper.style.borderTop = "1px solid #aaa";
  chatWrapper.style.paddingTop = "10px";

  const chatBox = document.createElement("div");
  chatBox.id = "chat-box";
  chatBox.style.height = "150px";
  chatBox.style.overflowY = "scroll";
  chatBox.style.border = "1px solid #ccc";
  chatBox.style.padding = "5px";

  const chatInput = document.createElement("input");
  chatInput.type = "text";
  chatInput.placeholder = "Type a message...";
  chatInput.style.width = "80%";

  const chatSend = document.createElement("button");
  chatSend.innerText = "Send";

  chatSend.onclick = () => {
    const msg = chatInput.value.trim();
    if (msg.length > 0) {
      const data = JSON.stringify({
        type: "chat message",
        sender: client.username,
        text: msg,
        code: code
      });
      client.sendMessage(data);
      chatInput.value = "";
    }
  };

  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") chatSend.click();
  });

  chatWrapper.appendChild(chatBox);
  chatWrapper.appendChild(chatInput);
  chatWrapper.appendChild(chatSend);
  items.appendChild(chatWrapper);
}



function handleChatMessage(message) {
  console.log("called handle chat message")
  const chatBox = document.getElementById("chat-box");
  if (!chatBox) return;
  const msg = document.createElement("p");
  msg.innerText = `${message.sender}: ${message.text}`;
  console.log("created the message")
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}


function message_handler(message)//Message is an object with type, data (?)
{
    switch(message.type)
    {        
        case "enter screen":
          document.getElementById("items").innerHTML = ""
          enter_screen()
          break;
        case "check unique name":
          if (message.data)
          {
            document.getElementById("enter screen").innerHTML = ''
            client.username = message.name;
            enter_lobby();
          }
          else{
            window.alert('Name has already been taken!')
          }
          break;
        case "check joinable lobby":
          if (message.data)
            {
              document.getElementById("enter lobby").innerHTML = '' 
              game_lobby(message.code, message.players)
            }
            else{
              var h = document.createElement("h3");
              h.innerText = "Error! This lobby does not exist.";
              document.getElementById("enter lobby").appendChild(h);
            }
          break;
        case "lobby initialized":
            document.getElementById("items").innerHTML = ' ' ;
            game_lobby(message.code, message.players);
          break;
        case "update lobby":
          document.getElementById("items").innerHTML = ' ';
          game_lobby(message.code, message.players);
          break;
        case "your chop turn":
          playerTurnMove(message.info, message.turn)
          break;
        case "update chop lobby":
          updateGameState(message.info, message.turn)
          break;
        case "chat message":
          handleChatMessage(message)
          break;
        default:
          print("ah hell nahh");
    }
}

const client = new Client() 
