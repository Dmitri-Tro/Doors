// import {Vector3} from 'three';

// TODO: 
const EquirectangularShader = {
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
      value : new THREE.Vector3
    },
    useColor: {
      type: 'f',
      value: 0
    },
    color: {
      type: 'v3',
      value: new THREE.Color(0xffffff)
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
    const float seamWidth = 0.01;\
    const float PI = 3.1415926535897932384626433832795;\
    const float PI_05 = 1.5707963267948966;\
    const float PI_2 = 6.283185307179586;\
    uniform sampler2D texture;\
    uniform vec3 placement;\
    uniform vec3 rotation;\
    uniform float useColor;\
    uniform vec3 color;\
    varying vec3 worldPosition;\
    uniform float pitch;\
    uniform float roll;\
    float map(float value, float min1, float max1, float min2, float max2) {\
      return min2 + (value - min1) * (max2 - min2) / (max1 - min1);\
    }\
    vec3 xRot(vec3 v, float theta) {\
      float x = v.x;\
      float y = v.y * cos(theta) - v.z * sin(theta);\
      float z = v.y * sin(theta) + v.z * cos(theta);\
      return vec3(x, y, z);\
    }\
    vec3 yRot(vec3 v, float theta) {\
      float x = v.z * sin(theta) + v.x * cos(theta);\
      float y = v.y;\
      float z = v.z * cos(theta) - v.x * sin(theta);\
      return vec3(x, y, z);\
    }\
    vec3 zRot(vec3 v, float theta) {\
      float x = v.x * cos(theta) - v.y * sin(theta);\
      float y = v.x * sin(theta) + v.y * cos(theta);\
      float z = v.z;\
      return vec3(x, y, z);\
    }\
    vec3 lonLatToXYZ(vec2 lonLat) {\
      float lon = map(lonLat.x, 0.0, 1.0, -PI, PI);\
      float lat = map(lonLat.y, 0.0, 1.0, -PI * 0.5, PI * 0.5);\
      float x = sin(lat) * sin(lon);\
      float y = cos(lat);\
      float z = sin(lat) * cos(lon);\
      return vec3(x, y, z);\
    }\
    vec2 xyzToLonLat(vec3 v) {\
      vec3 p = normalize(v);\
      float lat = map(asin(p.y), PI * 0.5, -PI * 0.5, 0.0, 1.0);\
      float lon = map(atan(p.x, -p.z), PI, -PI, 0.0, 1.0);\
      return vec2(lon, lat);\
    }\
    vec4 getColorEquilar (sampler2D tex, vec3 placement, float rotation, float pitch, float roll) {\
      vec3 R = worldPosition - placement;\
      \
      R = yRot(R, -rotation);\
      R = xRot(R, -roll + PI);\
      R = zRot(R, pitch);\
      vec2 pos = xyzToLonLat(R);\
      \
      return texture2D(\
        tex,\
        vec2(\
          pos.x + 0.25,\
          pos.y\
        ),\
        -16.0\
      );\
    }\
    void main() {\
      vec4 texColor = getColorEquilar(texture, placement, -rotation.y, pitch, roll);\
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

// export default EquirectangularShader;