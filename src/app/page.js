"use client"
import { useState, useEffect, useRef } from "react";

const Status = Object.freeze({
	START:	0,
	CREATE:	1,
	JOIN:	2,
	LOBBY:	3,
	GAME:	4,
});

export default function Home() {
	const clientRef = useRef({
		socket:	new WebSocket("ws://localhost:8080"),
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
	useEffect(() => {
		clientRef.current.socket.onmessage = (event) => {
			let msg = JSON.parse(event.data);
			switch (msg.type) {
			case "create_success":
				setLogin({
					code:		msg.code,
					username:	msg.username,
				});
				setPlayers([msg.username]);
				setChatMessages(["[SYSTEM] You just created a lobby."]);
				setStatus(Status.LOBBY);
				return;
			case "join_success":
				setLogin({
					code:		msg.code,
					username:	msg.username,
				});
				setPlayers(msg.players);
				setChatMessages(["[SYSTEM] You just joined the lobby."]);
				setStatus(Status.LOBBY);
				return;
			case "player_joined":
				console.log("player_joined");
				setPlayers(players.concat([msg.username]));
				return;
			case "chat":
				setChatMessages(chatMessages.concat([msg.content]));
				return;
			case "start_game":
				setStatus(Status.GAME);
				break;
			}
		};
	}, [status, login, players, chatMessages]);
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
	case Status.GAME:
		return <Game />;
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
	let isHost = login.username === players[0];
	return (
		<div>
			{isHost && <button onClick={() => startGame()}>START GAME</button>}
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

function Game() {
	return (
		<div>
			<h1>Game has started!</h1>
		</div>
	);
}
