// Window geometry
var width = window.innerWidth, height = window.innerHeight;

// Create svg
var svg = d3.select("body").append("svg").attr ("width", width).attr("height", height);

// Create a popup menu div
var popup = d3.select("body").append("div").attr("class","popup");

// Arrange for popup to disappear on mouseup
var hidepopup = function() {
        popup.style("opacity", "0").style("display","none")
    };

svg.on ("mouseup", hidepopup);
popup.on ("mouseup", hidepopup);


// Cancel context menu so that we can use right button
window.oncontextmenu = function () { return false }


// Allowed face colors
var facecolors = ["#90CCD6", "#62886F", "#F2F3EB", "#DEBE57", "#A7470B", "brown", "magenta", "darkblue"]

// The selected halfedges
var selected_halfedges = [];

// A list of JSONs containing the editing history
var edit_history = [];
var edit_history_index = 0;

/**
 * Saves the current hds to edit_history at the current point
 */
function save_history () {
	var ds = currHds();
	edit_history [edit_history_index] = JSON.stringify(ds.toJSON());
}

/** 
 * Adds a new state to edit_history and truncates it to the current position
 */
function push_history() {
	edit_history_index++;
	save_history();
	edit_history.length = edit_history_index+1;
}

/**
 * Restores the hds saved at the current point of the history.
 */
function restore_history () {
	var text = edit_history [edit_history_index];
	var ds = HalfedgeDS.fromJSON (JSON.parse(text));
	annotateHdsPolygonSides(ds);
	hdsDraw (ds);
	configureButtons();
}

//
// 
//   For debugging
//   
//   
var HDS;
function vtxNeighbors (i) {
	var h = HDS.halfedge[HDS.vertexh[i]];
	console.assert (h != undefined);
	var vtx = [];
	for (var v of HDS.vertexCirculator (h)) {
		vtx.push (v.opposite.vtx);
	}
	return vtx;
}

function borderVertices () {
	var res = [];
	for (let h of HDS.allBorderFaces()) {
		console.assert (h.isBorder);
		var vtx = [];
		for (let g of HDS.faceCirculator (h)) {
			vtx.push (g.vtx);
		}
		res.push (vtx);
	}
	return res;
}

function allVertices() {
	var res = [];
	for (let h of HDS.allVertices()) {
		res.push (h.vtx);
	}
	return res;
}

/**
 * Tests if all face halfedges are properly labeled with the polygon sidedness 
 * field (n)
 */
function testCirculations () {
	var ds = currHds();
	for (let hf of ds.allFaces()) {
		var n = undefined;
		var i = 0;
		for (let h of ds.faceCirculator(hf)) {
			console.assert(n == undefined || h.n == n);
			n = h.n;
			i++;
		}
		console.assert(n == i);
	}
}

//
//
// End debug code
// 
// 


/**
 * Returns the currently displayed halfedge data structure
 * @return {HalfedgeDS} The current hds.
 */
function currHds() {
	return svg.select ("g#faces polygon").datum().ds;
}

/**
 * Draws (creates svg drawing) the halfedge data structure
 * 
 * @param  {HalfedgeDS} hds A halfedge data structure
 * @param {boolean} dual True if drawing a dual archimedean mesh
 */
