// Copy the entire code you shared into this file
'use strict';

var Sim = {
	viewAngle: 45.0,
	zNear: 0.01,
	zFar: 50.0,
	width: 0,
	height: 0,
	projectionMatrix: mat4(),
	time: 0.0,
	canvas: null,
	gl: null,
	mouse: { x: 0, y: 0, down: 0, vec: [0, 0, -1] },
	lastMouse: { x: 0, y: 0, down: 0, vec: [0, 0, -1] },
	recordFPS: console.log.bind(console),
	update: null,
	DEBUG: true,
};


Sim.checkGL = function checkGL(when) {
    if (!Sim.DEBUG) return;
    var gl = Sim.gl;
    function check(err) { if (gl[err] === e) estr = err; }
	for (var e = gl.getError(); e != gl.NO_ERROR; e = gl.getError()) {
		var estr = ""+e, possibleErrors = 'INVALID_ENUM INVALID_VALUE INVALID_OPERATION INVALID_FRAMEBUFFER_OPERATION OUT_OF_MEMORY STACK_UNDERFLOW STACK_OVERFLOW'.split(' ');
		possibleErrors.forEach(check);
		console.error("glGetError: "+estr+" during "+when);
	}
}

Sim.ShaderProgram = ShaderProgram;
function ShaderProgram(vertex, fragment, attribLocs) {
	this.vertexSource = vertex;
	this.fragmentSource = fragment;
	this.attribLocs = attribLocs;
	this.program = null;
	this.uniforms = {};
	this.attributes = {};
	if (!this.compile()) {
		throw Error("shader program compilation failed");
	}
}

ShaderProgram.prototype.destroy = function() {
	this.uniforms = {};
	this.attributes = {};
	if (this.program) {
		Sim.gl.deleteProgram(this.program);
		this.program = null;
	}
};

