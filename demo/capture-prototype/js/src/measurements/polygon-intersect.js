/**
 * Get polygons intersection
 * https://github.com/vrd/js-intersect
 * @class
 */
const PolygonIntersect = {
  intersect: function (fig1, fig2) {
    if (!this.checkPolygons(fig1, fig2)) {
      return false;
    }
    var arEdges = this.edgify(fig1, fig2), edges = arEdges[0], points = arEdges[1];
    var polygons = this.polygonate(edges, points);
    var filteredPolygons = this.filterPolygons(polygons, fig1, fig2, "intersect");
    return filteredPolygons;
  },
  
  //check polygons for correctness
  checkPolygons: function (fig1, fig2) {
    var figs = [fig1, fig2];
    for (var i = 0; i < figs.length; i++) {
      if (figs[i].length < 3) {
        console.error("Polygon " + (i+1) + " is invalid!");
        return false; 
      } 
    }
    return true;  
  },
  
  //create array of edges of all polygons
  edgify: function (fig1, fig2) {
    //create primary array from all edges
    var primEdges = this.getEdges(fig1).concat(this.getEdges(fig2));
    var secEdges = [];
    var interPoints;
    var allPoints = [];
    var points;
    var point;
    var p;
    var edge;
    //check every edge
    for(var i = 0; i < primEdges.length; i++) {
      points = [];
      //for intersection with every edge except itself
      for(var j = 0; j < primEdges.length; j++) {
        if (i == j) continue;
        interPoints = this.findEdgeIntersection(primEdges[i], primEdges[j]);
        //if intersections found (array but not false returned)
        if (interPoints) {
          //check for uniqueness
          for (var k = 0; k < interPoints.length; k++) {
            if (!this.pointExists(interPoints[k], points)) {
              //and push to array
              points.push(interPoints[k]);
            }
          }                   
        }
      }
      p = primEdges[i][0];
      p.t = 0;
      points.push(p);
      p = primEdges[i][1];
      p.t = 1;
      points.push(p);
      //sort all points by position on edge
      points = this.sortPoints(points);
      //break edge to parts
      for (var k = 0; k < points.length - 1; k++) {
        edge = [
          { x: points[k].x, y: points[k].y },
          { x: points[k+1].x, y: points[k+1].y}
        ];
        // check for existanse in sec.array
        if (!this.edgeExists(edge, secEdges)) {
          //push if not exists
          secEdges.push(edge);
        }          
      }
      //save points
      for (k = 0; k < points.length; k++) {
        point = {x: points[k].x, y: points[k].y};
        // check for existanse in allPoints array
        if (!this.pointExists(point, allPoints)) {
          //push if not exists
          allPoints.push(point);
        }          
      }    
    }
    //console.log("edgify: " + JSON.stringify([secEdges, allPoints]));
    return [secEdges, allPoints];
  },
  
  sortPoints: function (points) {
    var p = points;
    p.sort(function(a,b) {
      if (a.t > b.t) return 1;
      if (a.t < b.t) return -1;
    });
    return p;
  },
  
  getEdges: function (fig) {
    var edges = [];
    var len = fig.length;
    for (var i = 0; i < len; i++) {
      edges.push([{x: fig[(i % len)].x, y: fig[(i % len)].y}, {x: fig[((i+1) % len)].x,
        y: fig[((i+1) % len)].y}]);
    }
    return edges;
  },
  
  findEdgeIntersection: function (edge1, edge2) {
    var x1 = edge1[0].x;
    var x2 = edge1[1].x;
    var x3 = edge2[0].x;
    var x4 = edge2[1].x;
    var y1 = edge1[0].y;
    var y2 = edge1[1].y;
    var y3 = edge2[0].y;
    var y4 = edge2[1].y;
    var nom1 = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
    var nom2 = (x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3);
    var denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    var t1 = nom1 / denom;
    var t2 = nom2 / denom;
    var interPoints = [];
    var x, y;
    //1. lines are parallel or edges don't intersect 
    if (((denom === 0) && (nom1 !== 0)) || (t1 <= 0) || (t1 >= 1) || 
        (t2 < 0 ) || (t2 > 1)) {
      return false;
    //2. lines are collinear  
    } else if ((nom1 === 0) && (denom === 0)) {
      //check if endpoints of edge2 lies on edge1
      for (var i = 0; i < 2; i++) {
        var classify = this.classifyPoint(edge2[i], edge1);
        //find position of this endpoints relatively to edge1
        if (classify.loc == "BETWEEN") {
          x = +((x1 + classify.t*(x2 - x1)).toPrecision(10));
          y = +((y1 + classify.t*(y2 - y1)).toPrecision(10));
          interPoints.push({x: x, y: y, t: classify.t});
        }
      }
      //return positions of endpoints
      if (interPoints.length > 0) {
        return interPoints;  
      } else {
        return false;
      }       
    //3. edges intersect
    } else {
      x = +((x1 + t1*(x2 - x1)).toPrecision(10));
      y = +((y1 + t1*(y2 - y1)).toPrecision(10))
      interPoints.push({x: x, y: y, t: t1});
      return interPoints;
    }
  },
  
  classifyPoint: function (p, edge) {
    var ax = edge[1].x - edge[0].x;
    var ay = edge[1].y - edge[0].y;
    var bx = p.x - edge[0].x;
    var by = p.y - edge[0].y;
    var sa = ax * by - bx * ay;
    if ((p.x === edge[0].x) && (p.y === edge[0].y)) {
      return {loc: "ORIGIN"};
    }
    if ((p.x === edge[1].x) && (p.y === edge[1].y)) {
      return {loc: "DESTINATION"};
    }
    var theta = (this.polarAngle([edge[1], edge[0]]) - 
      this.polarAngle([{x: edge[1].x, y: edge[1].y}, {x: p.x, y: p.y}])) % 360;
    if (theta < 0) {
      theta = theta + 360;
    } 
    if (sa < -0.0000000001) {    
      return {loc: "LEFT", theta: theta};
    }
    if (sa > 0.00000000001) {    
      return {loc: "RIGHT", theta: theta};
    }
    if (((ax * bx) < 0) || ((ay * by) < 0)) {
      return {loc: "BEHIND", theta: 0};
    }
    if ((Math.sqrt(ax * ax + ay * ay)) < (Math.sqrt(bx * bx + by * by))) {
      return {loc: "BEYOND", theta: 180};
    }
    var t;
    if (ax !== 0) {
      t = bx/ax;
    } else {
      t = by/ay;
    }
    return {loc: "BETWEEN", t: t};
  },
  
  polarAngle: function (edge) {
    var dx = edge[1].x - edge[0].x;
    var dy = edge[1].y - edge[0].y;
    if ((dx === 0) && (dy === 0)) {
      //console.error("Edge has zero length.");
      return false;
    }
    if (dx === 0) {
      return ((dy > 0) ? 90 : 270);
    }
    if (dy === 0) {
      return ((dx > 0) ? 0 : 180);
    }
    var theta = Math.atan(dy/dx)*360/(2*Math.PI);
    if (dx > 0) {
      return ((dy >= 0) ? theta : theta + 360);
    } else {
      return (theta + 180);
    }
  },
   
  pointExists: function (p, points) {
    if (points.length === 0) {
      return false;
    }
    for (var i = 0; i < points.length; i++) {
      if ((p.x === points[i].x) && (p.y === points[i].y)) {
        return true;
      }
    }
    return false;
  },
  
  edgeExists: function (e, edges) {
    if (edges.length === 0) {
      return false;
    }
    for (var i = 0; i < edges.length; i++) {
      if (this.equalEdges(e, edges[i]))
        return true;
    }
    return false;
  },
  
  equalEdges: function (edge1, edge2) {
    if (((edge1[0].x === edge2[0].x) &&
        (edge1[0].y === edge2[0].y) &&
        (edge1[1].x === edge2[1].x) &&
        (edge1[1].y === edge2[1].y)) || (
        (edge1[0].x === edge2[1].x) &&
        (edge1[0].y === edge2[1].y) &&
        (edge1[1].x === edge2[0].x) &&
        (edge1[1].y === edge2[0].y))) {
      return true;
    } else {
      return false;
    }
  },
   
  polygonate: function (edges, points) {
    var polygons = [];
    var polygon = [];
    var len = edges.length;
    var allPoints = points;
    var midpoints = this.getMidpoints(edges);
    //start from every edge and create non-selfintersecting polygons
    for (var i = 0; i < len - 2; i++) {
      var org = {x: edges[i][0].x, y: edges[i][0].y};    
      var dest = {x: edges[i][1].x, y: edges[i][1].y};
      var currentEdge = i;
      var point;
      var p;
      var direction;
      var stop;
      //while we havn't come to the starting edge again
      for (direction = 0; direction < 2; direction++) {
        polygon = [];
        stop = false;
        while ((polygon.length === 0) || (!stop)) {
        //add point to polygon
          polygon.push({x: org.x, y: org.y});
          point = undefined;
          //look for edge connected with end of current edge
          for (var j = 0; j < len; j++) {
            p = undefined;
            //except itself
            if (!this.equalEdges(edges[j], edges[currentEdge])) {
              //if some edge is connected to current edge in one endpoint
              if ((edges[j][0].x === dest.x) && (edges[j][0].y === dest.y)) {
                p = edges[j][1];
              }
              if ((edges[j][1].x === dest.x) && (edges[j][1].y === dest.y)) {
                p = edges[j][0];
              }
              //compare it with last found connected edge for minimum angle between itself and current edge 
              if (p) {
                var classify = this.classifyPoint(p, [org, dest]);
                //if this edge has smaller theta then last found edge update data of next edge of polygon
                if (!point || 
                    ((classify.theta < point.theta) && (direction === 0)) ||
                    ((classify.theta > point.theta) && (direction === 1))) {
                  point = {x: p.x, y: p.y, theta: classify.theta, edge: j};
                }
              }
            }
          }
          //change current edge to next edge
          org.x = dest.x;
          org.y = dest.y;
          dest.x = point.x;
          dest.y = point.y;
          currentEdge = point.edge;
          //if we reach start edge
          if ((org.x == edges[i][0].x) &&
              (org.y == edges[i][0].y) &&
              (dest.x == edges[i][1].x) &&
              (dest.y == edges[i][1].y)) {
            stop = true;
            //check polygon for correctness
            /*for (var k = 0; k < allPoints.length; k++) {
              //if some point is inside polygon it is incorrect
              if ((!pointExists(allPoints[k], polygon)) && (findPointInsidePolygon(allPoints[k], polygon))) {
                polygon = false;
              }
            }*/
            for (k = 0; k < midpoints.length; k++) {
              //if some midpoint is inside polygon (edge inside polygon) it is incorrect
              if (this.findPointInsidePolygon(midpoints[k], polygon)) {
                polygon = false;
              }
            }
          }   
        }
        //add created polygon if it is correct and was not found before
        if (polygon && !this.polygonExists(polygon, polygons)) {
          polygons.push(polygon);
        }
      }    
    }
    //console.log("polygonate: " + JSON.stringify(polygons));
    return polygons;
  },
  
  polygonExists: function (polygon, polygons) {
    //if array is empty element doesn't exist in it
    if (polygons.length === 0) return false;
    //check every polygon in array
    for (var i = 0; i < polygons.length; i++) {
      //if lengths are not same go to next element
      if (polygon.length !== polygons[i].length) continue;
      //if length are same need to check
      else {
        //if all the points are same
        for (var j = 0; j < polygon.length; j++) {
          //if point is not found break forloop and go to next element
          if (!this.pointExists(polygon[j], polygons[i])) break;
          //if point found
          else {
            //and it is last point in polygon we found polygon in array!
            if (j === polygon.length - 1) return true;
          }        
        }
      }
    }
    return false;
  },
  
  filterPolygons: function (polygons, fig1, fig2, mode) {
    var filtered = [];
    var c1, c2;
    var point;
    var bigPolygons = this.removeSmallPolygons(polygons, 0.0001);
    for(var i = 0; i < bigPolygons.length; i++) {
      point = this.getPointInsidePolygon(bigPolygons[i]);
      c1 = this.findPointInsidePolygon(point, fig1);
      c2 = this.findPointInsidePolygon(point, fig2);
      if (
          ((mode === "intersect") && c1 && c2) || //intersection
          ((mode === "cut1") && c1 && !c2) ||     //fig1 - fig2
          ((mode === "cut2") && !c1 && c2) ||     //fig2 - fig2
          ((mode === "sum") && (c1 || c2))) {     //fig1 + fig2      
        filtered.push(bigPolygons[i]);
      }
    }
    //console.log("filtered: " + JSON.stringify(filtered));
    return filtered;
  },
  
  removeSmallPolygons: function (polygons, minSize) {
    var big = [];
    for (var i = 0; i < polygons.length; i++) {
      if (this.polygonArea(polygons[i]) >= minSize) {
        big.push(polygons[i]);
      }
    }
    return big;
  },
  
  polygonArea: function (p) {
    var len = p.length;
    var s = 0;
    for (var i = 0; i < len; i++) {
       s += Math.abs((p[i % len].x * p[(i + 1) % len].y) - (p[i % len].y * 
        p[(i + 1) % len].x));
    }
    return s/2;
  },
  
  getPointInsidePolygon: function (polygon) {
    var point;
    var size = this.getSize(polygon);
    var edges = this.getEdges(polygon);
    var y = (size.y.max + size.y.min) / 2;
    var dy = (size.y.max - size.y.min) / 17;
    var line = [];
    var points;
    var interPoints = [];
    var pointsOK = false;
    while (!pointsOK) {
      line = [{x: (size.x.min - 1), y: y},{x: (size.x.max + 1), y: y}];
      //find intersections with all polygon edges
      for (var i = 0; i < edges.length; i++) {
        points = this.findEdgeIntersection(line, edges[i]);
        //if edge doesn't lie inside line
        if (points && (points.length === 1)) {
           interPoints.push(points[0]);      
        }
      }
      interPoints = this.sortPoints(interPoints);
      //find two correct interpoints
      for (var i = 0; i < interPoints.length - 1; i++) {
        if (interPoints[i].t !== interPoints[i+1].t) {
          //enable exit from loop and calculate point coordinates
          pointsOK = true;
          point = {x: ((interPoints[i].x + interPoints[i+1].x) / 2), y: y};
        }
      }
      //all points are incorrect, need to change line parameters
      y = y + dy;
      if (((y > size.y.max) || (y < size.y.min)) && (pointsOK === false)) {
        pointsOK = true;
        point = undefined;
      }
    }
    return point;
  },
  
  getSize: function (polygon) {
    var size = {
      x: {
        min: polygon[0].x,
        max: polygon[0].x
      },
      y: {
        min: polygon[0].y,
        max: polygon[0].y
      }
    };
    for (var i = 1; i < polygon.length; i++) {
      if (polygon[i].x < size.x.min) size.x.min = polygon[i].x;
      if (polygon[i].x > size.x.max) size.x.max = polygon[i].x;
      if (polygon[i].y < size.y.min) size.y.min = polygon[i].y;
      if (polygon[i].y > size.y.max) size.y.max = polygon[i].y;
    }
    return size;
  },
  
  findPointInsidePolygon: function (point, polygon) {
    var cross = 0;
    var edges = this.getEdges(polygon);
    var classify;
    var org, dest;
    for (var i = 0; i < edges.length; i++) {
      [org, dest] = edges[i];
      classify = this.classifyPoint(point, [org, dest]);
      if (  (
              (classify.loc === "RIGHT") &&
              (org.y < point.y) &&
              (dest.y >= point.y)
            ) ||
            (
              (classify.loc === "LEFT") &&
              (org.y >= point.y) &&
              (dest.y < point.y)
            )
          ) {
        cross++;    
      }
      if (classify.loc === "BETWEEN") return false;
    }
    if (cross % 2) {
      return true;
    } else {
      return false;
    }
  },
  
  getMidpoints: function (edges) {
    var midpoints = [];
    var x, y;
    for (var i = 0; i < edges.length; i++) {
      x = (edges[i][0].x + edges[i][1].x) / 2;
      y = (edges[i][0].y + edges[i][1].y) / 2;
      midpoints.push({x: x, y: y}); 
    }
    return midpoints;
  },
    
  log: function (obj) {
    console.log(JSON.stringify(obj));
  }
}

if ( typeof exports !== 'undefined' ) module.exports = PolygonIntersect;