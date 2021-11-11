"use strict";

/* Comment this for production code */
console.assert = function (pred) {
	if (!pred) throw "Assertion failed";
}

/**
 * A Halfedge class
 */
class Halfedge {

	/** 
     * Builds a new halfedge object. All fields are integer numbers which are supposed to 
	 * be used as indices or keys to other data structures which store related
	 * information.
	 *
	 * @param {integer} vtx Index of incident vertex in vertex table
	 * @param {integer} opp Index of opposite halfedge in halfedge table
	 * @param {integer} nxt Index of next halfedge in halfedge table
	 * @param {integer} prv Index of previous halfedge in halfedge table
	 * @param {integer} fac Index of incident face in face table
	 * @param {HalfedgeDS} ds The Halfedge data structure this belongs to
     */
	constructor (vtx, opp, nxt, prv, fac, ds) {
		this.vtx = vtx; 
		this.opp = opp; 
		this.nxt = nxt; 
		this.prv = prv; 
		this.fac = fac; 
		this.ds = ds;
	}

	/**
	 * Produces a vanilla version of object that can be serialized. Note that the 'ds' field
	 * is not included because it would create a circular object.
	 * 
	 * @return {object} a vanilla JSON object
	 */
	toJSON() {
		return { vtx:this.vtx, opp: this.opp, nxt: this.nxt, prv: this.prv, fac:this.fac };
	}

	/**
	 * To be used instead of the constructor with all fields encoded in the given json object.
	 * Optionally, the HalfedgeDS object can be given to produce a fully functional Halfedge object
	 * attached to the given ds
	 * 
	 * @param  {object} json A vanilla json object
	 * @param {HalfedgeDS} ds Optional HalfedgeDS
	 * @return {Halfedge}      A Halfedge
	 */
	static fromJSON (json, ds) {
		return new Halfedge (json.vtx, json.opp, json.nxt, json.prv, json.fac, ds);
	} 

	/**
	 * To be called whenever this halfedge is to be removed from its
	 * containing data structure.
	 */
	remove () {
		this.vtx = this.opp = this.nxt = this.prv = this.fac = this.ds = undefined;
	}


	/**
	 * The vertex pointed by this halfedge
	 * @return {object} The vertex object
	 */
	get vertex () {
		return this.ds.vertex[this.vtx];	
	}


	/**
	 * The opposite halfedge from this
	 * @return {Halfedge} 
	 */
	get opposite () {
		return this.ds.halfedge[this.opp];	
	}

	/**
	 * The next halfedge from this
	 * @return {Halfedge} 
	 */
	get next () {
		return this.ds.halfedge[this.nxt];	
	}

	/**
	 * The previous halfedge from this
	 * @return {Halfedge} 
	 */
	get prev () {
		return this.ds.halfedge[this.prv];		
	}

	/**
	 * Returns as an array all vertices of the face circulation of this halfedge
	 * @return {vertex[]} All vertices in the face circulation of this halfedge
	 */
	get faceCirculationVertices () {
		var vtx = [];
		for (var v of this.ds.faceCirculator (this)) {
			vtx.push (v.vertex);
		}
		return vtx;
	}

	/**
	 * Returns an array containing the source and dest vertices of the edge
	 * represented by this halfedge
	 * @return {vertex[2]} Source and Dest vertex of edge
	 */
	get edgeVertices () {
		return [this.vertex, this.opposite.vertex];
	}

	/** 
	 * Returns the index of this halfedge in the halfedge table
	 * @return {number} 
	 */
	get index () {
		console.assert (this.opposite.opposite === this);
		return this.opposite.opp;
	}

	/** 
	 * Tells whether the face delimited by this halfedge is a border face
	 */
	 get isBorder () {
	 	return this.ds.borderFaces.has(this.fac);
	 }
}

/**
 * A specialized array that supports the search for empty (undifined) positions
 */
class PackedArray extends Array {

	constructor () { super () }

	/**
	 * @return {number} Returns the next available index
	 */
	emptySlot () { 
		return this.emptySlots(1)[0];
	}