function hdsDraw (hds, dual) {

	// Save for debugging
	HDS = hds;

	var main_group = svg.select ("g#main");
	if (main_group.size() == 0) {
		var back_rect = svg.append("rect").attr("id", "back");
		main_group = svg.append("g").attr("id", "main");
		back_rect
			.attr("width", width)
    		.attr("height", height)
    		.style("fill", "none")
    		.style("pointer-events", "all")
    		.call(d3.zoom()
        		.scaleExtent([1 / 2, 4])
        		.on ("zoom", function() {
        			main_group.attr("transform", d3.event.transform);
        		}));
	}

	var face_group = main_group.select("g#faces"); 
	if (face_group.size() == 0) face_group = main_group.append("g").attr("id", "faces");

	var edge_group = main_group.select("g#edges"); 
	if (edge_group.size() == 0) edge_group = main_group.append("g").attr("id", "edges");

	var vertex_group = main_group.select("g#vertices"); 
	if (vertex_group.size() == 0) vertex_group = main_group.append("g").attr("id", "vertices");	

	var he_group = main_group.select("g#halfedges"); 
	if (he_group.size() == 0) he_group = main_group.append("g").attr("id", "halfedges");

	var face_he = Array.from (hds.allFaces());
	var sel = face_group.selectAll("polygon").data(face_he);
	sel.exit().remove();
	sel.enter().append ("polygon");
	face_group.selectAll("polygon")
		.each (function (he) {
			var poly = d3.select(this);
			poly.attr("points", he=>he.faceCirculationVertices.map(d => d.x+","+d.y).join(" "))
				.on ("mousedown", function () {
					var rightButton = d3.event.which == 3;
					var nsides = he.n;
				    popup
				        .style("opacity", "1")
				        .style("display","inline")
				        .style("left", Math.max(0, d3.event.pageX - 10) + "px")
				        .style("top", (d3.event.pageY - 10) + "px"); 
				    popup.selectAll("button").remove();
				    popup.selectAll("button").data(facecolors).enter()
				         .append("button").text(function (d) { ""})
				         .style ("padding", "8px")
				         .style ("background-color", function (d) { return d })
				         .on("mouseover", function (d) { 
				            if (rightButton) {
				            	face_group.selectAll("polygon").each (function (e) {
				            		if (e.n == nsides) {
				            			d3.select(this).style("fill", d);
				            		}
				            	});
				            }
				            else {
				            	poly.style("fill", d);
				            }
				            popup.selectAll("button").classed("active", function (a) {return a==d })
				        })
				});
		});

	var edge_he = Array.from (hds.allEdges());
	sel = edge_group.selectAll("line").data(edge_he);
	sel.exit().remove();
	sel.enter().append("line")
	edge_group.selectAll("line")
		.each (function (he) {
			var line = d3.select(this);
			var p = he.vertex, q = he.opposite.vertex;
			line.attr("x1", p.x)
				.attr("y1", p.y)
				.attr("x2", q.x)
				.attr("y2", q.y);
		});

	var vertex_he = Array.from (hds.allVertices());
	sel = vertex_group.selectAll("circle").data(vertex_he);
	sel.exit().remove();
	sel.enter().append("circle");
	vertex_group.selectAll("circle")
		.each (function (he) {
			var circle = d3.select(this);
			var isBorder = isBorderVertex(he);
			circle.classed("border", isBorder);
			circle.attr("cx", he.vertex.x)
				.attr("cy", he.vertex.y)
				.attr("r", isBorder ? 10 : 4)
		})
		.on ("mousedown", dual ? null : vertexMouseDown);

	/* Uncomment for debugging vertex numbers */
	// sel = vertex_group.selectAll("text").data(vertex_he);
	// sel.enter().append("text");
	// sel.exit().remove();
	// vertex_group.selectAll("text")
	// 	.text(function(d) { return d.vtx })
	// 	.style ("text-anchor","middle")
	// 	.attr("dy","0.4em")
	// 	.attr("x", function (d) {return d.vertex.x})
	// 	.attr("y", function (d) {return d.vertex.y});

}

/**
 * Saves the current hds onto a file
 */
function saveHds() {
	var filename = d3.select("input#filename").attr("value");
	var ds = currHds();
	var text = JSON.stringify(ds.toJSON());
    var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
    saveAs(blob, filename);
}

/**
 * loads a hds from a client file
 */
