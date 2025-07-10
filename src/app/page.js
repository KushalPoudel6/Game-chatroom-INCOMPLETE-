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
				clientRef.current.playerIndex = msg.players.length - 1;
				setChatMessages(["[SYSTEM] You just joined the lobby."]);
				setStatus(Status.LOBBY);
				return;
			case "player_joined":
				console.log("player_joined");
				setPlayers(players => [...players, msg.username]);
				clientRef.current.playerIndex = 0;
				return;
			case "chat":
				setChatMessages(chatMessages => [...chatMessages, msg.content]);
				return;
			case "start_game":
				setStatus(Status.GAME);
				return;
			case "game_tick":
				clientRef.current.y1 = msg.player1_y;
				clientRef.current.y2 = msg.player2_y;
				clientRef.current.ballX = msg.ball_x;
				clientRef.current.ballY = msg.ball_y;
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
	case Status.GAME:
		return <Game clientRef={clientRef} />;
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

function Game({ clientRef }) {
	let gl = useRef(null);
	useEffect(() => {
		const canvas = document.querySelector("#gl-canvas");
		gl = canvas.getContext("webgl");

		document.onkeydown = (event) => {
			if (event.repeat) {
				return;
			}
			switch (event.key) {
			case "w":
				clientRef.current.socket.send(JSON.stringify({
					type:			"pong_move",
					player_index:	clientRef.current.playerIndex,
					action:			"up",
				}));
				return;
			case "s":
				clientRef.current.socket.send(JSON.stringify({
					type:			"pong_move",
					player_index:	clientRef.current.playerIndex,
					action:			"down",
				}));
				return;
			}
		};

		document.onkeyup = (event) => {
			switch (event.key) {
			case "w":
			case "s":
				clientRef.current.socket.send(JSON.stringify({
					type:			"pong_move",
					player_index:	clientRef.current.playerIndex,
					action:			"stop",
				}));
				return;
			}
		};

		const vertSource = `
			attribute vec2 vertPosition;
			uniform vec2 translation;
			uniform vec2 scale;
			void main() {
				gl_Position = vec4(scale * vertPosition + translation, 0.0, 1.0);
			}
		`;

		const fragSource = `
			void main() {
				gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
			}
		`;

		const vertShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertShader, vertSource);
		gl.compileShader(vertShader);

		const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragShader, fragSource);
		gl.compileShader(fragShader);

		const program = gl.createProgram();
		gl.attachShader(program, vertShader);
		gl.attachShader(program, fragShader);
		gl.linkProgram(program);

		const vb = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vb);
		const positions = [0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

		const location = gl.getAttribLocation(program, "vertPosition");
		gl.vertexAttribPointer(
			location,
			2,
			gl.FLOAT,
			false,
			0,
			0,
		);
		gl.enableVertexAttribArray(location);
		
		gl.useProgram(program);

		gl.clearColor(0.0, 0.0, 0.0, 1.0);

		let prevTime = 0;
		const translationLocation = gl.getUniformLocation(program, "translation");
		const scaleLocation = gl.getUniformLocation(program, "scale");
		function drawScene(currentTimeMs) {
			// NOTE: will probably make use of deltaTime in the future
			/*
			let currentTime = currentTimeMs * 0.001;
			let deltaTime = currentTime - prevTime;
			prevTime = currentTime;
			*/

			const y1 = clientRef.current.y1;
			const y2 = clientRef.current.y2;
			const ballX = clientRef.current.ballX;
			const ballY = clientRef.current.ballY;
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.uniform2f(scaleLocation, 0.04, 0.6);
			gl.uniform2f(translationLocation, -0.9, y1);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.uniform2f(translationLocation, 0.9, y2);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.uniform2f(scaleLocation, 0.06, 0.06);
			gl.uniform2f(translationLocation, ballX, ballY);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

			requestAnimationFrame(drawScene);
		}
		requestAnimationFrame(drawScene);
	}, []);
	return (
		<div>
			<canvas id="gl-canvas" width="640" height="480"></canvas>
		</div>
	);
}