	/**
	 * @param  {number} n Desired number of available indices
	 * @return {number[]}   An array with n available indices
	 */
	emptySlots (n) {
		var slots = [];
		for (var i = 0; n > 0; i++) {
		//for (var i = this.length; n > 0; i++) {
			if (this[i] == undefined) {
				slots.push (i);
				n--;
			}
		}
		return slots;
	}
}

/**
 * A Halfedge data structure
 * 
 */
class HalfedgeDS {

	/**
	 * Returns a new halfedge for this data structure with the given fields
	 * @param {integer} vtx Index of incident vertex in vertex table
	 * @param {integer} opp Index of opposite halfedge in halfedge table
	 * @param {integer} nxt Index of next halfedge in halfedge table
	 * @param {integer} prv Index of previous halfedge in halfedge table
	 * @param {integer} fac Index of incident face in face table
	 * @return {Halfedge}     
	 */
	newHalfedge (vtx, opp, nxt, prv, fac) {
		return new Halfedge (vtx, opp, nxt, prv, fac, this);
	}

	/**
	 * Builds a halfedge data structure for a mesh
	 * @param  {number[][]} face 	array of vertex circulations represented by arrays of integers
	 * @param  {anything[]} vertex 	array of vertex information objects
	 */
	constructor (face, vertex) {

		this.faceh = new PackedArray();     // Face halfedge table
		this.vertexh = new PackedArray();   // Vertex halfedge table
		this.halfedge = new PackedArray();  // Halfedge table
		this.vertex = vertex;
		this.borderFaces = new Set(); // Set of indices of faces that are border faces

		var edgedic = {}; // An edge dictionary to map pairs of vertex indices to halfedges
		var edgekey = // Builds a unique key from a pair of vertex indices
			function (i,j) {
				return i * vertex.length + j;
			}

		// Iterate over all faces
		for (var iface = 0; iface<face.length; iface++) {
			var f = face[iface];
			var vprev = f [f.length-1];
			for (var iv = 0; iv < f.length; iv++) {
				var v = f[iv]; // Index of vertex
				var ihe = this.halfedge.length; 
				var key = edgekey (v,vprev);
				// Find opposite halfedge
				var opposite = -1;
				if (edgedic[key] != undefined) {
					opposite = edgedic[key];
					this.halfedge[opposite].opp = ihe;
				}
				// This halfedge must not have been entered yet
				key = edgekey(vprev,v);
				console.assert (edgedic[key] == undefined);
				edgedic[key] = ihe;

				// Compute previous
				var previous =  iv == 0 ? ihe + f.length - 1 : ihe-1;
				// Compute next
				var next = iv == f.length-1 ? ihe - f.length + 1 : ihe+1;
				// Create the halfedge
				var he = this.newHalfedge (v,opposite,next,previous,iface);
				this.halfedge.push(he);
				// Associate this halfedge to the vertex in the vertexh table
				this.vertexh [v] = ihe;
				vprev = v;
			}
			// Face halfedge is the last halfedge created
			this.faceh [iface] = this.halfedge.length-1;
		} 

		// Create 'border' halfedges and corresponding faces
		// so that vertex circulations do not break
		while (true) {
			// Try to find one unpaired edge
			var he;
			var found = false;
			for (var ih = 0; ih < this.halfedge.length; ih++) {
				he = this.halfedge [ih];
				if (he.opp == -1) {
					found = true;
					break;
				}
			}
			if (!found) break; // No unpaired edges left
			// Collect the loop of unpaired edges
			var loop = [he];
			var closed = false;
			while (!closed) {
				// Fetch next halfedge of the outside loop
				var next = he.next;
				// Walk around vertex
				while (next.opp != -1) {
					next = next.opposite.next;
					if (next == he) {
						console.log ("Weird vertex circulation");
						return;
					}
				} 
				if (loop.indexOf (next) >= 0) {
					closed = true;
				}
				else {
					loop.push (next);
					he = next;
				}
			}
			// Create border halfedges as twins of those in loop
			var n = this.halfedge.length; 
			var newface = this.faceh.length;
			for (var i = 0; i < loop.length; i++) {
				var he = loop[i];
				var ihe = he.next.prv;
				var itwin = n+i;
				var opp = ihe;
				he.opp = itwin;
				var nexti = (i+1)%loop.length;
				var prv = n+nexti;
				var previ = (i+loop.length-1)%loop.length;
				var nxt = n+previ;
				var fac = newface;
				var vtx = loop[previ].vtx;
				this.halfedge.push (this.newHalfedge (vtx,opp,nxt,prv,fac));
			}
			// Remember this outside face
			this.borderFaces.add(newface);
			this.faceh.push (n);
		}
	}

