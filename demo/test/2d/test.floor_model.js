var chai = require("chai");
var assert = chai.assert;
var jsdom = require('jsdom');
global.THREE = require('three');
var FileAPI = require('file-api'), File = FileAPI.File;
var FileReader = require('filereader');

require('jsdom-global')();
global.window = window;
global.document = document;
$ = global.$ = global.jQuery = require('jquery');

global.Utils = require("../../capture-prototype/js/src/2d/models/utils.js");
global.dataHandling = require("../../capture-prototype/js/src/common/data-handling.js");
window.dataHandling = global.dataHandling;
global.Line = require("../../capture-prototype/js/src/2d/models/line.js");
global.Wall = require("../../capture-prototype/js/src/2d/models/wall.js");
global.Dot = require("../../capture-prototype/js/src/2d/models/dot.js");
global.Corner = require("../../capture-prototype/js/src/2d/models/corner.js");
global.Room = require("../../capture-prototype/js/src/2d/models/room.js");
global.Joint = require("../../capture-prototype/js/src/2d/models/joint.js");
global.HalfEdge = require("../../capture-prototype/js/src/2d/models/halfedge.js");
global.Placement = require("../../capture-prototype/js/src/2d/models/placement.js");
global.FloorHoverable = require("../../capture-prototype/js/src/2d/models/floor_hoverable.js");
global.Compass = require("../../capture-prototype/js/src/2d/models/compass.js");
var FloorModel = require("../../capture-prototype/js/src/2d/models/floor_model.js");

describe("getBoundingBox", function() {
    it("should return a object with width and height", function() {
        var floormodel = new FloorModel();
        floormodel.corners = [
            new Corner(null, -50, -100),
            new Corner(null, 100, -100),
            new Corner(null, 100, 100),
            new Corner(null, -100, 100)
        ];
        floormodel.walls = [
            new Wall(floormodel.corners[0], floormodel.corners[1]),
            new Wall(floormodel.corners[1], floormodel.corners[2]),
            new Wall(floormodel.corners[2], floormodel.corners[3]),
            new Wall(floormodel.corners[3], floormodel.corners[0])
        ];
        var box = floormodel.getBoundingBox();
        assert.equal(box.width, 200);
        assert.equal(box.height, 200);
    });
});

describe("transform", function() {
    var floormodel = new FloorModel();
    floormodel.corners = [
        new Corner(null, -50, -100),
        new Corner(null, 100, -100),
        new Corner(null, 100, 100),
        new Corner(null, -50, 100)
    ];
    it("should still have 4 corners after rotating", function() {
        floormodel.transform(-Math.PI / 2);
        assert.equal(floormodel.corners.length, 4);
    });
    it("should rotate rectangle by -90deg", function() {
        floormodel.transform(-Math.PI / 2);
        assert.equal(floormodel.corners[0].x, -50);
        assert.equal(floormodel.corners[0].y, -100);
        assert.equal(floormodel.corners[1].x, 100);
        assert.equal(floormodel.corners[1].y, -100);
    });
});

describe("current state", function() {
    var floormodel = new FloorModel();
    it("should return object with empty arrays", function() {
        var state = floormodel.getCurrentState();
        assert.isObject(state);
        state.compass = {}; //do not check compass
        assert.deepEqual(state, {
            "walls": [],
            "corners": [],
            "rooms": [],
            "doors": [],
            "windows": [],
            "cameras": [],
            "embeds": [],
            "lines": [],
            "settings": null,
            "placements": {},
            "compass": {}
        });
    });
    var floormodel2 = new FloorModel();
    floormodel2.corners = [
        new Corner(floormodel2, -50, -100),
        new Corner(floormodel2, 100, -100),
        new Corner(floormodel2, 100, 100),
        new Corner(floormodel2, -50, 100)
    ];
    floormodel2.walls = [
        new Wall(floormodel2.corners[0], floormodel2.corners[1]),
        new Wall(floormodel2.corners[1], floormodel2.corners[2]),
        new Wall(floormodel2.corners[2], floormodel2.corners[3]),
        new Wall(floormodel2.corners[3], floormodel2.corners[0])
    ];
    it("should return object with current state", function() {
        var state = floormodel2.getCurrentState();
        assert.isObject(state);
        assert.isNotEmpty(state);
        assert.isNotEmpty(state["corners"]);
        assert.isNotEmpty(state["walls"]);
    });
});

describe("cleanPlacements", function() {
    var floormodel = new FloorModel();
    for (var i=0; i<10; i++) {
        var corner1 = new Corner(floormodel, i, i, i+"1");
        var corner2 = new Corner(floormodel, i, i+1, i+"2");
        var corner3 = new Corner(floormodel, i+1, i, i+"3");
        floormodel.corners.push(corner1);
        floormodel.corners.push(corner2);
        floormodel.corners.push(corner3);
        var wall1 = new Wall(corner1, corner2);
        var wall2 = new Wall(corner2, corner3);
        var wall3 = new Wall(corner3, corner1);
        floormodel.walls.push(wall1);
        floormodel.walls.push(wall2);
        floormodel.walls.push(wall3);
    }
    floormodel.update();
    for (var k=0; k<15; k++) floormodel.placements["room"+k] = new Placement("room"+k);
    //floormodel.update();

    it("should clean placements such way that it matches an amount of rooms", function() {
        floormodel.cleanPlacements();
        assert.equal(floormodel.rooms.length, Object.keys(floormodel.placements).length);
    });
});

/*describe("json loader", function() {
    var floormodel = new FloorModel();
    var reader = new FileReader();
    reader.addEventListener("load", function(e) {
        floormodel.loadJSON(e.target.result);

        it("should resolve dependencies when loaded", function() {
            floormodel.getWalls().forEach(function (wall) {
                console.log(1)
                var corner1 = wall.getStart();
                var corner2 = wall.getEnd();
                var neighbourWalls = [].concat(corner1.wallStarts, corner1.wallEnds, corner2.wallStarts, corner2.wallEnds);
                neighbourWalls.forEach(function (wallNeighbour) {
                    console.log(wallNeighbour.getStart());
                    if (wallNeighbour !== wall) _this.drawLabel(wallNeighbour.getCenter(), (wallNeighbour.getLength() / 100).toFixed(2)+"m");
                });
            });
            assert.equal(1,1);
        });
    });
    reader.readAsText(new File('test/2d/floorplan.json'));
});*/