function loadHds () {
	var input = this;

	var components = input.value.split("/");
   	if (components.length < 2) components = input.value.split("\\");
    d3.select("input#filename").attr("value",components [components.length-1]);
    var fileobj = input.files[0];

    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function (theFile) {
        return function (e) {
            var text = e.target.result;
            var json = JSON.parse(text);
            var hds = HalfedgeDS.fromJSON(json);

			svg.selectAll ("g#main g").remove();

            hdsDraw(hds);
            annotateHdsPolygonSides(hds);
            push_history();
			configureButtons ();

            // clear the input element so that a new load on the same file will work
            input.value = "";
        };
    }) (fileobj);

    // Read in the file as a data URL.
    reader.readAsText(fileobj);
}

var lastHalfedgeSelected; // Last clicked halfedge

/**
 * Callback for clicking on a halfedge glyph
 *
 * @this {d3 selection} the group (svg tag g) for the halfedge glyph
 * @param  {Halfedge} d The halfedge
 */
function halfedgeClick (d) {
	var group = d3.select (this);
	if (group.classed ("selected")) {
		group.classed ("selected", false);
	}
	else {
		var sel = d3.selectAll ("g#halfedges g.selected").classed("selected", false);
		group.classed("selected", true);
		lastHalfedgeSelected = group.datum();
	}
	configureButtons();
}

/**
 * Callback for clicking a vertex. 'this' should be a circle element.
 * 
 * @param  {Halfedge} d Halfedge for vertex being dragged.
 */
function vertexMouseDown (d) {
	var vtx = d3.select(this);
	var active = vtx.classed("selected");
	d3.selectAll ("g#vertices circle").classed("selected", false);
	if (!active) {
		vtx.classed ("selected", true);
		d3.select("div#nodetype")
			.style("opacity",1)
			.style("display","inline")
			.style("left", Math.max(0, d3.event.pageX + 10) + "px")
			.style("top", (d3.event.pageY + 10) + "px"); 
	}
	else {
		d3.select("div#nodetype").style("opacity",0).style("display","none");
	}
	configureButtons();
}



/**
 * Table with all Archimedean nodes. Each element is a list of polygon types
 * around a vertex circulation
 * @type {Array}
 */
var archNode = [[3,12,12], [12,3,12],  // G
				[4,6,12], [4,12,6],    // H
				[4,8,8], [8,4,8],      // J
				[6,6,6],               // K    
				[3,3,4,12], [3,3,12,4],// L
				[3,4,3,12],			   // M
				[3,4,4,6], [6,4,4,3],  // N
				[3,4,6,4],			   // P
				[3,3,6,6],			   // Q
				[3,6,3,6],			   // R
				[4,4,4,4],			   // S
				[3,3,3,4,4],		   // T
				[3,3,4,3,4],		   // U
				[3,3,3,3,6],           // V
				[3,3,3,3,3,3]];        // W

/**
 * Letter code for each type of Archimedean node.
 * @type {Array}
 */
var archCodeLetter = ["G","G","H","H","J","J","K","L","L","M","N","N","P","Q","R","S","T","U","V","W"];

/**
 * Annotates each halfedge delimiting an internal face with the number 
 * of sides of the polygonal face. 
 * @param  {HalfedgeDS} hds The halfedge data structure
 */
function annotateHdsPolygonSides (hds) {
	for (let f of hds.allFaces()) {
		var n = 0;
		for (let h of hds.faceCirculator(f)) n+=1;
		for (let h of hds.faceCirculator(f)) h.n = n;
	}	
}

/**
 * Returns an array with the polygon type (number of sides) of each face in
 * the neighborhood of the halfedge pointed to by h. If a border face is found,
 * it is represented as a zero.
 * @param  {Halfedge} h Halfedge pointing to the vertex
 * @return {number[]}   array of numbers of sides of polygons surrounding vertex
 */
function vertexNodeType (h) {
	var ret = [];
	for (let g of h.ds.vertexCirculator(h)) {
		if (g.n) {
			ret.push (g.n);
		}
		else {
			if (!g.isBorder) {
				console.assert (g.isBorder);
			}
			ret.push (0);
		}
	}
	var izero = ret.indexOf(0);
	if (izero>=0) ret = ret.slice(izero).concat(ret.slice(0,izero));
	return ret;
}

