/*
 * Generic point/vector math. Points and vectors are just objects with coordinates x,y,z.
 * The idea is to ensure interoperability with other libraries defining points and vectors
 * by defining function makeVector before including this module.
 */


if (typeof makeVector == 'undefined') {
    // A 3D vector
    makeVector = function (x,y,z) {
        return { x : x, y : y , z : z || 0 };
    };
}

// Clones a Vector
cloneVector = function (v) {
    return makeVector (v.x,v.y,v.z);
}

// Sets the coordinates of p to those of q
setCoords = function (p, q) {
    p.x = q.x; p.y = q.y; p.z = q.z;
}

// Dot product between two vectors
dot = function (u,v) {
    return u.x*v.x + u.y*v.y + u.z*v.z;
}

// cross product  between two vectors
cross = function (v1,v2) {
    return makeVector (v1.y * v2.z - v2.y * v1.z,
                    v1.z * v2.x - v2.z * v1.x,
                    v1.x * v2.y - v2.x * v1.y);
}

// squared size of a vector
mag2 = function (u) {
    return u.x*u.x+u.y*u.y+u.z*u.z;
}

// size of a vector
mag = function (u) {
    return Math.sqrt(mag2(u));
}

// Returns a unit vector with the direction of u
unitVector = function(u) {
    var m = mag(u);
    if (m < Number.EPSILON) return makeVector(1.0,0.0);
    return makeVector(u.x/m,u.y/m,u.z/m); 
}

// Returns the sum of two vectors
addVectors = function (u, v) {
    return makeVector (u.x+v.x, u.y+v.y, u.z+v.z);
}

// Returns a vector with the subtraction of two vectors
subVectors = function (p,q) {
    return makeVector (p.x-q.x, p.y-q.y, p.z-q.z);
}

// Returns vector scaled by s
scaleVector = function (v,s) {
    return makeVector (v.x*s, v.y*s, v.z*s);
}

// Returns a linear interpolation between vectors u and v ratio t
lerpVectors = function (u,v,t) {
    var a = 1-t, b = t;
    return makeVector (u.x*a+v.x*b,u.y*a+v.y*b,u.z*a+v.z*b);
}

// Applies a 4x4 transformation matrix m to vector v and returns the result
transformedVector = function (m,v) {
    return makeVector (m[0][0]*v.x+m[0][1]*v.y+m[0][2]*v.z,
                       m[1][0]*v.x+m[1][1]*v.y+m[1][2]*v.z,
                       m[2][0]*v.x+m[2][1]*v.y+m[2][2]*v.z);
}

// Creates a point with coordinates x,y,z
makePoint = function (x,y,z) {
    return makeVector(x,y,z);
}

// Clones a Vector
clonePoint = function (v) {
    return makePoint (v.x,v.y,v.z);
}

// Creates a vector with the subtraction of points p - q
subPoints = function (p,q) {
    return makeVector (p.x-q.x, p.y-q.y, p.z-q.z);
}

// Returns the distance between points p and q
distPoints = function (p,q) {
    var dx = p.x - q.x, dy = p.y - q.y, dz = p.z - q.z;
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

// Applies a 4x4 transformation matrix m to point v and returns the result
transformedPoint = function (m,v) {
    return makePoint  (m[0][0]*v.x+m[0][1]*v.y+m[0][2]*v.z+m[0][3],
                       m[1][0]*v.x+m[1][1]*v.y+m[1][2]*v.z+m[1][3],
                       m[2][0]*v.x+m[2][1]*v.y+m[2][2]*v.z+m[2][3]);
}


// Returns the distance from point r to line segment p-q. 
// If closest is passed, it should be a point and will be 
// set with the closest point of the line segment to r
distPointLineSegment = function (p, q, r, closest) {
    var s = distPoints(p,q);
    closest = closest || makePoint (p.x, p.y, p.z);
    if (s < 0.0001) return distPoints(r,p);
    var v = makeVector ((q.x-p.x)/s, (q.y-p.y)/s, (q.z-p.z)/s);
    var u = makeVector (r.x-p.x, r.y-p.y, r.z-p.z);
    var d = dot (u,v);
    if (d < 0) {
        return distPoints(r,p);
    }
    if (d > s) {
        return distPoints(r,q);
    }
    setCoords (closest, interpPoints (p,q,0,s,d));
    return distPoints (closest,r);
}

// Let p have weight wp and q have weight wq. Then this function
// returns the point corresponding to weight w. 
interpPoints = function ( p, q, wp, wq, w ) {
    var a = (w - wp) / (wq - wp);
    var b = 1-a;
    return makePoint (p.x*b+q.x*a, p.y*b+q.y*a, p.z*b+q.z*a); 
} 


