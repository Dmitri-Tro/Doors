global.THREE = require('three');
var chai = require("chai");
var assert = chai.assert;

require('jsdom-global')();
global.window = window;
global.document = document;
$ = global.$ = global.jQuery = require('jquery');

global.Utils = require("../../capture-prototype/js/src/2d/models/utils.js");
global.window.dataHandling = global.dataHandling = require("../../capture-prototype/js/src/common/data-handling.js");
global.Door = require("../../capture-prototype/js/src/2d/models/door.js");
global.Placement = require("../../capture-prototype/js/src/2d/models/placement.js");
global.Room = require("../../capture-prototype/js/src/2d/models/room.js");
global.Line = require("../../capture-prototype/js/src/2d/models/line.js");
global.Wall = require("../../capture-prototype/js/src/2d/models/wall.js");
global.Dot = require("../../capture-prototype/js/src/2d/models/dot.js");
global.Corner = require("../../capture-prototype/js/src/2d/models/corner.js");
global.HalfEdge = require("../../capture-prototype/js/src/2d/models/halfedge.js");
global.FloorHoverable = require("../../capture-prototype/js/src/2d/models/floor_hoverable.js");
global.Compass = require("../../capture-prototype/js/src/2d/models/compass.js");
var FloorModel = require("../../capture-prototype/js/src/2d/models/floor_model.js");

describe("getWidth", function() {
    it ("should return a door width", function() {
        var example = new Door(0, 1, 2, 1);
        assert.equal(example.getWidth(), 2);
    });
});

describe("setWidth", function() {
    it ("should set correct corners of a door on a line when change width with setWidth", function() {
        var wall1 = new Wall(new Corner(null, -50, 1), new Corner(null, 100, 1));
        var door1 = new Door(0, 1, 2, 1, [wall1]);
        door1.setWidth(Math.random() * door1.minWallWidth); //doesn't set because < minWallWidth
        assert.equal(Math.round(door1.getWidth() * 1000) / 1000, 2);

        var door2 = new Door(0, 1, 2, 1, [wall1]);
        door2.setWidth(100);
        assert.equal(Math.round(door2.getWidth() * 1000) / 1000, 100);
        door2.setWidth(40, "end");
        assert.equal(Math.round(door2.getWidth() * 1000) / 1000, 40);
    });
});

describe("divide", function() {
    var floormodel = new FloorModel();
    floormodel.corners = [
        new Corner(floormodel, -50, -100),
        new Corner(floormodel, 100, -100),
        new Corner(floormodel, 100, 100),
        new Corner(floormodel, -100, 100)
    ];
    floormodel.walls = [
        new Wall(floormodel.corners[0], floormodel.corners[1]),
        new Wall(floormodel.corners[1], floormodel.corners[2]),
        new Wall(floormodel.corners[2], floormodel.corners[3]),
        new Wall(floormodel.corners[3], floormodel.corners[0])
    ];
    floormodel.doors = [
        new Door(0, -100, 50, -100, floormodel.walls)
    ];

    it ("should divide wall into 2 parts", function() {
        floormodel.walls[0].divide(70, -100, floormodel);
        assert.equal(floormodel.walls.length, 5);
    });

    it ("should correctly handle doors and windows on divided wall. Door must be still on a wall", function() {
        var isRealWall = false;
        floormodel.walls.forEach(function(wall) {
            if (floormodel.doors[0].wall.getStartX() === wall.getStartX() &&
                floormodel.doors[0].wall.getStartY() === wall.getStartY() &&
                floormodel.doors[0].wall.getEndX() === wall.getEndX() &&
                floormodel.doors[0].wall.getEndY() === wall.getEndY()) {
                isRealWall = true;
            }
        });
        assert.isTrue(isRealWall);
    });
});

/*describe("assignWall", function() {
    it ("should return a success or failure", function() {
        var example = new Door(0, 1, 2, 1);
        console.log(Door)
        console.log(Wall)
        console.log(Corner)
        var wallList = [new Wall(new Corner(null, -1, 1, undefined), new Corner(null, 2, 1, undefined))];
        assert.equal(example.assignWall(wallList), true);

        var example2 = new Door(0, 1, 2, 1);
        var wallList2 = [new Wall(new Corner(null, 0, 1), new Corner(null, 2, 1))];
        assert.equal(example2.assignWall(wallList2), false);
    });
});*/