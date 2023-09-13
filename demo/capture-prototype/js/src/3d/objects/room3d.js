const Room3D = function (name, mainCamera) {
  this.id = Utils.guid();

  this.name = name || _.uniqueId('Unnamed ');
  this.color = new THREE.Color(0xFFFFFF * Math.random());
  this.mainCamera = mainCamera || null;
  this.contains = {
    floors: [],
    walls: []
  };

  this.getId = function () {
    return this.id;
  }

  this.getCameraId = function () {
    return this.mainCamera ? this.mainCamera.getId() : undefined;
  }

  this.getName = function () {
    return this.name;
  }

  this.setName = function (name) {
    this.name = name;
    return this;
  }

  this.setMainCamera = function (camera) {
    if (this.mainCamera) {
      this.mainCamera.resetPointerColor();
    }

    this.mainCamera = camera;
    this.name = camera.getName();
    return this;
  }

  this.setColor = function (color) {
    this.color = color;
    return this;
  }

  this.setColorHex = function (colorHex) {
    this.color.set(parseInt('0x' + colorHex), 16);
    return this;
  }

  this.getColorHex = function () {
    return this.color.getHexString();
  }

  this.showColor = function () {
    if (this.mainCamera) {
      this.mainCamera.setPointerColor(this.color.getHex());
    }

    this.contains.walls.forEach(function (wall) {
      Object.keys(wall.sides).forEach(function (sideKey) {
        const side = wall.sides[sideKey];

        if (side.room === this) {
          var cloneKey = '_roomMaterial_' + sideKey;
          var cloneIndexKey = '_cloneMaterialIndex_' + sideKey;
          
          if (!wall[cloneKey]) {
            wall[cloneKey] = wall.material[side.materialIndex].clone();
            wall[cloneIndexKey] = wall.material.length;
            wall.material[wall[cloneIndexKey]] = wall[cloneKey];
          }

          if (
            wall[cloneKey] instanceof THREE.MeshLambertMaterial || 
            wall[cloneKey] instanceof THREE.MeshBasicMaterial
          ) {
            wall[cloneKey].color = this.color;
          } else if (wall[cloneKey] instanceof THREE.ShaderMaterial) {
            if (wall.material[side.materialIndex] instanceof THREE.ShaderMaterial) {
              wall[cloneKey].uniforms.texture.value = wall.material[side.materialIndex].uniforms.texture.value;
            }
            wall[cloneKey].uniforms.useColor.value = 1;
            wall[cloneKey].uniforms.color.value = new THREE.Color(this.color);
          }

          wall.setSideFacesMaterialsIndexes(sideKey, wall[cloneIndexKey]);
        }
      }.bind(this));
    }.bind(this));

    this.contains.floors.forEach(function (floor) {
      const side = floor.side;

      if (side.room = this) {
        if (!floor._roomMaterial) {
          floor._cloneMaterialIndex = floor.material.length;
          floor._roomMaterial = floor.material[side.materialIndex].clone();
          floor.material[floor._cloneMaterialIndex] = floor._roomMaterial;
        }

        if (
          floor._roomMaterial instanceof THREE.MeshLambertMaterial || 
          floor._roomMaterial instanceof THREE.MeshBasicMaterial
        ) {
          floor._roomMaterial.color = this.color;
        } else if (floor._roomMaterial instanceof THREE.ShaderMaterial) {
          floor._roomMaterial.uniforms.texture.value = floor.material[side.materialIndex].uniforms.texture.value;
          floor._roomMaterial.uniforms.useColor.value = 1;
          floor._roomMaterial.uniforms.color.value = new THREE.Color(this.color);
        }

        floor.setSideFacesMaterialsIndexes(floor._cloneMaterialIndex);
      }
    }.bind(this));

    return this;
  }

  this.hideColor = function () {
    if (this.mainCamera) {
      this.mainCamera.resetPointerColor();
    }

    this.contains.walls.forEach(function (wall) {
      Object.keys(wall.sides).forEach(function (sideKey) {
        const side = wall.sides[sideKey];

        if (side.room === this) {
          wall.setSideFacesMaterialsIndexes(sideKey, side.materialIndex);
        }
      }.bind(this));
    }.bind(this));

    this.contains.floors.forEach(function (floor) {
      if (floor.side.room === this) {
        floor.setSideFacesMaterialsIndexes(floor.side.materialIndex);
      }
    }.bind(this));

    return this;
  }

  this.addFloor = function (floor) {
    if (floor.side.room !== this) {
      if (floor.side.room && floor.side.room instanceof Room3D) {
        floor.side.room.removeFloor(floor);
      }
  
      floor.side.room = this;
      this.contains.floors.push(floor);
    } else {
      floor.side.room.removeFloor(floor);
    }

    return this;
  }

  this.removeFloor = function (floor) {
    this.hideColor();

    var indexOfFloors = this.contains.floors.indexOf(floor);

    if (~indexOfFloors) {
      floor.side.room = null;
      this.contains.floors.splice(indexOfFloors, 1);
    }

    this.showColor();
    return this;
  }

  this.addWall = function (wall, faceIndex) {
    var side = wall.getSideByFace(faceIndex);

    if (side) {
      if (wall.sides[side].room !== this) {
        if (wall.sides[side].room && wall.sides[side].room instanceof Room3D) {
          wall.sides[side].room.removeWall(wall, side);
        }

        wall.sides[side].room = this;
  
        if (!~this.contains.walls.indexOf(wall)) {
          this.contains.walls.push(wall);
        }
      } else {
        wall.sides[side].room.removeWall(wall, side);
      }
    }

    return this;
  }

  this.removeWall = function (wall, side) {
    this.hideColor();

    var indexOfWall = this.contains.walls.indexOf(wall);

    if (~indexOfWall) {
      wall.sides[side].room = null;

      if (wall.sides[side === 'a' ? 'b' : 'a'].room !== this) {
        this.contains.walls.splice(indexOfWall, 1);
      }
    }

    this.showColor();
    return this;
  }

  this.beforeRemove = function () {
    this.hideColor();

    this.contains.walls.forEach(function (wall) {
      Object.keys(wall.sides).forEach(function (sideKey) {
        const side = wall.sides[sideKey];

        if (side.room === this) {
          side.room = null;
        }
      }.bind(this));
    });

    this.contains.floors.forEach(function (floor) {
      floor.side.room = null;
    });

    return this;
  }

  this.getStructure = function () {
    var structure = {
      id: this.id,
      name: (this.name + '').trim(),
      color: this.color.getHex(),
      camera: this.mainCamera ? this.mainCamera.getId() : null,
      floors: this.contains.floors.map(function (floor) {
        return floor.getName();
      }),
      walls: this.contains.walls.map(function (wall) {
        return wall.getName();
      })
    };

    return structure;
  }

  this.setStructure = function (floor3D, structure) {
    this.id = structure.id;

    var camera = floor3D.findInGroup('cameras', function (item) {
      return item.getId() === structure.camera;
    });

    if (camera) {
      this.setMainCamera(camera);
    }

    this.setName(structure.name);
    this.color.setHex(structure.color);

    structure.floors.forEach(function (floorId) {
      var floor = floor3D.findInGroup('floors', function (item) {
        return item.getName() === floorId;
      });

      if (floor) {
        this.addFloor(floor);
      }
    }.bind(this));
    structure.walls.forEach(function (wallId) {
      var wall = floor3D.findInGroup('walls', function (item) {
        return item.getName() === wallId;
      });

      if (wall) {
        Object.keys(wall.sides).forEach(function (sideKey) {
          const side = wall.sides[sideKey];

          if (side.room === structure.id) {
            this.addWall(wall, side.faces[0]);
          }
        }.bind(this));
      }
    }.bind(this));

    return this;
  }
}