/**
 * Node code of a vertex
 * @param  {Halfedge} h Halfedge incident to a vertex
 * @return {number}   Index of archNode matching this vertex, or -1 if no match
 */
function nodeCode (h) {
	var type = vertexNodeType (h);
	if (type [0] == 0) return -1;
	for (var i = 0; i < archNode.length; i++) {
		if (subCirculation (archNode[i],type) != -1) {
			return i;
		}
	};
	return -1;
}


/**
 * Tells if vertex on the border of the mesh
 * @param  {Halfedge}  h Halfedge incident to a vertex
 * @return {Boolean}   true if there are border halfedges incident on the vertex
 */
function isBorderVertex(h) {
	for (let g of h.ds.vertexCirculator(h)) {
		if (g.isBorder) return true;
	}
	return false;
}

/**
 * Returns the index of circular list a where a is a subsequence. Or, if 
 * a does not contain b, then returns -1.
 * @param  {number[]}  a Circular sequence stored as an Array.
 * @param  {number[]}  b Sequence to be searched in a.
 * @return {number}      -1 if not found, or the index of a where b can be found.
 */
function subCirculation (a, b) {
	var n = a.length;
	if (n < b.length) return -1;
		for (let i = 0; i < n; i++) {
			var match = true;
			for (let j = 0; j < b.length; j++) {
				if (b[j] != a [(j+i)%n]) {
					match = false;
					break;
				}
			}
			if (match) return i;
		}
		return -1;
}

/**
 * Finds which Archimedean Nodes match the given vertex node type.
 * @param  {number[]} vtype Vertex node type.
 * @return {number[]}       List of indices of archNode that match vtype.
 */
function archMatch (vtype) {
	var prefix = vtype.filter(d=>d!=0);
	var ret = [];
	for (let i = 0; i < archNode.length; i++) {
		if (subCirculation (archNode[i],prefix)>=0) ret.push(i);
	}
	return ret;
}

/**
 * Complements archMatch by finding all distinct ways that an incomplete node
 * can be completed and removes duplicates.
 * @param  {number[]} vtype Vertex node type.
 * @return {[number[],number[][]]} Two arrays: the archmatch and a corresponding array of completions.
 */
function completionAlternatives (vtype) {
	if (vtype [0] != 0) return [[],[]];
	let b = vtype.slice(1);
	let n = b.length;
	let matches = archMatch (vtype);
	let completions = [];
	let compset = new ArraySet();
	for (let i = 0; i < matches.length; i++) {
		let a = archNode[matches[i]];
		let k = subCirculation (a,b)+n;
		a = (a.concat(a)).slice(k,k+a.length-n);
		if (compset.has (a)) {
			matches.splice(i,1);
			i--;
		}
		else {
			completions.push(a);
			compset.add(a);
		}
	}
	return [matches,completions];
}



/**
 * Marks all nodes that have a nodetype similar to vtype
 * @param  {Number[]} vtype vertex node type (array of polygon sides)
 * @return {d3 selection}	A D3 selection of all border nodes with similar types
 */
function markSimilar (vtype) {
	d3.selectAll ("g#vertices circle").each(function (h) {
		var circle = d3.select(this);
		circle.classed ("similar", false);
		if (!circle.classed("border")) return;
		let vt = vertexNodeType (h);
		if (vt.length != vtype.length) return;
		for (let j = 0; j < vtype.length; j++) {
			if (vt[j] != vtype [j]) return;
		}
		circle.classed ("similar", true);
	});
}

