const canvas = document.getElementById('physarumCanvas');
const gl = canvas.getContext('webgl');
// Set viewport size to match canvas size

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
console.log(canvas.width);
gl.viewport(0, 0, canvas.width, canvas.height);

// Initialize framebuffers and attach textures for ping-pong effect
const framebuffers = [];
const textures = [];

function createFramebufferAndTexture() {
  // Create a texture for the framebuffer
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Create and bind framebuffer
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  // Check if framebuffer is complete
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    console.error('Framebuffer not complete');
  }

  // Unbind framebuffer and return both framebuffer and texture
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { framebuffer, texture };
}

// Initialize framebuffers and textures for ping-ponging
for (let i = 0; i < 2; i++) {
  const { framebuffer, texture } = createFramebufferAndTexture();
  framebuffers.push(framebuffer);
  textures.push(texture);
}

// Vertex and fragment shaders
const vsSource = `
  attribute vec4 aVertexPosition;
  void main(void) {
    gl_Position = aVertexPosition;
  }
`;

// const fsSource = `
//   precision mediump float;

//   uniform vec2 u_resolution;
//   uniform sampler2D u_prevFrame;
//   uniform vec2 u_agents[500];

//   const float decayRate = 0.98;

//   void main(void) {
//     vec2 st = gl_FragCoord.xy / u_resolution;
//     vec3 color = texture2D(u_prevFrame, st).rgb * decayRate;

//     for (int i = 0; i < 500; i++) {
//       float dist = length(st - u_agents[i]);
//       color += vec3(exp(-dist * 30.0));  // High intensity for testing
//     }

//     gl_FragColor = vec4(color, 1.0);
//   }
// `;

// const fsSource = `
//   precision mediump float;

//   uniform vec2 u_resolution;
//   uniform vec2 u_agents[500];

//   void main(void) {
//     vec2 st = gl_FragCoord.xy / u_resolution;
//     vec3 color = vec3(0.0);

//     // Adjust point size by increasing the multiplier in exp()
//     for (int i = 0; i < 500; i++) {
//       float dist = length(st - u_agents[i]);
//       color += vec3(exp(-dist * 300.0));  // Higher multiplier = smaller points
//     }

//     gl_FragColor = vec4(color, 1.0);
//   }
// `;

const fsSource = `
  precision mediump float;

  uniform vec2 u_resolution;
  uniform sampler2D u_prevFrame;
  uniform vec2 u_agents[500];

  const float decayRate = 0.99; // Slight decay to allow trails to fade gradually
  const float trailIntensity = 0.4; // Boost intensity of trails for visibility

  void main(void) {
    vec2 st = gl_FragCoord.xy / u_resolution;
    float aspectRatio = u_resolution.x / u_resolution.y;

    // Get color from the previous frame and apply decay
    vec3 color = texture2D(u_prevFrame, st).rgb * decayRate;

    // Add trails from current agent positions
    for (int i = 0; i < 500; i++) {
      vec2 adjustedAgentPos = vec2(u_agents[i].x * aspectRatio, u_agents[i].y);
      float dist = length(st - adjustedAgentPos);
      color += vec3(exp(-dist * 200.0) * trailIntensity); // Adjust spread and intensity for trails
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;







// Initialize WebGL program and shaders
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error("Unable to initialize shader program:", gl.getProgramInfoLog(shaderProgram));
    return null;
  }
  return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("An error occurred compiling the shaders:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
const programInfo = {
  program: shaderProgram,
  attribLocations: {
    vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
  },
  uniformLocations: {
    resolution: gl.getUniformLocation(shaderProgram, 'u_resolution'),
    prevFrame: gl.getUniformLocation(shaderProgram, 'u_prevFrame'),
    agents: gl.getUniformLocation(shaderProgram, 'u_agents'),
  },
};

// Set up position buffer
const positions = new Float32Array([
  -1.0, -1.0,
   1.0, -1.0,
  -1.0,  1.0,
   1.0,  1.0,
]);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

// Initialize agents
const numAgents = 500;
const agents = Array.from({ length: numAgents }, () => ({
  position: [Math.random(), Math.random()],
  angle: Math.random() * Math.PI * 2,
}));

function updateAgents() {
    const turnAngle = 0.05; // Small turning angle for smooth, slower turns
    const speed = 0.001;    // Reduced speed for slower movement
  
    agents.forEach(agent => {
      // Randomly adjust the agent's angle slightly
      agent.angle += (Math.random() - 0.5) * turnAngle;
  
      // Update position based on the new angle and reduced speed
      agent.position[0] += Math.cos(agent.angle) * speed;
      agent.position[1] += Math.sin(agent.angle) * speed;
  
      // Wrap around if the agent goes out of bounds
      agent.position[0] = (agent.position[0] + 1) % 1;
      agent.position[1] = (agent.position[1] + 1) % 1;
    });
  }
  
  

// Render loop
let currentFramebuffer = 0;

// function drawScene() {
//   updateAgents();

//   // Clear the framebuffer to black to start with a dark background
//   gl.clearColor(0.0, 0.0, 0.0, 1.0);
//   gl.clear(gl.COLOR_BUFFER_BIT);

//   gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[currentFramebuffer]);
//   gl.viewport(0, 0, canvas.width, canvas.height);

//   gl.useProgram(programInfo.program);

//   gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
//   gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
//   gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

//   gl.uniform2f(programInfo.uniformLocations.resolution, gl.canvas.width, gl.canvas.height);

//   gl.activeTexture(gl.TEXTURE0);
//   gl.bindTexture(gl.TEXTURE_2D, textures[1 - currentFramebuffer]);
//   gl.uniform1i(programInfo.uniformLocations.prevFrame, 0);

//   // Pass each agent position as a uniform
//   agents.forEach((agent, i) => {
//     gl.uniform2f(gl.getUniformLocation(programInfo.program, `u_agents[${i}]`), agent.position[0], agent.position[1]);
//   });

//   gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
//   gl.bindFramebuffer(gl.FRAMEBUFFER, null);

//   gl.bindTexture(gl.TEXTURE_2D, textures[currentFramebuffer]);
//   currentFramebuffer = 1 - currentFramebuffer;

//   requestAnimationFrame(drawScene);
// }

function drawScene() {
    updateAgents();
  
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  
    gl.useProgram(programInfo.program);
  
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  
    gl.uniform2f(programInfo.uniformLocations.resolution, gl.canvas.width, gl.canvas.height);
  
    // Pass a dummy texture to the shader (not actually using the framebuffer)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[0]);
    gl.uniform1i(programInfo.uniformLocations.prevFrame, 0);
  
    // Pass each agent position as a uniform
    agents.forEach((agent, i) => {
      gl.uniform2f(gl.getUniformLocation(programInfo.program, `u_agents[${i}]`), agent.position[0], agent.position[1]);
    });
  
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  
    requestAnimationFrame(drawScene);
  }
  function resizeCanvas() {
    // Set the internal resolution to match the window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Set CSS to match window size (for display purposes)
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    // Update the WebGL viewport to match the canvas size
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Update resolution uniform
    gl.useProgram(programInfo.program);
    gl.uniform2f(programInfo.uniformLocations.resolution, canvas.width, canvas.height);
}

  
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas(); // Initial call to set the correct size
  
requestAnimationFrame(drawScene);
