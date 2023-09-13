const Floor3DPart = function (mesh, materials) {
  THREE.Mesh.call(this, mesh.geometry, Array.from(materials));
  
  this.name = mesh.name;
  this.clearable = true;

  this.materialsIndexes = {
    top: 0,
    ghost: 0
  };

  this.setMaterialsIndexes = function (top, ghost) {
    this.materialsIndexes = {
      top: top,
      ghost: ghost
    };

    if (this.geometry instanceof THREE.BufferGeometry) {
      this.geometry = new THREE.Geometry().fromBufferGeometry(this.geometry);
    }

    this.geometry.faces.forEach(function (face) {
      if (face.normal.y > 0) {
        face.materialIndex = this.materialsIndexes.top;
      } else {
        face.materialIndex = this.materialsIndexes.ghost;
      }
    }.bind(this));

    this.geometry.groupsNeedUpdate = true;

    return this;
  }

  this.setStructure = function (floor3D, type, structure) {
    if (window.doNotLoadTextures) return this; // Todo: make flag in UI

    if (type === 'wall') {
      Object.keys(structure.sides).forEach(sideKey => {
        const side = structure.sides[sideKey];
  
        if (side.projectionCamera) {
          var camera3D = floor3D.findInGroup('cameras', function (camera) {
            return camera.getId() === side.projectionCamera;
          }.bind(this));

          if (camera3D !== undefined && camera3D.shaderMaterial) {
            camera3D.updateShader();
            this.material.push(camera3D.shaderMaterial);

            side.faces.forEach(function (faceIndex) {
              try {
                this.geometry.faces[faceIndex].materialIndex = this.material.length - 1;
              } catch (e) {
                console.warn(e);
              }
            }.bind(this));
          }
        } else if (!isNaN(parseInt(side.defaultMaterial))) {
          side.faces.forEach(function (faceIndex) {
            try {
              this.geometry.faces[faceIndex].materialIndex = side.materialIndex || this.materialsIndexes.ghost;
            } catch (e) {
              console.warn(e);
            }
          }.bind(this));
        } else {
          side.faces.forEach(function (faceIndex) {
            try {
              this.geometry.faces[faceIndex].materialIndex = this.materialsIndexes.ghost;
            } catch (e) {
              console.warn(e);
            }
          }.bind(this));
        }
      });
    } else if (type === 'floor') {
      const side = structure.side;
  
      if (side.projectionCamera) {
        var camera3D = floor3D.findInGroup('cameras', function (camera) {
          return camera.getId() === side.projectionCamera;
        }.bind(this));

        if (camera3D !== undefined && camera3D.shaderMaterial) {
          camera3D.updateShader();
          this.material.push(camera3D.shaderMaterial);

          side.faces.forEach(function (faceIndex) {
            try {
              this.geometry.faces[faceIndex].materialIndex = this.material.length - 1;
            } catch (e) {
              console.warn(e);
            }
          }.bind(this));
        }
      } else if (!isNaN(parseInt(side.defaultMaterial))) {
        side.faces.forEach(function (faceIndex) {
          try {
            this.geometry.faces[faceIndex].materialIndex = side.materialIndex || this.materialsIndexes.ghost;
          } catch (e) {
            console.warn(e);
          }
        }.bind(this));
      } else {
        side.faces.forEach(function (faceIndex) {
          try {
            this.geometry.faces[faceIndex].materialIndex = this.materialsIndexes.ghost;
          } catch (e) {
            console.warn(e);
          }
        }.bind(this));
      }
    }

    this.geometry.groupsNeedUpdate = true;

    return this;
  }
}

Floor3DPart.prototype = Object.create(THREE.Mesh.prototype);
Floor3DPart.prototype.constructor = Floor3DPart;