function completeSimilar (match) {
	var sel = svg.selectAll ("g#vertices circle.similar");
	while (sel.size() > 0) {
		let vtx = svg.select ("g#vertices circle.similar");
		vtx.classed ("similar", false);
		let vtype = vertexNodeType (vtx.datum());
		if (vtype[0] == 0) {
			let b = vtype.slice(1);
			let n = b.length;
			let matches = archMatch (b);
			if (matches.indexOf (match) >= 0) {
				let a = archNode[match];
				let k = subCirculation (a,b)+n;
				a = (a.concat(a)).slice(k,k+a.length-n);
				console.log ("Would complete node", b, "with", a);
			}
			else {
				console.log (b, "Not anymore a match for", archCodeLetter[match]);
			}
		}
		sel = svg.selectAll ("g#vertices circle.similar");
	};
}
/**
 * Converts from radians to degrees
 * @param  {number} ang Angle in radians
 * @return {number}     Angle in degrees
 */
function degrees (ang) {
	return ang * 180 / Math.PI;
}

/**
 * Returns the internal angle of a regular polygon of n sides
 * @param  {number} n Number of sides of the regular polygon
 * @return {number}   Angle in radians
 */
function internalAngle (n) {
	return Math.PI - Math.PI * 2 / n;
}

/**
 * Given a halfedge, returns the angle between that halfedge and the next
 * @param  {Halfedge} h 
 * @return {number}   angle 
 */
function faceAngle (h) {
	var u = unitVector (subVectors (h.vertex, h.prev.vertex));
	var v = unitVector (subVectors (h.next.vertex, h.vertex));
	if (cross(u,v).z < 0) {
		return -(Math.PI-Math.acos(dot(u,v)));
	}
	else {
		return Math.PI-Math.acos(dot (u,v));
	}
}

/**
 * Given a halfedge h0, returns an array of halfedges h0,h1,etc so that 
 * h(i+1) is h(i)'s next halfedge and it forms a positive angle with h(i).
 * If ang is defined, the positive angle should be equal to ang to be considered
 * part of the cavity.
 * @param  {Halfedge} h initial halfedge
 * @param  {Number} ang required internal angle
 * @return {Halfedge[]}   Halfedge cavity
 */
function cavity (h,ang) {
	var vtx = h.vtx;
	var pass = ang ? 
		function (h) { var a = faceAngle(h); return a > 0 && Math.abs(a-ang) < 0.005 } :
		function (h) { var a = faceAngle(h); return a > 0 && Math.abs(Math.PI-a) > 0.005 };
	while (pass (h.prev) && h.prev.vtx != vtx) h = h.prev;
	var result = [h];
	vtx = h.vtx;
	var ang; 
	while (pass(h) && h.next.vtx != vtx) {
		h = h.next;
		result.push(h);
	}
	return result;
}	

/**
 * Tells if the border at h fits a polygon with n sides
 * @param  {Halfedge} h A border halfedge
 * @param  {Number} n Number of sides of a regular polygon
 * @return {boolean}   True if polygon fits the cavity at h
 */
function fitsCavity (h,n) {
	var vtx = h.vtx;
	var theta = internalAngle(n);
	while (faceAngle (h.prev) > 0 && h.prev.vtx != vtx) h = h.prev;
	vtx = h.vtx;
	var ang;
	while ((ang = faceAngle (h)) > 0 && h.next.vtx != vtx && n--) {
		if (ang + 0.05 < theta) return false;
	}
	return true;
}

/**
 * Returns the geometry of a regular polygon with the first vertex at p, n sides,
 * each with size s, where the first side is parallel to vector v. If not given,
 * v is assumed to be a horizontal line.
 * @param  {point} p First vertex
 * @param  {number} n Number of sides
 * @param  {number} s side length
 * @param  {vector} v direction of first side
 * @return {point[]}  positions of polygon vertices
 */
function polyFromSide (p,n,s,v) {
	v = v || makeVector (1,0);
	v = scaleVector(unitVector(v),s);
	var ang = Math.PI * 2 / n;
	var cos = Math.cos (ang), sin = Math.sin (ang);
	var poly = [p];
	while (--n) {
		p = addVectors (p, v);
		poly.push (p);
		[v.x, v.y] = [v.x*cos-v.y*sin, v.x*sin+v.y*cos];
	}
	return poly;
}

