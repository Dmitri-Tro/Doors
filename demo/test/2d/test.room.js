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
global.Joint = require("../../capture-prototype/js/src/2d/models/joint.js");
global.HalfEdge = require("../../capture-prototype/js/src/2d/models/halfedge.js");
global.FloorHoverable = require("../../capture-prototype/js/src/2d/models/floor_hoverable.js");
global.Compass = require("../../capture-prototype/js/src/2d/models/compass.js");
var FloorModel = require("../../capture-prototype/js/src/2d/models/floor_model.js");

//some polygon
/*
________
\       |
 \      |
  \_____|
 */
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

var newRoom = new Room(floormodel, floormodel.corners);
floormodel.rooms.push(newRoom);

describe("getSquare", function() {
    it ("should return correct square", function() {
        assert.equal(newRoom.getSquareFormatted(), 2.96); //now square is calculated using inner lines of walls
    });
});

/*describe("getDimensions", function() {
    it ("should return array with 2 vector lengths", function() {
        assert.equal(newRoom.getDimensions().length, 2);
    });
});*/