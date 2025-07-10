function Game() {
	let gl = useRef(null);
	useEffect(() => {
		const canvas = document.querySelector("#gl-canvas");
		gl = canvas.getContext("webgl");

		const vertSource = `
			attribute vec2 vertPosition;
			void main() {
				gl_Position = vec4(0.5 * vertPosition, 0.0, 1.0);
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
		const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];
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

		gl.clearColor(0.0, 1.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}, []);
	return (
		<div>
			<canvas id="gl-canvas" width="640" height="480"></canvas>
		</div>
	);
}