/**
 * Same as polyFromSide, but p designates the center of the polygon.Esperan,
 * @param  {point} p Center
 * @param  {number} n Number of sides
 * @param  {number} s side length
 * @param  {vector} v direction of first side
 * @return {point[]}  positions of polygon vertices
 */
function polyFromCenter(p,n,s,v) {
	var ang = Math.PI*2/n;
	var radius = s/2/Math.sin(ang/2);
	var u = scaleVector (unitVector(v || makeVector (1,0)),radius);
	var theta = Math.PI/2 - ang/2;
	var cos = Math.cos (theta), sin = Math.sin (theta);
	[u.x, u.y] = [u.x*cos-u.y*sin, u.x*sin+u.y*cos];
	return polyFromSide(subVectors (p,u),n,s,v);
}

/**
 * Attaches a n-sided polygon to border halfedge h.
 * @param  {Halfedge} h A border halfedge
 * @param  {number} n number of sides of the polygon to attach
 */
function attachPoly (h,n) {
	var c = cavity(h,internalAngle(n));
	h = c[0];
	var ds = h.ds;
	var p = h.vertex, q = h.opposite.vertex;
	var u = subVectors (p,q);
	var vtx = polyFromSide (q, n, mag(u),u);
	var g = h.prev;
	var h = c[c.length-1];
	var i = ds.splitFace (g,h);
	if (n == c.length) {
		i = i.prev;
		console.log ("Joining Vertex", i.next.vtx, i.next.opposite.vtx);
		ds.joinVertex(i.next);
	}
	else {
		for (var k = 1+c.length; k < n; k++) {
			h = ds.splitVertex(h.next.opposite,h,vtx[k]);
		}
	}
	for (let h of ds.faceCirculator(i)) {
		h.n = n;
	}
	testCirculations();
}



/** 
 * Initializes the design with a single polygon
 */
function seed () {
	// Create halfedge data structure and its drawing
	var n = d3.select("option:checked").datum()[1];
	var vtx = polyFromCenter (makeVector (width*0.5,height*0.5), n, 100);
	var face = [0,1,2,3,4,5,6,7,8,9,10,11].splice(0,n);
	var hds = new HalfedgeDS ([face],vtx);
	svg.selectAll ("group").remove();
	// Annotate the face type on each halfedge of the face
	for (let f of hds.allFaces()) {
		for (let h of hds.faceCirculator(f)) {
			h.n = n;
		}
	}
	// Update interface
	hdsDraw (hds);
	save_history();
	configureButtons();
}


/**
 * Analyzes the outer border of the mesh to locate cuts, i.e., consecutive coincident edges.
 * If one such pair is found, it is removed and the function returns true. If no such
 * edges are found, returns false.
 *
 * @return {boolean} True if a cut is found.
 */
function closeCuts() {
	var ds = currHds();
	for (let h of ds.allBorderFaces()) {
		console.assert (h.isBorder);
		for (let g of ds.faceCirculator (h)) {
			var v1 = g.prev.vertex;
			var v2 = g.next.vertex;
			var dist = distPoints (v1,v2);
			if (dist < 1) {
				var f = ds.splitFace (g.prev,g.next);
				f = ds.joinVertex(f);
				f = ds.joinFace(f);
				annotateHdsPolygonSides(ds);
				return true;
			}
		}
	}
	return false;
} 


/**
 * Creates a dual mesh for a given halfedge data structure
 * @param  {HalfedgeDS} hds input Halfedge data structure
 * @return {HalfedgeDS}     dual Halfedge data structure
 */
