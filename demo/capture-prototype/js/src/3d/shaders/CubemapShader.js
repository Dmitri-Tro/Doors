// import {Vector3} from 'three';

const CubemapShader = {
  uniforms: {
    texture: {
      type: 't',
      value: null
    },
    placement : {
      type : 'v3', 
      value : new THREE.Vector3
    },
    rotation : {
      type : 'v3',
      value : new THREE.Euler
    },
    useColor: {
      type: 'f',
      value: 0
    },
    color: {
      type: 'v3',
      value: new THREE.Color(0xff00ff)
    },
    pitch: {
      type: 'f',
      value: 0
    },
    roll: {
      type: 'f',
      value: 0
    },
  },

  vertexShader: '\
    varying vec3 worldPosition;\
    void main() {\
      vec4 p = vec4(position, 1.0);\
      worldPosition = (modelMatrix * p).xyz;\
      gl_Position = projectionMatrix * modelViewMatrix * p;\
    }\
  ',

  fragmentShader: '\
    uniform samplerCube texture;\
    uniform vec3 placement;\
    uniform vec3 rotation;\
    uniform float useColor;\
    uniform vec3 color;\
    uniform float pitch;\
    uniform float roll;\
    varying vec3 worldPosition;\
    vec3 rotateXYZ(vec3 v, float rotation, float pitch, float roll) {\
      float sPitch = sin(pitch);\
      float cPitch = cos(pitch);\
      mat3 mPitch = mat3(\
        cPitch, -sPitch, 0,\
        sPitch, cPitch, 0,\
        0, 0, 1\
      );\
      \
      float sRoll = sin(roll);\
      float cRoll = cos(roll);\
      mat3 mRoll = mat3(\
        1, 0, 0,\
        0, cRoll, -sRoll,\
        0, sRoll, cRoll\
      );\
      \
      float sRot = sin(rotation);\
      float cRot = cos(rotation);\
      mat3 mRot = mat3(\
        cRot, 0, sRot,\
        0, 1, 0,\
        -sRot, 0, cRot\
      );\
      \
      v = mRot * v;\
      v = mPitch * v;\
      v = mRoll * v;\
      return v;\
    }\
    vec4 getColorCubemap (samplerCube map, vec3 placement, float rotation, float pitch, float roll) {\
      return textureCube(map, rotateXYZ(worldPosition - placement, rotation, pitch, roll).zyx);\
    }\
    void main() {\
      vec4 texColor = getColorCubemap(texture, placement, rotation.y, pitch, roll);\
      if (useColor != 1.0) {\
        gl_FragColor = texColor;\
      } else {\
        gl_FragColor = vec4(\
          mix(texColor.x, color.x, 0.5),\
          mix(texColor.y, color.y, 0.5),\
          mix(texColor.z, color.z, 0.5),\
          1\
        );\
      }\
    }\
  '
};

// export default CubemapShader;