ShaderProgram.prototype.compile = function() {
	var gl = Sim.gl;
	function compileShader(src, typestr) {
		var shader = gl.createShader(gl[typestr]);
		gl.shaderSource(shader, src);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error("Failed to compile "+typestr+": "+gl.getShaderInfoLog(shader));
			throw Error("Shader compile failed");
		}
		return shader;
	}
	var fs = compileShader(this.fragmentSource, 'FRAGMENT_SHADER');
	var vs = compileShader(this.vertexSource, 'VERTEX_SHADER');

	var nextProgram = gl.createProgram();
	gl.attachShader(nextProgram, vs);
	gl.attachShader(nextProgram, fs);
	Sim.checkGL("compiled and attached shaders");

	if (this.attribLocs) {
		Object.keys(this.attribLocs).forEach(function(attrib) {
			var loc = this.attribLocs[attrib];
			gl.bindAttribLocation(nextProgram, loc, attrib);
		}.bind(this));
	}
	Sim.checkGL("bound attrib locs");

	gl.linkProgram(nextProgram);
	gl.deleteShader(vs);
	gl.deleteShader(fs);

	if (!gl.getProgramParameter(nextProgram, gl.LINK_STATUS)) {
		var log = gl.getProgramInfoLog(nextProgram);
		console.error("shader link failed: program info log:\n"+log);
		throw Error("shader link failed");
	}
	Sim.checkGL("linked");

	if (this.program) { gl.deleteProgram(this.program); this.program = null; }

	this.program = nextProgram;

	Sim.checkGL("compiled and validated");
	var uniforms = this.uniforms = {};
	var info, len = gl.getProgramParameter(nextProgram, gl.ACTIVE_UNIFORMS) || 0;
	for (var i = 0; i < len; ++i) {
		info = gl.getActiveUniform(nextProgram, i);
		if (info) { uniforms[info.name] = { name: info.name, size: info.size, type: info.type, loc: gl.getUniformLocation(nextProgram, info.name) }; }
	}
	Sim.checkGL("uniform reflection");

	var attributes = this.attributes = {}
	len = gl.getProgramParameter(nextProgram, gl.ACTIVE_ATTRIBUTES) || 0;
	for (i = 0; i < len; ++i) {
		info = gl.getActiveAttrib(nextProgram, i);
		if (info) { attributes[info.name] = { name: info.name, size: info.size, type: info.type, loc: gl.getAttribLocation(nextProgram, info.name) }; }
	}
	Sim.checkGL("attrib reflection");
	return true;
};
ShaderProgram.prototype.uniformActive = function(name) { return !!this.uniforms[name]; };
ShaderProgram.prototype.setUniform1f = function(name, x) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniform1f(u.loc, x); } };
ShaderProgram.prototype.setUniform2f = function(name, x, y) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniform2f(u.loc, x, y); } };
ShaderProgram.prototype.setUniform3f = function(name, x, y, z) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniform3f(u.loc, x, y, z); } };
ShaderProgram.prototype.setUniform4f = function(name, x, y, z, w) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniform4f(u.loc, x, y, z, w); } };
ShaderProgram.prototype.setUniform1i = function(name, x) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniform1i(u.loc, x); } };
ShaderProgram.prototype.setUniform2i = function(name, x, y) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniform2i(u.loc, x, y); } };
ShaderProgram.prototype.setUniform3i = function(name, x, y, z) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniform3i(u.loc, x, y, z); } };
ShaderProgram.prototype.setUniform4i = function(name, x, y, z, w) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniform4i(u.loc, x, y, z, w); } };
ShaderProgram.prototype.setUniform1fv = function(name, arr) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniform1fv(u.loc, arr); } };
ShaderProgram.prototype.setUniform2fv = function(name, arr) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniform2fv(u.loc, arr); } };
ShaderProgram.prototype.setUniform3fv = function(name, arr) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniform3fv(u.loc, arr); } };
ShaderProgram.prototype.setUniform4fv = function(name, arr) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniform4fv(u.loc, arr); } };
ShaderProgram.prototype.setUniform1iv = function(name, arr) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniform1iv(u.loc, arr); } };
ShaderProgram.prototype.setUniform2iv = function(name, arr) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniform2iv(u.loc, arr); } };
ShaderProgram.prototype.setUniform3iv = function(name, arr) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniform3iv(u.loc, arr); } };
ShaderProgram.prototype.setUniform4iv = function(name, arr) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniform4iv(u.loc, arr); } };
ShaderProgram.prototype.setUniformMatrix1fv = function(name, m) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniformMatrix1fv(u.loc, Sim.gl.FALSE, m); } };
ShaderProgram.prototype.setUniformMatrix2fv = function(name, m) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniformMatrix2fv(u.loc, Sim.gl.FALSE, m); } };
ShaderProgram.prototype.setUniformMatrix3fv = function(name, m) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniformMatrix3fv(u.loc, Sim.gl.FALSE, m); } };
ShaderProgram.prototype.setUniformMatrix4fv = function(name, m) { var u; if ((u = this.uniforms[name])) { Sim.gl.uniformMatrix4fv(u.loc, Sim.gl.FALSE, m); } };

function mat4(v) { if (typeof v !== 'number') v = 1.0; return new Float32Array([v, 0, 0, 0, 0, v, 0, 0, 0, 0, v, 0, 0, 0, 0, v]); }

mat4.v = function(out, xx, xy, xz, xw, yx, yy, yz, yw, zx, zy, zz, zw, wx, wy, wz, ww) {
	if (!out) out = new Float32Array(16);
	out[0] = xx; out[1] = xy; out[2] = xz; out[3] = xw;
	out[4] = yx; out[5] = yy; out[6] = yz; out[7] = yw;
	out[8] = zx; out[9] = zy; out[10] = zz; out[11] = zw;
	out[12] = wx; out[13] = wy; out[14] = wz; out[15] = ww;
	return out;
};

mat4.identity = function(out) {
	return mat4.v(out, 1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1);
};

mat4.transpose = function(out, m) {
	var xx = m[0], xy = m[1], xz = m[2], xw = m[3], yx = m[4], yy = m[5], yz = m[6], yw = m[7], zx = m[8], zy = m[9], zz = m[10], zw = m[11], wx = m[12], wy = m[13], wz = m[14], ww = m[15];
	return mat4.v(out, xx,yx,zx,wx, xy,yy,zy,wy, xz,yz,zz,wz, xw,yw,zw,ww);
}