function createDual (hds) {

	var centroid = [];
	for (let h of hds.allFaces()) {
		var p = makeVector(0,0);
		var n = 0;
		for (let g of hds.faceCirculator(h)) {
			n++;
			var q = g.vertex;
			p.x += q.x;
			p.y += q.y;
		}
		p.x /= n;
		p.y /= n;
		centroid [h.fac] = p;
	}
	var dualface = [];
	for (let h of hds.allVertices()) {
		var f = [];
		var internal = true;
		for (let g of hds.vertexCirculator(h)) {
			f.push (g.fac)
			internal = internal && centroid[g.fac] != undefined;
		}
		if (internal) dualface.push (f)
	}
	return new HalfedgeDS(dualface,centroid);
}


/**
 * Callback that replaces the drawing of the current hds by its dual
 */
function dual() {
	var ds = createDual(currHds());
	console.log (ds);
	svg.selectAll ("g#main g").remove();
	hdsDraw (ds, true);
	push_history();
	configureButtons();
}

/**
 * Adds polygons around a vertex so that it becomes a particular Archimedean node.
 * @param  {selection} vtx  A vertex d3 selection (an svg circle)
 * @param  {number[]} node Cardinality (number of sides) of additional polygons needed to make this vertex a paricular node.
 */
function makeNode(vtx,match,node) {
	var n = node[0];
	var hv = vtx.datum();
	while (node.length > 0) {
		var n = node.shift();
		for (var h of hv.ds.vertexCirculator (hv)) {
			if (h.isBorder) {
				attachPoly (h,n);
				break;
			}
		}
	}
	while (closeCuts()) { console.log ("Closing"); }
	completeSimilar (match);
	hdsDraw (h.ds);
	d3.selectAll ("g.halfedge").classed("selected", false);
	push_history();
	configureButtons ();
}

/**
 * Creates a callback function to show the effect of adding polygons around a vertex
 * so that it becomes a particular Archimedean node.
 * 
 * @param  {selection} vtx  A vertex d3 selection (an svg circle)
 * @param  {number[]} node Cardinality (number of sides) of additional polygons needed to make this vertex a paricular node.
 * @return {function}      A function that draws the missing polygons
 */
function showPreview(vtx,node) {
	var n = node[0];
	var hv = vtx.datum();
	var v;
	for (var h of hv.ds.vertexCirculator (hv)) {
		if (h.isBorder) {
			v = subVectors (h.vertex,h.opposite.vertex);
			break;
		}
	}
	console.assert (v != undefined);
	var p = h.opposite.vertex;
	var s = mag(v);
	var poly = polyFromSide (p,n,s,v);
	var polyList = [poly];
	for (var i = 1; i < node.length; i++) {
		v = subVectors (poly[1],poly[2]);
		n = node[i];
		poly = polyFromSide (poly[2],n,s,v);
		polyList.push (poly);
	}
	return function () {
		svg.select("g#main").selectAll("polygon.preview")
			.data (polyList)
			.enter()
			.append ("polygon")
			.attr("class", "preview")
			.attr("points",function (poly) {
				return poly.map(d => d.x+","+d.y).join(" ")
			});
	}
}


/**
 * Removes the preview polygons created with the function returned by showPolygon.
 */
function removePreview () {
	svg.selectAll("polygon.preview").remove();
}

/**
 * Marks border vertices with the singlechoice css class
 */
function locateSingleChoice () {
	d3.selectAll ("g#vertices circle").each(function (h,i){
		var vtx = d3.select(this);
		vtx.classed("singlechoice", false);
		var isBorder = false;
		for (let g of h.ds.vertexCirculator(h)) {
			if (g.isBorder) {
				isBorder = true;
				break;
			}
		}
		if (!isBorder) return;
		var vtype = vertexNodeType(h);
		var matches = archMatch(vtype);
		if (matches.length == 1) {
			d3.select(this).classed("singlechoice", true);
		}	
	});
}




/** 
 * Creates buttons to command the main operations on a halfedge data structure
 */
