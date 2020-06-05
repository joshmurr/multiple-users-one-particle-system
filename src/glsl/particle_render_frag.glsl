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
    float distance = length(2.0 * gl_PointCoord - 1.0);
    if (distance > 1.0) {
            discard;
    }
    o_FragColor = vec4(
            palette(t,
                vec3(0.9,0.7,0.8),
                vec3(0.7,0.8,0.3),
                vec3(0.75,0.6,0.6),
                vec3(0.1,0.15,0.20)), 1.0-t
            );
}