mat4.adjunct = function(out, m) {
	var xx = m[0], xy = m[1], xz = m[2], xw = m[3], yx = m[4], yy = m[5], yz = m[6], yw = m[7], zx = m[8], zy = m[9], zz = m[10], zw = m[11], wx = m[12], wy = m[13], wz = m[14], ww = m[15];
	return mat4.v(out, yy*zz*ww + wy*yz*zw + zy*wz*yw - yy*wz*zw - zy*yz*ww - wy*zz*yw,
	                   xy*wz*zw + zy*xz*ww + wy*zz*xw - wy*xz*zw - zy*wz*xw - xy*zz*ww,
	                   xy*yz*ww + wy*xz*yw + yy*wz*xw - xy*wz*yw - yy*xz*ww - wy*yz*xw,
	                   xy*zz*yw + yy*xz*zw + zy*yz*xw - xy*yz*zw - zy*xz*yw - yy*zz*xw,
	                   yz*ww*zx + zz*yw*wx + wz*zw*yx - yz*zw*wx - wz*yw*zx - zz*ww*yx,
	                   xz*zw*wx + wz*xw*zx + zz*ww*xx - xz*ww*zx - zz*xw*wx - wz*zw*xx,
	                   xz*ww*yx + yz*xw*wx + wz*yw*xx - xz*yw*wx - wz*xw*yx - yz*ww*xx,
	                   xz*yw*zx + zz*xw*yx + yz*zw*xx - xz*zw*yx - yz*xw*zx - zz*yw*xx,
	                   yw*zx*wy + ww*yx*zy + zw*wx*yy - yw*wx*zy - zw*yx*wy - ww*zx*yy,
	                   xw*wx*zy + zw*xx*wy + ww*zx*xy - xw*zx*wy - ww*xx*zy - zw*wx*xy,
	                   xw*yx*wy + ww*xx*yy + yw*wx*xy - xw*wx*yy - yw*xx*wy - ww*yx*xy,
	                   xw*zx*yy + yw*xx*zy + zw*yx*xy - xw*yx*zy - zw*xx*yy - yw*zx*xy,
	                   yx*wy*zz + zx*yy*wz + wx*zy*yz - yx*zy*wz - wx*yy*zz - zx*wy*yz,
	                   xx*zy*wz + wx*xy*zz + zx*wy*xz - xx*wy*zz - zx*xy*wz - wx*zy*xz,
	                   xx*wy*yz + yx*xy*wz + wx*yy*xz - xx*yy*wz - wx*xy*yz - yx*wy*xz,
	                   xx*yy*zz + zx*xy*yz + yx*zy*xz - xx*zy*yz - yx*xy*zz - zx*yy*xz)
};

mat4.determinant = function(m) {
	var xx = m[0], xy = m[1], xz = m[2], xw = m[3], yx = m[4], yy = m[5], yz = m[6], yw = m[7], zx = m[8], zy = m[9], zz = m[10], zw = m[11], wx = m[12], wy = m[13], wz = m[14], ww = m[15];
	return xx*(yy*zz*ww + wy*yz*zw + zy*wz*yw - yy*wz*zw - zy*yz*ww - wy*zz*yw) +
	       xy*(yz*ww*zx + zz*yw*wx + wz*zw*yx - yz*zw*wx - wz*yw*zx - zz*ww*yx) +
	       xz*(yw*zx*wy + ww*yx*zy + zw*wx*yy - yw*wx*zy - zw*yx*wy - ww*zx*yy) +
	       xw*(yx*wy*zz + zx*yy*wz + wx*zy*yz - yx*zy*wz - wx*yy*zz - zx*wy*yz);
};

mat4.inverse = function(out, m) {
	var det = mat4.determinant(m);
	if (det === 0) return mat4.identity(out);
	var adj = mat4.adjunct(out, m), id = 1.0 / det;
	for (var i = 0; i < 16; ++i) adj[i] *= id;
	return adj;
};

mat4.perspective = function(out, fovy, aspect, zNear, zFar) {
	var yf = 1.0 / Math.tan(fovy*0.5), dz = zNear - zFar;
	return mat4.v(out, yf/aspect,0,0,0,  0,yf,0,0,  0,0,(zNear+zFar)/dz,-1,  0,0,2*zNear*zFar/dz,0);
};

mat4.translation = function(out, x, y, z) {
	return mat4.v(out, 1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1);
};