function drawButtons () {
	var guiButtons = d3.select ("body").append ("div").attr("id", "buttons");

	var polyType = guiButtons.append ("select").attr("id", "polytype").on("change",configureButtons);
	polyType.selectAll ("option")
		.data([["Triangle",3], ["Square",4], ["Hexagon",6], ["Octagon",8], ["Dodecagon",12]])
		.enter()
		.append ("option").text(function(d) { return d[0] });
	guiButtons.append ("button").attr("id", "seed").text("Seed").on("click", seed);
	//guiButtons.append ("button").attr("id", "grow").text("Grow").on("click", grow);
	guiButtons.append ("button").attr("id", "dual").text("Dual").on("click", dual);
	guiButtons.append ("button").attr("id", "undo").text("Undo").on("click", function () {
		--edit_history_index;
		restore_history ();
	});
	guiButtons.append ("button").attr("id", "redo").text("Redo").on("click", function () {
		edit_history_index++;
		restore_history ();
	});
	var input = guiButtons.append ("input").attr("id", "load").attr("type", "file")
		.attr("name","files[]").style("visibility", "hidden").style("display","none")
		.on("change",loadHds);
	guiButtons.append ("button").attr("id", "load").text("Load").on("click", function() {
		input.node().click();
	});
	guiButtons.append ("button").attr("id", "save").text("Save").on("click", saveHds);
	guiButtons.append ("input").attr("id", "filename").attr("type", "text").attr("value","hds.json");


	var nodeType = d3.select("body").append ("div").attr("id", "nodetype").attr("class","popup");
	nodeType.selectAll("button")
		.data(archCodeLetter)
		.enter()
		.append("button").text(function(d) { return d });

	configureButtons();
}

/**
 * Analyzes which halfedges were selected and enables/disables the operation buttons
 * accordingly. Also sets the global selected_halfedges array to the values of the selected halfedges
 */
function configureButtons () {
	var sel = d3.selectAll ("g.halfedge.selected");
	var he = [];
	sel.each(function (d) {
		if (d == lastHalfedgeSelected || sel.size() == 1) he[0] = d;
		else he[1] = d;
	});
	selected_halfedges = he;

	if (he.length != 1 || !he[0].isBorder) {
		d3.select ("button#grow").attr("disabled", true);
	}
	else {
		var n = d3.select("option:checked").datum()[1];
		d3.select ("button#grow").attr("disabled", !fitsCavity(he[0],n) ? true : null);
	}
	d3.select ("button#undo").attr("disabled", edit_history_index == 0 ? true : null);
	d3.select ("button#redo").attr("disabled", edit_history_index >= edit_history.length-1 ? true : null);
	svg.selectAll ("polygon, line").classed("selected", false);

	var vtx = d3.select("g#vertices circle.selected");
	var [matches,completions] = [[],[]];
	var vtype = [];
	if (vtx.size()) {
		var d = vtx.datum();
		vtype = vertexNodeType(d);
		[matches,completions] = completionAlternatives(vtype);
		markSimilar(vtype);
	}
	else {
		d3.select("div#nodetype").style("opacity",0).style("display","none");
		markSimilar([]);
	}
	d3.selectAll("div#nodetype button").each(function(d,i){
		var button = d3.select(this);
		var j = matches.indexOf(i);
		button.attr("disabled",j >= 0 ? null : true);
		if (j >= 0) {
			var completion = completions[j];
			var match = matches[j];
			button.on("mouseenter", showPreview(vtx,completion))
				  .on("mouseleave", removePreview)
				  .on("click", function () { 
				  	makeNode (vtx,match,completion);
				  	d3.select("g#vertices circle.selected").classed("selected",false);
				  	removePreview();
				  	configureButtons();
				  });
		}
		else {
			button.on("mouseenter", null)
				  .on("mouseleave", null)
				  .on("click", null);
		}
	});

}


/**
 * Overall initialization function
*/
function init () {

	// Create buttons for the operations on hds
	drawButtons ();

	// first seed
	seed ();
}

init()