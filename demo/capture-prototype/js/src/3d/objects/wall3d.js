'use strict';

const Wall3D = function () {
  THREE.Mesh.call(this);

  // Constructor
  this.wall2D = null;
  this.geometryType = null; //'box' or 'shape'
  this.transformConfig = new TransformConfig('xz', 'y', '', 'local'); 

  this.clearable = true;
  this.needRaycast = true;
  this.cutHoles = true;
  this.forceBoxBeometry = false;

  this.defaults = {
    height: 250
  };

  this.length = 100;
  this.width = 10;
  this.height = this.defaults.height;

  this.coordinates = new THREE.Vector3;
  this.center = new THREE.Vector3;
  this.raycastPoint = new THREE.Vector3;

  this.material = [
    new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false}), // Transparent
    new THREE.MeshLambertMaterial({color: 0x272822}), // Top
    new THREE.MeshLambertMaterial({color: 0x59956E}), // Side A
    new THREE.MeshLambertMaterial({color: 0xCEBB19}), // Side B
    new THREE.MeshLambertMaterial({color: 0xFF0000}) // Highligth
  ];

  this.sides = {
    a: {
      id: 'a',
      area: 0,
      materialIndex: 0,
      normal: null,
      defaultMaterial: 0,
      projectionCamera: null,
      projectionCameraDistance: Infinity,
      faces: [],
      room: null,
    },
    b: {
      id: 'b',
      area: 0,
      materialIndex: 0,
      normal: null,
      defaultMaterial: 0,
      projectionCamera: null,
      projectionCameraDistance: Infinity,
      faces: [],
      room: null
    }
  };

  this.holes = [];
  this.baseGeometry = null; // Geometry without holes 

  this.corners = {
    start: {
      object: null,
      position: new THREE.Vector3
    },
    end: {
      object: null,
      position: new THREE.Vector3
    }
  };

  this.attached = {
    doors: []
  };

  this.getId = function () {
    return this.wall2D ? this.wall2D.id : this.uuid;
  }

  this.getName = function () {
    this.name = 'Wall_' + this.getId();
    return this.name;
  }

  this.clear = function () {
    while (this.children.length) {
      this.remove(this.children[0]);
    }

    return this;
  }

  this.getAngle = function () {
    if (this.rotation.x > 0) {
      return Math.PI - this.rotation.y; // Todo: check method in other classes
    } else if (this.rotation.x < 0) {
      return Math.PI - this.rotation.y;
    } else if (this.rotation.y < 0) {
      return (Math.PI * 2) + (this.rotation.y % (Math.PI * 2));
    } else {
      return this.rotation.y % (Math.PI * 2);
    }
  }

  this.setViewMode = function (mode) {
    Object.keys(this.attached).forEach(function (attType) {
      const attached = this.attached[attType];
      attached.forEach(function (element) {
        if (typeof(element.setViewMode) === 'function') {
          element.setViewMode(mode);
        }
      });
    }.bind(this));

    return this;
  }

  this.highlight = function () {
    this.setSideFacesMaterialsIndexes('a', 4);
    this.setSideFacesMaterialsIndexes('b', 4);

    return this;
  }

  this.unHighlight = function () {
    this.syncGeometryFacesWithSides();
  }

  this.refreshDebounced = _.debounce(function () {
    this.cutHoles = true;
    this.updateAttached().setFromWall2D(this.wall2D).syncGeometryFacesWithSides();
  }, 500, {leading: false, trailing: true});

  this.refresh = function (forceDebounced) {
    if (this.wall2D) {
      if (forceDebounced || this.hasHoles()) {
        this.cutHoles = false;
        this.refreshDebounced();
      }

      this.updateAttached().setFromWall2D(this.wall2D).syncGeometryFacesWithSides();
    }

    return this;
  }

  this.getCenter = function () {
    return this.center;
  }

  this.getRaycastPoint = function () {
    return this.raycastPoint;
  }

  this.setWidth = function (width, direction) {
    width = parseFloat(width);

    if (!isNaN(width)) {
      if (~[0, null, undefined].indexOf(direction)) {
        this.wall2D.setThickness(width);
        this.wall2D.bearing = this.wall2D.modes.CUSTOM; 
        this.width = width;
      } else if (direction > 0 || direction < 0) {
        // Todo: move corners by vector
      }
    } else {
      console.warn('width of wall need be a number!');
    }

    return this;
  }

  this.setHeight = function (height, isDefaultHeight) {
    height = parseFloat(height);

    if (!isNaN(height)) {
      if (isDefaultHeight) {
        if (this.height === this.defaults.height) {
          this.height = height;
        }
  
        this.defaults.height = height;
      } else {
        this.height = height;
      }
    } else {
      console.warn('Height of wall need be a number!');
    }

    return this;
  }

  this.setCorner = function (corner3D, position) {
    this.corners[position].object = corner3D;
    return this;
  }

  this.getParameters = function () {
    return [new ControlsElement({
        id: this.getId() + '_height',
        label: 'Wall height:',
        type: 'input',
        options: {
          type: 'number'
        },
        value: this.height,
        onChange: function (value) {
          this.setHeight(value).refresh();
        }.bind(this)
      }), new ControlsElement({
        id: this.getId() + '_width',
        label: 'Width height:',
        type: 'input',
        options: {
          type: 'number'
        },
        value: this.width,
        onChange: function (value) {
          this.setWidth(value).refresh();
        }.bind(this)
      })
    ]
  }

  this.getMaterialByFace = function (faceIndex) {
    var side = this.getSideByFace(faceIndex);

    if (side) {
      if (this.sides[side].projectionCamera) {
        return this.sides[side].projectionCamera.getId();
      } else {
        return this.sides[side].defaultMaterial;
      }
    } else {
      return undefined;
    }
  }

  this.getRoomByFace = function (faceIndex) {
    var side = this.getSideByFace(faceIndex);

    if (side && this.sides[side].room) {
      return this.sides[side].room.getId();
    }

    return undefined;
  }

  this.hasHoles = function () {
    return !!this.holes.length;
  }

  this.cutHolesInGeometry = function () {
    if (this.cutHoles) {
      this.holes.forEach(this.makeHole.bind(this));
    }

    this.getSidesFaces();

    return this;
  }

  this.setSideCameraMaterialByFace = function (camera, face) {
    var side = this.getSideByFace(face);

    if (side) {
      this.needRaycast = false;
      this.sides[side].materialIndex = side === 'a' ? 2 : 3;
      this.material[this.sides[side].materialIndex] = camera.shaderMaterial;
      this.sides[side].defaultMaterial = null;
      this.sides[side].projectionCamera = camera;
      this.setSideFacesMaterialsIndexes(side, this.sides[side].materialIndex);
    }

    this.geometry.groupsNeedUpdate = true;

    return this;
  }

  this.setSideDefaultMaterialByFace = function (material, face) {
    var side = this.getSideByFace(face);

    if (side) {
      this.needRaycast = false;
      this.sides[side].materialIndex = material;
      this.sides[side].defaultMaterial = material;
      this.sides[side].projectionCamera = null;
      this.setSideFacesMaterialsIndexes(side, material);
    }

    return this;
  }

  this.getSideByFace = function (face) {
    var side = undefined;

    Object.keys(this.sides).forEach(function (sideLetter) {
      if (~this.sides[sideLetter].faces.indexOf(face)) {
        side = sideLetter;
      }
    }.bind(this));
    
    return side;
  }

  this.setSideFacesMaterialsIndexes = function (side, index) {
    this.sides[side].faces.forEach(function (faceIndex) {
      try {
        this.geometry.faces[faceIndex].materialIndex = index;
      } catch (e) {
        console.warn('Faces not valid!', e);
      }
    }.bind(this));

    this.geometry.groupsNeedUpdate = true;

    return this;
  }

  this.getSidesFaces = function () {
    if (!this.geometryType) {
      return this;
    }

    var sides = {};
    var normalVector = new THREE.Vector3;
    var middlePoint = new THREE.Vector3;
    var tempRotation = this.rotation.y;

    // this.geometry.rotateY(tempRotation);
    this.rotation.y = 0;
    this.geometry.computeFaceNormals();
    this.geometry.computeVertexNormals();

    // get geometry edges 
    this.geometry.faces.forEach(function (face, index) {
      var triangle = new THREE.Triangle(
        this.geometry.vertices[face.a],
        this.geometry.vertices[face.b],
        this.geometry.vertices[face.c]
      );

      triangle.getNormal(normalVector);
      triangle.getMidpoint(middlePoint);

      if (normalVector.y < -0.01) {
        face.materialIndex = 0;
      } else if (normalVector.y > 0.01) {
        face.materialIndex = 1;
      } else {
        face.materialIndex = 0;

        var sideName = 
          _.round(normalVector.x, 1) + '|' + 
          _.round(normalVector.y, 1) + '|' + 
          _.round(normalVector.z, 1);
  
        if (!sides[sideName]) { // Todo: test it when floor is rotated!
          sides[sideName] = {
            area: 0,
            faces: [],
            normal: face.normal.clone(),
            tNormal: normalVector.clone(),
            middlePoint: middlePoint.clone(),
            zDirection: middlePoint.z > 0 ? 1 : -1
          }
        }

        // Debug visualise normals arrows

        // this.add(new THREE.ArrowHelper(
        //   normalVector, 
        //   middlePoint, 
        //   30,
        //   0xffffff,
        //   10,
        //   2.5
        //   )
        // );

        // this.add(new THREE.ArrowHelper(
        //   face.normal, 
        //   middlePoint, 
        //   20,
        //   0xffff00,
        //   10,
        //   2.5
        //   )
        // );

        sides[sideName].id = sideName;
        sides[sideName].area += triangle.getArea();
        sides[sideName].faces.push(index);
      }
    }.bind(this));

    var sortKeys = Object.keys(sides).sort(function(keyA, keyB) {
      if (sides[keyA].area < sides[keyB].area) {
        return 1;
      } else if (sides[keyA].area > sides[keyB].area) {
        return -1;
      } else {
        return 0;
      }
    });

    var sidesKeys = [sortKeys[0], sortKeys[1]].sort(function (keyA, keyB) {
      var faceIndexA = sides[keyA].faces[0] !== undefined ? sides[keyA].faces[0] : Infinity;
      var faceIndexB = sides[keyB].faces[0] !== undefined ? sides[keyB].faces[0] : Infinity;
      
      if (faceIndexA < faceIndexB) {
        return 1;
      } else if (faceIndexA > faceIndexB) {
        return -1;
      } else {
        return 0;
      }
    });

    this.sides.a = Object.assign(this.sides.a, sides[sidesKeys[0]]);
    this.sides.b = Object.assign(this.sides.b, sides[sidesKeys[1]]);

    sortKeys.forEach(function (key, index) {
      if (index > 1) {
        var side = sides[key];

        side.faces.forEach(function (faceIndex) {
          this.geometry.faces[faceIndex].materialIndex = 0;
        }.bind(this));
      }
    }.bind(this));

    this.setSideFacesMaterialsIndexes('a', this.sides.a.materialIndex);
    this.setSideFacesMaterialsIndexes('b', this.sides.b.materialIndex);

    this.rotation.y = tempRotation;

    return this;
  }

  this.syncGeometryFacesWithSides = function () {
    Object.keys(this.sides).forEach(function (sideKey) {
      const side = this.sides[sideKey];
      this.setSideFacesMaterialsIndexes(sideKey, side.materialIndex);
    }.bind(this));

    return this;
  }

  this.setFromWall2D = function (wall2D) {
    this.wall2D = wall2D;
    this.getName();

    this.height = this.wall2D.height || this.height;
    this.length = this.wall2D.getLength();
    this.width = this.wall2D.getWidth();

    var boxCorners = {
      start: new THREE.Vector3(
        this.wall2D.getStartX(),
        0,
        this.wall2D.getStartY()
      ),
      end: new THREE.Vector3(
        this.wall2D.getEndX(),
        0,
        this.wall2D.getEndY()
      )
    };

    if (boxCorners.start.x === boxCorners.end.x && boxCorners.start.z === boxCorners.end.z) { // faceless geometry
      console.warn('Wall is has zero length!', this);
      return this;
    }

    this.coordinates.set(
      boxCorners.end.x - boxCorners.start.x,
      this.height,
      boxCorners.end.z - boxCorners.start.z
    );

    this.center.set(
      (boxCorners.end.x + boxCorners.start.x) / 2,
      0,
      (boxCorners.end.z + boxCorners.start.z) / 2
    );

    this.corners.start.position.x = -this.length / 2;
    this.corners.end.position.x = this.length / 2;

    this.position.copy(this.center);
    this.rotation.y = -Math.atan2(this.coordinates.z, this.coordinates.x);

    this.raycastPoint.copy(this.center);
    this.raycastPoint.y = this.height - 1; 

    var edge = this.wall2D.frontEdge || this.wall2D.backEdge;
    if (!edge || this.forceBoxBeometry) {
      this.geometryType = 'box';
      console.warn('Wall2D not has edges.', this.wall2D); 

      this.geometry = new THREE.BoxGeometry(this.length, this.height, this.width);
    } else {
      this.geometryType = 'shape';
      var corners = edge.corners();

      var shape = new THREE.Shape();
      for (var i = 0; i < corners.length; i++) {
        if (i === 0) {
          shape.moveTo(corners[i].x, -corners[i].y);
        } else {
          shape.lineTo(corners[i].x, -corners[i].y);
        }
      }

      var extrudeSettings = {
          steps: 1,
          depth: this.height,
          bevelEnabled: false
      };

      this.geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      this.geometry.rotateX(-Math.PI / 2);
      this.geometry.translate(-this.center.x, -this.center.y, -this.center.z);
      this.geometry.rotateY(-this.rotation.y);
    }

    this.saveBaseGeometry(true).cutHolesInGeometry();
    return this;
  }

  this.setRooms = function (rooms2D) {
    this.rooms = [];

    if (Array.isArray(rooms2D)) {
      rooms2D.forEach(function (room2D) {
        this.rooms.push(_.camelCase(room2D.roomName));
      }.bind(this));
    }

    return this;
  }

  this.saveBaseGeometry = function (force) {
    if (!this.baseGeometry || force) {
      this.baseGeometry = _.cloneDeep(this.geometry)//.clone();
    }

    return this;
  }

  this.updateAttached = function () {
    Object.keys(this.attached).forEach(function (attType) {
      const attached = this.attached[attType];
      attached.forEach(function (element) {
        if (typeof(element.refresh) === 'function') {
          element.refresh();
        }
      });
    }.bind(this));

    return this;
  }

  this.addDoor = function (door) {
    var alreadyAttached = this.attached.doors.find(function (attachedDoor) {
      return attachedDoor.getId() === door.getId();
    });

    if (!alreadyAttached) {
      this.attached.doors.push(door);
      this.add(door);
  
      this.updateMatrixWorld();

      if (door.getOpened()) {
        this.addHole(door);
      }
    }

    return this;
  }

  this.detachElements = function () {
    Object.keys(this.attached).forEach(function (type) {
      this.attached[type].forEach(function (element) {
        this.remove(element);
      }.bind(this));
    }.bind(this));

    return this;
  }

  this.attachElements = function () {
    Object.keys(this.attached).forEach(function (type) {
      this.attached[type].forEach(function (element) {
        if (!~this.children.indexOf(element)) {
          this.add(element);
        }
      }.bind(this));
    }.bind(this));

    return this;
  }

  this.addHole = function (hole) {
    if (!~this.holes.indexOf(hole)) {
      this.holes.push(hole);
    }

    return this;
  }

  this.makeHole = function (hole) {
    this.addHole(hole);

    if (this.geometryType) {
      var savedPostion = this.position.clone();
      var savedRotation = this.rotation.clone();
      
      this.position.set(0, 0, 0);
      this.rotation.set(0, 0, 0);

      var base = new ThreeBSP(this);
      var cutting = new ThreeBSP(hole);
  
      var newGeometry = base.subtract(cutting).toGeometry();
      newGeometry.computeVertexNormals();
      this.geometry = newGeometry;

      this.position.copy(savedPostion);
      this.rotation.copy(savedRotation);
    } 

    return this;
  }

  this.setDefault = function (key, value) {
    if (key === 'height') {
      this.setHeight(value, true);
    } else {
      this.defaults[key] = value;
    }

    return this;
  }

  this.setClosestCameraByFace = function (face, camera, distance) {
    var side = this.getSideByFace(face);

    if (side) {
      this.sides[side].projectionCamera = camera;
      this.sides[side].projectionCameraDistance = distance;
    }

    return this;
  }

  this.getClosestCameraDistanceByFace = function (face) {
    var side = this.getSideByFace(face);

    if (side) {
      return this.sides[side].projectionCameraDistance;
    }

    return -1;
  }

  this.getCloneWithoutHoles = function () {
    if (this.holes.length > 0) {
      var clone = this.clone();
      clone.clear();
      clone.geometry = this.baseGeometry;
      clone.name = this.getName() + '_WithoutHoles';
      return clone;
    } else {
      return undefined;
    }
  }

  this.getArrowsFromDoors = function () {
    var arrows = [];

    this.attached.doors.forEach(function (door) {
      arrows.push.apply(arrows, door.getArrows());
    });

    return arrows;
  }

  this.prepareForExport = function () {
    this.attached.doors.forEach(function (door3D) {
      door3D.prepareForExport();
    }.bind(this));

    return this;
  }

  this.resetExportPrepared = function () {
    this.attached.doors.forEach(function (door3D) {
      door3D.resetExportPrepared();
    }.bind(this));

    return this;
  }

  this.repairMaterials = function () {
    Object.keys(this.sides).forEach(function (sideKey) {
      const side = this.sides[sideKey];

      if (side.projectionCamera) {
        var material = this.material[side.materialIndex];
        var cameraMaterial = side.projectionCamera.shaderMaterial;
        if (material !== cameraMaterial) {
          this.setSideCameraMaterialByFace(side.projectionCamera, side.faces[0]);
        }
      }
    }.bind(this));

    return this;
  }

  this.setStructure = function (floor3D, structure) {
    this.setHeight(structure.height).refresh();

    Object.keys(structure.sides).forEach(function (sideKey) {
      var facesEqual = _.isEqual(this.sides[sideKey].faces, structure.sides[sideKey].faces);

      if (facesEqual) {
        this.needRaycast = false;
      } else {
        this.needRaycast = true;
        structure.sides[sideKey].faces = this.sides[sideKey].faces; // Set faces to founded
      }

      Object.assign(this.sides[sideKey], structure.sides[sideKey]);

      if (this.sides[sideKey].projectionCamera) {
        var camera3D = floor3D.findInGroup('cameras', function (camera) {
          return camera.getId() === this.sides[sideKey].projectionCamera;
        }.bind(this));

        if (camera3D !== undefined && camera3D.shaderMaterial) {
          this.setSideCameraMaterialByFace(camera3D, this.sides[sideKey].faces[0]);
        } else {
          this.setSideDefaultMaterialByFace(0, this.sides[sideKey].faces[0]);
        }
      } else if (!isNaN(parseInt(this.sides[sideKey].defaultMaterial))) {
        this.setSideDefaultMaterialByFace(this.sides[sideKey].defaultMaterial, this.sides[sideKey].faces[0]);
      }
    }.bind(this));

    return this;
  }

  this.getStructure = function () {
    var structure = {
      id: this.getId(),
      name: this.getName(),
      height: this.height,
      length: this.length,
      width: this.width,
      position: this.position,
      rotation: this.getAngle(),
      rooms: this.rooms,
      sides: {}
    };

    Object.keys(this.sides).forEach(function (sideKey) {
      structure.sides[sideKey] = _.clone(this.sides[sideKey]);

      if (structure.sides[sideKey].projectionCamera) {
        structure.sides[sideKey].projectionCamera = structure.sides[sideKey].projectionCamera.getId();
      }

      if (structure.sides[sideKey].room) {
        structure.sides[sideKey].room = structure.sides[sideKey].room.getId()
      }
    }.bind(this));

    return structure;
  }

  this.onTransform = function () {
    this.rotation.set(0, this.getAngle(), 0);

    var localPosition = new THREE.Vector3;
    var worldPosition = new THREE.Vector3;

    this.updateMatrixWorld();

    Object.keys(this.corners).forEach(function (cKey) {
      localPosition.copy(this.corners[cKey].position);
      this.localToWorld(localPosition);
      worldPosition.copy(localPosition);
      this.parent.worldToLocal(worldPosition);
      
      var cornerY = this.corners[cKey].object.position.y;

      this.corners[cKey].object.position.copy(worldPosition);
      this.corners[cKey].object.onTransform([this]);
      this.corners[cKey].object.position.y = cornerY;
    }.bind(this));

    this.refresh(true);
  }
}

Wall3D.prototype = Object.create(THREE.Mesh.prototype);
Wall3D.prototype.constructor = Wall3D;