precision highp float;
        varying vec2 vUv;
        uniform sampler2D uState;
        uniform float uTime;

        // PBR parameters
        const float roughness = 0.2;
        const float metalness = 1.;
        const vec3 baseColor = vec3(1.);

        // Normal calculation from height field
        vec3 calculateNormal(vec2 uv) {
            vec2 texel = vec2(1.0) / vec2(textureSize(uState, 0));
            float left = texture2D(uState, uv - vec2(texel.x, 0.0)).b;
            float right = texture2D(uState, uv + vec2(texel.x, 0.0)).b;
            float top = texture2D(uState, uv - vec2(0.0, texel.y)).b;
            float bottom = texture2D(uState, uv + vec2(0.0, texel.y)).b;
            
            return normalize(vec3(
                (right - left) * 2.0,
                (bottom - top) * 2.0,
                1.0
            ));
        }

        // PBR functions
        float ggxDistribution(float NdotH, float roughness) {
            float alpha = roughness * roughness;
            float alpha2 = alpha * alpha;
            float NdotH2 = NdotH * NdotH;
            float denom = NdotH2 * (alpha2 - 1.0) + 1.0;
            return alpha2 / (3.14159 * denom * denom);
        }

        float geometrySchlickGGX(float NdotV, float roughness) {
            float r = roughness + 1.0;
            float k = (r * r) / 8.0;
            return NdotV / (NdotV * (1.0 - k) + k);
        }

        vec3 fresnelSchlick(float cosTheta, vec3 F0) {
            return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
        }

        void main() {
            vec4 state = texture2D(uState, vUv);
            float mass = state.r;
            float height = state.b;
            
            // Calculate lighting vectors
            vec3 normal = calculateNormal(vUv);
            vec3 lightPos = vec3(2.0 * cos(uTime * 0.5), 2.0 * sin(uTime * 0.5), 2.0);
            vec3 viewPos = vec3(0.0, 0.0, 2.0);
            vec3 worldPos = vec3(vUv * 2.0 - 1.0, height);
            
            vec3 N = normal;
            vec3 V = normalize(viewPos - worldPos);
            vec3 L = normalize(lightPos - worldPos);
            vec3 H = normalize(V + L);
            
            float NdotV = max(dot(N, V), 0.0);
            float NdotL = max(dot(N, L), 0.0);
            float NdotH = max(dot(N, H), 0.0);
            float HdotV = max(dot(H, V), 0.0);
            
            // Calculate PBR terms
            vec3 F0 = mix(vec3(0.04), baseColor, metalness);
            vec3 F = fresnelSchlick(HdotV, F0);
            float D = ggxDistribution(NdotH, roughness);
            float G = geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);
            
            // Combine lighting
            vec3 specular = (D * F * G) / (4.0 * NdotV * NdotL + 0.001);
            vec3 kD = (vec3(1.0) - F) * (1.0 - metalness);
            vec3 diffuse = kD * baseColor / 3.14159;
            
            vec3 color = (diffuse + specular) * NdotL;
            
            // Add emission based on mass
            color -= baseColor * mass * 0.29;
            color.b += mass * 0.22;
            
            // Add ambient
            color += baseColor * 0.89;
            
            // Tone mapping and gamma correction
            color = color / (color + vec3(1.0));
            color = pow(color, vec3(1.0/2.5));
            
            gl_FragColor = vec4(color, 1.0);
        }