	/**
	 * Returns a vanilla JSON object which can be serialized.
	 * 	
	 * @return {object} a vanilla object representing this data structure.
	 */
	toJSON() {
		return { 
			faceh:this.faceh, 
			vertexh: this.vertexh, 
			halfedge: this.halfedge.map (d=>{
				if (d instanceof Halfedge) return d.toJSON();
				return undefined;
			}),
			vertex: this.vertex,
			borderFaces : Array.from(this.borderFaces)
		}
	}

	/**
	 * Takes a json object created with 'toJSON' and rebuilds the original HalfedgeDS object.
	 * 
	 * @param  {object} json Object created with HalfedgeDS.toJSON ()
	 * @return {HalfedgeDS}      copy of original HalfedgeDS object.
	 */
	static fromJSON (json) {
		var ds = new HalfedgeDS([],[]);
		ds.faceh.push.apply (ds.faceh, json.faceh);
		ds.vertexh.push.apply (ds.vertexh, json.vertexh);
		for (let h of json.halfedge) {
			if (h) {
				h = Halfedge.fromJSON(h, ds);
			}
			ds.halfedge.push(h);
		}
		ds.vertex = json.vertex;
		ds.borderFaces = new Set (json.borderFaces);
		return ds;
	}

	/**
	 * Iterator to traverse all vertices of a HE data structure. 
	 * 
	 * @return {Halfedge} Yields a halfedge incident to each vertex
	 */  
	*allVertices () {
		for (var i = 0; i < this.vertexh.length; i++) {
			var ihe = this.vertexh [i];
			if (ihe == undefined) continue;
			yield this.halfedge [ihe];
		}
	}


	/**
	 * Iterator to traverse all internal faces of a HE data structure.
	 * 
	 * @return {Halfedge} Yields a halfedge incident to each face
	 */
	*allFaces () {
		for (var i = 0; i < this.faceh.length; i++) {
			var ihe = this.faceh [i];
			if (ihe == undefined) continue;
			if (!this.borderFaces.has(i)) yield this.halfedge [ihe];
		}	
	}

	/**
	 * Iterator to traverse all border faces of a HE data structure.
     * @return {Halfedge} Yields a halfedge incident to each face on the border of the mesh.
	 */
	*allBorderFaces () {
		for (var i = 0; i < this.faceh.length; i++) {
			var ihe = this.faceh [i];
			if (ihe == undefined) continue;
			if (this.borderFaces.has(i)) yield this.halfedge [ihe];
		}	
	}

	/**
	 * Iterator to traverse all edges of a HE data structure.
	 * @return {Halfedge} Yields a halfedge incident to each edge
	 **/
	*allEdges () {
		for (var i = 0; i < this.halfedge.length; i++) {
			var he = this.halfedge [i];
			if (he == undefined) continue;
			if (he.opp < i) continue;
			yield he;
		}
	} 

	/**
	 * Iterates over each halfedge of a face circulation starting
	 * at halfedge he.
	 * 
	 * @param {Halfedge} he 
	 * @return {Halfedge} Yields a halfedge incident to same face as he
	 */
	*faceCirculator (he) {
		var start = he;
		var fac = he.fac;
		var max = 2000; // A failsafe for corrupt hds
		while (true) {
			console.assert (he.fac == fac);
			yield (he);
			he = this.halfedge[he.nxt];
			if (he === start) break;
			console.assert (max-- > 0);
		}
	}

