#version 300 es
precision mediump float;

in float v_Age;
in float v_Life;

out vec4 o_FragColor;

vec3 palette(in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d){
    return a+b*cos(6.28318*(c*t+d));
}

void main() {
    float t = v_Age/v_Life;
    float dist= length(2.0 * gl_PointCoord - 1.0);
    if (dist> 1.0) {
        discard;
    }
    vec4 particleColor = vec4(
            palette(t,
                vec3(0.9,0.7,0.4),
                vec3(0.7,0.8,0.3),
                vec3(0.75,0.6,0.6),
                vec3(0.1,0.15,0.20)), 1.0-t
            );

    float colorAmount = smoothstep(0.8, 1.0, dist);
    vec4 colorOut = mix(particleColor, vec4(0), colorAmount);

    float u_fogNear = 0.92;
    float u_fogFar = 0.98;
    vec4 u_fogColor = vec4(0.1, 0.1, 1.0, 1.0);

    float fogAmount = smoothstep(u_fogNear, u_fogFar, gl_FragCoord.z);

    o_FragColor = mix(colorOut, u_fogColor, fogAmount);
}
