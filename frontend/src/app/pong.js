import { useEffect } from "react";

export function Pong({ clientRef }) {
	useEffect(() => {
		startPong(clientRef);
	}, []);
	return (
		<div>
			<canvas id="gl-canvas" width="640" height="480"></canvas>
		</div>
	);
}

function initServerMessages(clientRef) {
	clientRef.current.socket.addEventListener("message", (event) => {
		let msg = JSON.parse(event.data);
		if (msg.type != "game_tick") {
			return;
		}
		clientRef.current.y1 = msg.player1_y;
		clientRef.current.y2 = msg.player2_y;
		clientRef.current.ballX = msg.ball_x;
		clientRef.current.ballY = msg.ball_y;
	});
}

function startPong(clientRef) {
	initServerMessages(clientRef);

	const canvas = document.querySelector("#gl-canvas");
	const gl = canvas.getContext("webgl");

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
}