	/**
	 * Returns an array with all vertices of the face pointed to by he.	
	 * @param  {Halfedge} he A halfedge of the face in question.
	 * @return {anything[]}    Array of vertices
	 */
	getFaceVertices (he) {
		var f = [];
		for (let e of this.faceCirculator(he)) {
			f.push (e.vertex);
		}
		return f;
	}

	/**
	 * Iterates over each halfedge of a vertex circulation starting
	 * at halfedge he
	 *
	 * @param {Halfedge} he 
	 * @return {Halfedge} Yields a halfedge incident to same vertex as he
	 **/
	*vertexCirculator (he) {
		var start = he;
		var vtx = he.vtx;
		var max = 30; // A failsafe for corrupt hds
		while (true) {
			console.assert (he.vtx == vtx);
			yield (he);
			he = he.next.opposite;
			if (he === start) break;
			console.assert (max-- > 0);
		}
	}


	/**
	 * Finds a halfedge connecting two vertices. If not found, returns undefined.
	 * @param  {number} src index of the first vertex
	 * @param  {number} dst index of the second vertex
	 * @return {Halfedge}     Halfedge from iv1 to iv2 or undefined
	 */
	findHalfedge (src, dst) {
		for (let h of this.vertexCirculator(this.halfedge[this.vertexh[dst]])) {
			if (h.opposite.vtx == src) return h;
		}
		return undefined;
	}

	/**
	 * Called whenever the faceh table might point to a deleted halfedge. Finds
	 * a replacement halfedge and updates the table.
	 * 
	 * @param  {Halfedge} he A deleted halfedge
	 */
	_updateFaceh (he) {
		if (this.halfedge[this.faceh[he.fac]] == undefined) {
			if (he.prev.fac == he.fac && this.halfedge[he.prv] != undefined) {
				this.faceh[he.fac] = he.prv;
			}
			else if (he.next.fac == he.fac && this.halfedge[he.nxt] != undefined) {
				this.faceh[he.fac] = he.nxt;
			}
			else throw "Can't find replacement halfedge for face "+he.fac;
		}
	}

	/**
	 * Called whenever the vertexh table might point to a deleted halfedge. Finds
	 * a replacement halfedge and updates the table.
	 * 
	 * @param  {Halfedge} he A deleted halfedge
	 */
	_updateVertexh (he) {
		if (this.halfedge[this.vertexh[he.vtx]] == undefined) {
			if (he.next.opposite.vtx == he.vtx && this.halfedge[he.next.opp] != undefined) {
				this.vertexh[he.vtx] = he.next.opp;
			}
			else if (he.opposite.prev.vtx == he.vtx && this.halfedge[he.opposite.prv] != undefined) {
				this.vertexh[he.vtx] = he.opposite.prv;
			}
			else throw "Can't find replacement halfedge for vertex "+he.vtx;
		}
	}

	/**
	 * Removes the edge of halfedge h, thus joining the two adjacent faces. 
	 * The face of h becomes the face of its opposite halfedge.
	 * 
	 * @param  {Halfedge} h halfedge of edge separating two faces. 
	 * @return {Halfedge}   a halfedge pointing to the new face created.
	 */
	joinFace (h) {
		var index_h = h.index;
		var g = h.opposite;
		var index_g = g.index;
		var face_g = g.fac;
		// Update g's circulation with the right face
		for (let hi of this.faceCirculator (g)) { hi.fac = h.fac }
		// Remove the edge
		g.prev.nxt = h.nxt;
		h.prev.nxt = g.nxt;
		g.next.prv = h.prv;
		h.next.prv = g.prv;
		this.halfedge [index_g] = this.halfedge [index_h] = undefined;
		this.faceh [face_g] = undefined;
		// Update the faceh and vertexh tables if needed
		this._updateFaceh(h);
		this._updateFaceh(g);
		this._updateVertexh(h);
		this._updateVertexh(g);

		var result = h.next;
		h.remove();
		g.remove();
		return result;
	}


