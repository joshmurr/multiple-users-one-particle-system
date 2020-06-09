#version 300 es
precision mediump float;

uniform mat4 u_ProjectionMatrix;
uniform mat4 u_ViewMatrix;
// uniform mat4 u_ModelMatrix;

in vec3 i_Position;
in float i_Age;
in float i_Life;
in vec3 i_Velocity;

out float v_Age;
out float v_Life;

void main(){
    v_Age = i_Age;
    v_Life = i_Life;
    float ageFactor = 1.0 - i_Age/i_Life;

    gl_Position = u_ProjectionMatrix * u_ViewMatrix * vec4(i_Position, 1.0);
    gl_PointSize = 1.0/gl_Position.z * 6.0 * ageFactor;
}
