const FloorCutPlane3D = function () {
  THREE.Mesh.call(this);

  this.transformConfig = new TransformConfig('', '', '', 'local');

  this.geometry = new THREE.PlaneGeometry(100000, 100000);
  this.material = new THREE.MeshBasicMaterial({transparent: true, opacity: 0});

  this.visible = false;

  this.rotation.x -= Math.PI / 2;
  this.position.y += 1;
}

FloorCutPlane3D.prototype = Object.create(THREE.Mesh.prototype);
FloorCutPlane3D.prototype.constructor = FloorCutPlane3D;