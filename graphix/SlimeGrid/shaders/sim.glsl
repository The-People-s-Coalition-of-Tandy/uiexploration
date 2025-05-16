precision highp float;
        varying vec2 vUv;
        uniform sampler2D uPreviousState;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform bool uIsMouseDown;
        uniform float uTime;

        // Continuous neighborhood counting
        vec4 getNeighborhood(vec2 uv) {
            vec2 texel = 1.0 / uResolution;
            float alive = 0.0;
            float total = 0.0;
            
            // Sample in a radius around the current position
            float radius = 3.0;
            float count = 0.0;
            
            for(float y = -radius; y <= radius; y++) {
                for(float x = -radius; x <= radius; x++) {
                    vec2 offset = vec2(x, y) * texel;
                    float dist = length(offset * uResolution / radius);
                    
                    // Only count cells within a circle
                    if(dist <= radius) {
                        // Gaussian weight based on distance
                        float weight = exp(-dist * dist / 4.0);
                        
                        vec4 state = texture2D(uPreviousState, uv + offset);
                        alive += state.r * weight;
                        total += weight;
                        count += 1.0;
                    }
                }
            }
            
            // Normalize the count to 0-1 range
            alive = alive / total;
            
            // Calculate how close we are to having "3 neighbors"
            // Map the continuous value to peak at 3/8 (equivalent to 3 neighbors in discrete version)
            float neighborFactor = 1.0 - abs(alive - 0.375) * 4.0;
            
            return vec4(alive, neighborFactor, count, total);
        }

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        void main() {
            vec4 prevState = texture2D(uPreviousState, vUv);
            vec4 neighborhood = getNeighborhood(vUv);
            
            float currentMass = prevState.r;
            float currentVelocity = prevState.g;
            float currentHeight = prevState.b;
            
            // Continuous version of Conway's rules
            float birthRate = 0.91;  // How quickly cells come alive
            float deathRate = 0.9;  // How quickly cells die
            float sustainRate = 0.98; // How well cells maintain their state
            
            // Calculate state change based on neighborhood
            float neighborFactor = neighborhood.y;
            float targetMass = 0.0;
            
            // Birth rule (continuous version of "exactly 3 neighbors")
            if(neighborFactor > 0.9) {
                targetMass = 100.0;
            }
            // Death rule (continuous version of underpopulation/overpopulation)
            else if(neighborFactor < 0.89) {
                targetMass = 0.0;
            }
            // Sustain current state with slight decay
            else {
                targetMass = currentMass * sustainRate;
            }
            
            // Add some noise and movement
            float noise = hash(vUv + vec2(uTime * 0.01));
            float noiseFactor = 0.;
            
            // Calculate new stat
            float newMass = mix(currentMass, targetMass, 0.2) + (noise - 0.5) * noiseFactor;
            float newVelocity = currentVelocity * 0.95;
            float newHeight = currentHeight * 0.98 + newMass * 0.1;
            
            // Mouse interaction
            vec2 mouseDist = vUv - uMouse;
            if( uIsMouseDown && length(mouseDist) < 0.04) {
                newMass = 0.45;
                newHeight += 0.3;
                newVelocity += length(mouseDist) * 2.0;
            }
            
            // Ensure values stay in valid range
            newMass = clamp(newMass, 0.0, 1.0);
            newHeight = clamp(newHeight, 0.0, 1.0);
            
            gl_FragColor = vec4(newMass, newVelocity, newHeight, 1.0);
        }