	/**
	 * Given two halfedges incident on the same face, splits it into two faces.
	 * 
	 * @param  {Halfedge} h First halfedge incident on some face f.
	 * @param  {Halfedge} g Second halfedge incident on some face f.
	 * @return {Halfedge}   One of the halfedges of the newly created edge.
	 */
	splitFace (h,g) {
		if (h.fac != g.fac) { throw "Not halfedges on the same face"; }
		var new_face = this.faceh.emptySlot();
		var index_g = g.index;
		var index_h = h.index;
		var [i,j] = this.halfedge.emptySlots(2);
		var he_i = this.newHalfedge (g.vtx, j, g.nxt, index_h, h.fac);
		var he_j = this.newHalfedge (h.vtx, i, h.nxt, index_g, new_face);
		this.halfedge[i] = he_i;
		this.halfedge[j] = he_j;
		var iter = h.nxt;
		var max = 20;
		for (let iter of this.faceCirculator(h.next)) {
			iter.fac = new_face;
			if (iter == g) break;
			if (max-- == 0) throw "Corrupt hds in vertex circulation";
		}
		g.next.prv = i;
		g.nxt = j;
		h.next.prv = j;
		h.nxt = i;
		this.faceh[new_face] = j;
		this.faceh[he_i.fac] = i;
		this.vertexh[he_i.vtx] = i;
		this.vertexh[he_j.vtx] = j; 
		return he_j;
	} 


	/**
	 * Given a halfedge h pointing to a vertex, joins this vertex with 
	 * vertex pointed to by h.opp and eliminate edge h/h.opp as well as the vertex 
	 * h points to.
	 * 
	 * @param  {Halfedge} h 
	 * @return {Halfedge}  a halfedge pointing to the joined vertex
	 */
	joinVertex (h) {
		console.assert (h.opposite != h.prev);
		var g = h.opposite;
		var index_g = g.index;
		var index_h = h.index;
		var old_vtx = h.vtx; // Gets removed
		var new_vtx = g.vtx; 
		var max = 20;
		for (let he of this.vertexCirculator (h)) { 
			he.vtx = new_vtx;
			console.assert (max-- > 0);
		}
		h.prev.nxt = h.nxt;
		h.next.prv = h.prv;
		g.prev.nxt = g.nxt;
		g.next.prv = g.prv;
		console.log ("Removing vertex", old_vtx);
		console.log ("Removing halfedges", index_h, index_g);
		this.vertexh[old_vtx] = undefined;
		this.vertex[old_vtx] = undefined;
		this.halfedge[index_h] = undefined;
		this.halfedge[index_g] = undefined;

		// Update the faceh and vertexh tables if needed
		this._updateFaceh(h);
		this._updateFaceh(g);
		this._updateVertexh(h);
		this._updateVertexh(g);

		var result = h.prev;
		h.remove();
		g.remove();
		return result;
	}

	/**
	 * Given two halfedges incident on the same vertex W, splits it into two vertices
	 * joined by a new edge. The new vertex v is put in the halfedge table pointed to by h.
	 * 
	 * @param  {Halfedge} h First halfedge incident on some vertex W
	 * @param  {Halfedge} g Second halfedge incident on some vertex W
	 * @param  {anything} v Vertex info for newly created vertex
	 * @return {Halfedge}   Halfedge from W to v
	 */
	splitVertex (h,g,v) {
		console.assert (h.vtx == g.vtx);
		var index_g = g.index;
		var index_h = h.index;
		var new_vtx = this.vertexh.emptySlot();
		this.vertex[new_vtx] = v;
		this.vertexh[h.vtx] = index_g;
		this.vertexh[new_vtx] = index_h;
		var max = 20;
		var he = h;
		while (he != g) {
			he.vtx = new_vtx; 
			he = he.opposite.prev;
			console.assert (max-- > 0);
		};
		var [i,j] = this.halfedge.emptySlots(2);
		var h_i = this.newHalfedge (g.vtx,j,h.nxt,index_h,h.fac);
		this.halfedge [i] = h_i;
		var h_j = this.newHalfedge (new_vtx,i,g.nxt,index_g,g.fac);
		this.halfedge [j] = h_j;
		h.next.prv = i;
		g.next.prv = j;
		h.nxt = i;
		g.nxt = j;
		return h_j;
	}

}

