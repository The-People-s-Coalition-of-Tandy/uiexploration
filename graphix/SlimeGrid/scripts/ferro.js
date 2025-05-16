import * as THREE from 'three';



async function loadShader(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load shader: ${url}`);
        }
        return response.text();
    } catch (error) {
        console.error('Error loading shader:', error);
        throw error;
    }
}

export default class SlimeSimulation {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.init();
    }

    async init() {
        await this.initRenderer();
        this.initScene();
        this.initSimulation();
        this.addEventListeners();
        this.animate();
    }

    async initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Update shader paths to be relative to the current page
        try {
            this.vertexShader = await loadShader('./shaders/vert.glsl');
            this.simulationShader = await loadShader('./shaders/sim.glsl');
            this.renderShader = await loadShader('./shaders/render.glsl');
        } catch (error) {
            console.error('Failed to initialize shaders:', error);
        }
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.quad = new THREE.PlaneGeometry(2, 2);
    }

    initSimulation() {
        const size = 512;
        this.renderTargets = [
            new THREE.WebGLRenderTarget(size, size, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: THREE.FloatType,
            }),
            new THREE.WebGLRenderTarget(size, size, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: THREE.FloatType,
            }),
        ];

        this.simulationMaterial = new THREE.ShaderMaterial({
            vertexShader: this.vertexShader,
            fragmentShader: this.simulationShader,
            uniforms: {
                uPreviousState: { value: null },
                uResolution: { value: new THREE.Vector2(size, size) },
                uMouse: { value: new THREE.Vector2(0.5, 0.5) },
                uIsMouseDown: { value: false },
                uTime: { value: 0 },
            },
        });

        this.renderMaterial = new THREE.ShaderMaterial({
            vertexShader: this.vertexShader,
            fragmentShader: this.renderShader,
            uniforms: {
                uState: { value: null },
                uTime: { value: 0 },
            },
        });
    }

    addEventListeners() {
        window.addEventListener('resize', this.onResize.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
    }

    onResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(event) {
        this.simulationMaterial.uniforms.uMouse.value.x = event.clientX / window.innerWidth;
        this.simulationMaterial.uniforms.uMouse.value.y = 1 - event.clientY / window.innerHeight;
        this.simulationMaterial.uniforms.uIsMouseDown.value = true;

        clearTimeout(this.mouseTimeout);
        this.mouseTimeout = setTimeout(() => {
            this.simulationMaterial.uniforms.uIsMouseDown.value = false;
        }, 20);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const time = performance.now() * 0.001;
        this.simulationMaterial.uniforms.uTime.value = time;
        this.renderMaterial.uniforms.uTime.value = time;

        this.simulationMaterial.uniforms.uPreviousState.value = this.renderTargets[0].texture;
        this.renderer.setRenderTarget(this.renderTargets[1]);
        this.renderer.render(
            new THREE.Scene().add(new THREE.Mesh(this.quad, this.simulationMaterial)),
            this.camera
        );

        this.renderMaterial.uniforms.uState.value = this.renderTargets[1].texture;
        this.renderer.setRenderTarget(null);
        this.renderer.render(
            new THREE.Scene().add(new THREE.Mesh(this.quad, this.renderMaterial)),
            this.camera
        );

        [this.renderTargets[0], this.renderTargets[1]] = [this.renderTargets[1], this.renderTargets[0]];
    }
}
