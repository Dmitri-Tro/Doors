var chai = require("chai");
var assert = chai.assert;
var utils = require("../../capture-prototype/js/src/2d/models/utils.js");
describe("guid", function() {
    it("should return a valid guid", function() {
        assert.lengthOf(utils.guid(), 8+1+4+1+4+1+4+1+12);
    });
});