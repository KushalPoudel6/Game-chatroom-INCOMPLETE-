"use client"
import { useState, useEffect, useRef } from "react";
import { Pong } from "./pong.js";
import { Chopsticks } from "./chopsticks.js";

const Status = Object.freeze({
	START:				0,
	CREATE:				1,
	JOIN:				2,
	LOBBY:				3,
	GAME_PONG:			4,
	GAME_CHOPSTICKS:	5,
});

export default function Home() {
	const clientRef = useRef({
		socket:	new WebSocket("ws://localhost:8080"),
		playerIndex:	0,
		y1:				0.0,
		y2:				0.0,
		ballX:			0.0,
		ballY:			0.0,
	});
	useEffect(() => {
		return () => {
			clientRef.current.socket.close();
		};
	}, []);
	return (
		<>
			<h1>My web application</h1>
			<main>
				<MainContent clientRef={clientRef} />
			</main>
		</>
	);
}

function MainContent({ clientRef }) {
	const [status, setStatus] = useState(Status.START);
	const [login, setLogin] = useState({ code: null, username: null });
	const [players, setPlayers] = useState(null);
	const [chatMessages, setChatMessages] = useState(null);
	const [chopsticks, setChopsticks] = useState(null);

	useEffect(() => {
		clientRef.current.socket.onmessage = (event) => {
			let msg = JSON.parse(event.data);
			console.log("Message recieved: ", msg);
			switch (msg.type) {
			case "create_success":
				setLogin({
					code:		msg.code,
					username:	msg.username,
				});
				setPlayers([msg.username]);
				clientRef.current.playerIndex = 0;
				setChatMessages(["[SYSTEM] You just created a lobby."]);
				setStatus(Status.LOBBY);
				return;
			case "join_success":
				setLogin({
					code:		msg.code,
					username:	msg.username,
				});
				setPlayers(msg.players);
				clientRef.current.playerIndex = msg.players.length - 1;
				setChatMessages(["[SYSTEM] You just joined the lobby."]);
				setStatus(Status.LOBBY);
				return;
			case "unknown_code":
				// TODO: display an error
				return;
			case "name_taken":
				// TODO: display an error
				return;
			case "player_joined":
				setPlayers(players => [...players, msg.username]);
				return;
			case "player_left":
				if (clientRef.current.playerIndex > (players => players.indexOf(msg.username))) {
					--clientRef.current.playerIndex;
				}
				setPlayers(players => players.filter((username) => username === msg.username));

				return;
			case "chat":
				setChatMessages(chatMessages => [...chatMessages, msg.content]);
				return;
			case "start_game":
				setStatus(Status.GAME_PONG);
				return;
			case "start_chopsticks":
				setChopsticks({
					game_info: msg.game_info,
            		turn:      msg.turn,
            		event:     msg.event || null,
            		winner:    msg.winner || null,
				});
				setStatus(Status.GAME_CHOPSTICKS);
				return;
			case "chopsticks_move":
				setChopsticks({
            		game_info: msg.game_info,
            		turn:      msg.turn,
            		event:     msg.event,
            		winner:    msg.winner || null,
          		});
          	return;
			}
		};
	}, []);
	switch (status) {
	case Status.START:
		return (
			<div>
				<button onClick={() => setStatus(Status.CREATE)}>Create a lobby</button>
				<button onClick={() => setStatus(Status.JOIN)}>Join a lobby</button>
			</div>
		);
	case Status.CREATE:
		return <Create clientRef={clientRef} setStatus={setStatus} />;
	case Status.JOIN:
		return <Join clientRef={clientRef} setStatus={setStatus} />;
	case Status.LOBBY:
		return <Lobby clientRef={clientRef} login={login} players={players} chatMessages={chatMessages} />;
	case Status.GAME_PONG:
		return <Pong clientRef={clientRef} />;
	case Status.GAME_CHOPSTICKS:
		return <Chopsticks clientRef={clientRef} chopsticks={chopsticks} players={players} />;
	}
}

function Create({ clientRef }) {
	function createLobby(username) {
		let req = {
			type:		"create",
			username:	username,
		};
		clientRef.current.socket.send(JSON.stringify(req));
	}
	return (
		<div>
			<form action={(formData) => createLobby(formData.get("username"))}>
				<input type="text" name="username" placeholder="Enter a name" />
			</form>
		</div>
	);
}

function Join({ clientRef }) {
	function joinLobby(code, username) {
		let req = {
			type:		"join",
			code:		code,
			username:	username,
		};
		clientRef.current.socket.send(JSON.stringify(req));
	}
	return (
		<div>
			<form action={(formData) => joinLobby(formData.get("code"), formData.get("username"))}>
				<input type="text" name="code" placeholder="Enter lobby code" />
				<input type="text" name="username" placeholder="Enter a name" />
				<input type="submit" value="Go" />
			</form>
		</div>
	);
}

function Lobby({ clientRef, login, players, chatMessages }) {
	function sendChatMessage(message) {
		if (message === "") {
			return;
		}
		let msg = {
			type:		"chat",
			content:	"[" + login.username + "] " + message,
		};
		clientRef.current.socket.send(JSON.stringify(msg));
	}
	function startGame() {
		let msg = {
			type:	"start_game",
		};
		clientRef.current.socket.send(JSON.stringify(msg));
	}
	function startChopsticks() {
		let msg = {
			type:	"start_chopsticks",
		};
		clientRef.current.socket.send(JSON.stringify(msg));
	}
	let isHost = login.username === players[0];
	return (
		<div>
			{isHost && <button onClick={() => startGame()}>START GAME</button>}
			{isHost && <button onClick={() => startChopsticks()}>START CHOPSTICKS</button>}
			<h2>In lobby. Code is: {login.code}</h2>
			<h2>Your username is: {login.username}</h2>
			<h2>Players in the lobby:</h2>
			<ol>
				{players.map((username, index) => (<li key={index} ord={index + 1} type="I">{username}</li>))}
			</ol>
			<h2>Chat</h2>
			<ol>
				{chatMessages.map((message, index) => (<li key={index} ord={index + 1} type="I">{message}</li>))}
			</ol>
			<form action={(formData) => sendChatMessage(formData.get("message"))}>
				<input type="text" name="message" placeholder="Enter chat message" />
			</form>
		</div>
	);
}