mat4.mul = function(out, m, a) {
	if (!out) out = mat4();
	var m00 = m[4*0+0], m01 = m[4*0+1], m02 = m[4*0+2], m03 = m[4*0+3];
	var m10 = m[4*1+0], m11 = m[4*1+1], m12 = m[4*1+2], m13 = m[4*1+3];
	var m20 = m[4*2+0], m21 = m[4*2+1], m22 = m[4*2+2], m23 = m[4*2+3];
	var m30 = m[4*3+0], m31 = m[4*3+1], m32 = m[4*3+2], m33 = m[4*3+3];
	for (var i = 0; i < 4; i++) {
		var ai0 = a[i+0], ai1 = a[i+4], ai2 = a[i+8], ai3 = a[i+12];
		out[0 + i] = ai0*m00 + ai1*m01 + ai2*m02 + ai3*m03;
		out[4 + i] = ai0*m10 + ai1*m11 + ai2*m12 + ai3*m13;
		out[8 + i] = ai0*m20 + ai1*m21 + ai2*m22 + ai3*m23;
		out[12+ i] = ai0*m30 + ai1*m31 + ai2*m32 + ai3*m33;
	}
	return out;
};

mat4.lookDir = function(out, fx, fy, fz, ux, uy, uz) {
	// TODO: unnecessary allocations
	function v3norm(v, fallback) {
		var x = v[0], y = v[1], z = v[2], vl = Math.sqrt(x*x+y*y+z*z);
		return vl === 0 ? (fallback || [0, 1, 0]) : [x/vl, y/vl, z/vl];
	}
	function v3cross(a, b) {
		return [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
	}
	var f = v3norm([fx, fy, fz], [1, 0, 0]);
	var s = v3norm(v3cross(f, [ux, uy, uz]));
	var u = v3cross(s, f);
	return mat4.v(out, s[0],u[0],-f[0],0, s[1],u[1],-f[1],0, s[2],u[2],-f[2],0, 0,0,0,1);
};

mat4.lookAt = function(out, ex, ey, ez, cx, cy, cz, ux, uy, uz) {
	// TODO: unnecessary allocations
	return mat4.mul(out, mat4.lookDir(null, cx-ex, cy-ey, cz-ez, ux, uy, uz), mat4.translation(null, -ex, -ey, -ez));
};

mat4.rotation = function(out, x, y, z) {
	if (!out) out = mat4();
	var sx = Math.sin(x), cx = Math.cos(x);
	var sy = Math.sin(y), cy = Math.cos(y);
	var sz = Math.sin(z), cz = Math.cos(z);
	out[ 0] = cy*cz;           out[ 1] = -cy*sz;         out[ 2] = sy;     out[ 3] = 0;
	out[ 4] = cz*sx*sy+cx*sz;  out[ 5] = cx*cz-sx*sy*sz; out[ 6] = -cy*sx; out[ 7] = 0;
	out[ 8] = -cx*cz*sy+sx*sz; out[ 9] = cz*sx+cx*sy*sz; out[10] = cx*cy;  out[11] = 0;
	out[12] = 0;               out[13] = 0;              out[14] = 0;      out[15] = 1;
	return out;
};

(function() {
	var tempM4 = {};

	Sim.setSceneUniforms = function(shader, viewMat, ambientLight, lightPos, lightColor) {
		if (!ambientLight) ambientLight = [0.2, 0.2, 0.2];
		if (!lightPos) lightPos = [50, 100, 100];
		if (!lightColor) lightColor = [0.5, 0.5, 0.5];
		shader.setUniformMatrix4fv('u_proj', Sim.projectionMatrix);
		shader.setUniformMatrix4fv('u_view', viewMat);

		tempM4.u_viewProj = mat4.mul(tempM4.u_viewProj, viewMat, Sim.projectionMatrix);
		shader.setUniformMatrix4fv('u_viewProj', tempM4.u_viewProj);

		if (shader.uniformActive('u_invView')) {
			tempM4.u_invView = mat4.inverse(tempM4.u_invView, viewMat);
			shader.setUniformMatrix4fv('u_invView', tempM4.u_invView);
		}

		if (shader.uniformActive('u_invProj')) {
			tempM4.u_invProj = mat4.inverse(tempM4.u_invProj, Sim.projectionMatrix);
			shader.setUniformMatrix4fv('u_invProj', tempM4.u_invProj);
		}

		if (shader.uniformActive('u_invViewProj')) {
			tempM4.u_invViewProj = mat4.inverse(tempM4.u_invViewProj, tempM4.u_viewProj);
			shader.setUniformMatrix4fv('u_invViewProj', tempM4.u_invViewProj);
		}

		shader.setUniform4f('u_time', Sim.time/20.0, Sim.time, Sim.time*2.0, Sim.time*3.0);
		shader.setUniform4f('u_sinTime', Math.sin(Sim.time*0.125), Math.sin(Sim.time*0.25), Math.sin(Sim.time*2.0), Math.sin(Sim.time));
		shader.setUniform4f('u_cosTime', Math.cos(Sim.time*0.125), Math.cos(Sim.time*0.25), Math.cos(Sim.time*2.0), Math.cos(Sim.time));
		shader.setUniform4f('u_screen', Sim.width, Sim.height, 1.0/Sim.width, 1.0/Sim.height);

		shader.setUniform3f('u_ambient', ambientLight[0], ambientLight[1], ambientLight[2]);
		shader.setUniform3f('u_lightPos', lightPos[0], lightPos[1], lightPos[2]);
		shader.setUniform3f('u_lightColor', lightColor[0], lightColor[1], lightColor[2]);
	}

	Sim.setModelUniforms = function(shader, viewMat, modelMat) {
		shader.setUniformMatrix4fv('u_model', modelMat);
		tempM4.u_modelView = mat4.mul(tempM4.u_modelView, modelMat, viewMat);
		shader.setUniformMatrix4fv('u_modelView', tempM4.u_modelView);

		tempM4.u_modelViewProj = mat4.mul(tempM4.u_modelViewProj, tempM4.u_modelView, Sim.projectionMatrix);
		shader.setUniformMatrix4fv('u_modelViewProj', tempM4.u_modelViewProj);

		if (shader.uniformActive('u_invModel')) {
			tempM4.u_invModel = mat4.inverse(tempM4.u_invModel, modelMat);
			shader.setUniformMatrix4fv('u_invModel', tempM4.u_invModel);
		}

		if (shader.uniformActive('u_invModelView') || shader.uniformActive('u_normalMatrix')) {
			tempM4.u_invModelView = mat4.inverse(tempM4.u_invModelView, tempM4.u_modelView);
			shader.setUniformMatrix4fv('u_invModelView', tempM4.u_invModelView);
		}

		if (shader.uniformActive('u_normalMatrix')) {
			tempM4.u_normalMatrix = mat4.transpose(tempM4.u_normalMatrix, tempM4.u_invModelView);
			shader.setUniformMatrix4fv('u_normalMatrix', tempM4.u_normalMatrix);
		}

		if (shader.uniformActive('u_invModelViewProj')) {
			tempM4.u_invModelViewProj = mat4.inverse(tempM4.u_invModelViewProj, tempM4.u_modelViewProj);
			shader.setUniformMatrix4fv('u_invModelViewProj', tempM4.u_invModelViewProj);
		}
	};
}());

Sim.getShaderPrefix = function(exts) {
	var prefix = Sim.shaderPrefix;
	if (exts && exts.length) {
		prefix = exts.map(function(ext) {
		    return '#extension '+ext+' : enable';

		}).concat([prefix]).join('\n');
	}
	return prefix;
};


Sim.createShader = function(fs, vs, attribLocs, exts) {
    var f = document.getElementById(fs);
    var v = document.getElementById(vs);
    if (f) fs = f.textContent;
    if (v) vs = v.textContent;
    var prefix = this.getShaderPrefix(exts);
    fs = prefix+fs;
    vs = prefix+vs;
    return new ShaderProgram(vs, fs, attribLocs);
}

Sim.init = function() {
    // create canvas
    var c = document.createElement('canvas');
    // add id to canvas
    c.id = "cloth";
    c.style.zIndex = 9999999;
    document.body.appendChild(c);
    
	c.width = window.innerWidth;
	c.height = window.innerHeight;

	var gl = c.getContext('webgl', { alpha: true, failIfMajorPerformanceCaveat: true });
	if (!gl) {alert("no webgl"); throw Error("no webgl"); }
	Sim.gl = gl;
	Sim.canvas = c;
	Sim.width = c.width;
	Sim.height = c.height;
	Sim.projectionMatrix = mat4.perspective(Sim.projectionMatrix, Sim.viewAngle, Sim.width/Sim.height, Sim.zNear, Sim.zFar);
	Sim.time = 0.0;
	function resize() {
		Sim.width = window.innerWidth;
		Sim.height = window.innerHeight;
		gl.viewport(0, 0, Sim.width, Sim.height);
		Sim.projectionMatrix = mat4.perspective(Sim.projectionMatrix, Sim.viewAngle, Sim.width/Sim.height, 0.1, 50)
	}
	function updateMouse(e) {
		var rect = Sim.canvas.getBoundingClientRect();
		Sim.mouse.x = e.clientX - rect.left;
		Sim.mouse.y = e.clientY - rect.top;
		var spread = Math.tan(Sim.viewAngle / 2.0 * Math.PI / 180.0);
		var y = spread * ((Sim.height - Sim.mouse.y) - Sim.height / 2.0) / (Sim.height / 2.0);
		var x = spread * (Sim.mouse.x - Sim.width / 2.0) / (Sim.height / 2.0);
		var il = 1.0/Math.sqrt(x*x + y*y + 1);
		Sim.mouse.vec[0] = x*il;
		Sim.mouse.vec[1] = y*il;
		Sim.mouse.vec[2] = -il;
	}
	window.addEventListener('resize', resize);
	window.addEventListener('mousedown', function(e) {
		Sim.mouse.down = true;
		updateMouse(e);
	});
	window.addEventListener('mouseup', function(e) {
		Sim.mouse.down = false;
		updateMouse(e);
	});
	window.addEventListener('blur', function(e) {
	    Sim.mouse.down = false;
	});
	resize();
	window.addEventListener('mousemove', updateMouse);
    window.addEventListener('keydown', function(e) {
        if (e.keyCode === 27) {
            Sim.paused = !Sim.paused;
            if (!Sim.paused) {
                Sim.start();
            }
        }
    })
};

Sim.start = function() {
	var lastUpdate = 0;
	var lastPrint = Date.now();
	var frames = 0

    var fpsE = document.getElementById('fps');
	function update(timestamp)  {
		if (Sim.paused) return;
		if (!lastUpdate) { lastUpdate = timestamp; return window.requestAnimationFrame(update); }

		var deltaTime = timestamp - lastUpdate;
		lastUpdate = timestamp;
		Sim.update(deltaTime / 1000.0);
		++frames;
		Sim.lastMouse.x = Sim.mouse.x;
		Sim.lastMouse.y = Sim.mouse.y;
		Sim.lastMouse.down = Sim.mouse.down;
		for (var i = 0; i < 3; ++i) {
			Sim.lastMouse.vec[i] = Sim.mouse.vec[i];
		}
		if (Date.now() >= lastPrint + 1000) {
		    if (fpsE != null) {
		        fpsE.textContent = frames+"fps";
		    }
			Sim.recordFPS(frames);
			lastPrint = Date.now();
			frames = 0;
		}
	    window.requestAnimationFrame(update);
	}
	window.requestAnimationFrame(update);
};

Sim.shaderPrefix = [
	"precision mediump float;",

	"uniform mat4 u_proj;",
	"uniform mat4 u_model;",
	"uniform mat4 u_view;",
	"uniform mat4 u_viewProj;",
	"uniform mat4 u_modelView;",
	"uniform mat4 u_modelViewProj;",

	"uniform mat4 u_invModel;",
	"uniform mat4 u_invView;",
	"uniform mat4 u_invViewProj;",
	"uniform mat4 u_invModelView;",
	"uniform mat4 u_invModelViewProj;",
	"uniform mat4 u_normalMatrix;",

	"uniform vec4 u_time;",
	"uniform vec4 u_sinTime;",
	"uniform vec4 u_cosTime;",
	"uniform vec4 u_screen;",

	"uniform vec3 u_ambient;",
	"uniform vec3 u_lightPos;",
	"uniform vec3 u_lightColor;",

	"#define saturate(x) clamp((x), 0.0, 1.0)",
	"#define lerp(a, b, t) mix((a), (b), (t))",
	"#line 0"
].join("\n");

window.Sim = Sim;
window.mat4 = mat4;