/**
 * A set of arrays of integers. 
 */
class ArraySet {

	/**
	 * Empty constructor
	 */
	constructor () {
		this.map = new Map();
		this.count = 0;
	}

	/**
	 * A reasonable hash function for an array of integers
	 * @param  {Number[]} ar An array of integers
	 * @return {Number}    An integer hash key for ar
	 */	
	static hash (ar) {
		var key = 0xfff;
		for (let x of ar) {
			key = key ^ x;
		}
		return key;
	}

	/**
	 * Tells if two arrays have the same elements in the same order
	 * @param  {any[]} ar1 First array
	 * @param  {any[]} ar2 Second array
	 * @return {boolean}     True if the two arrays are equal
	 */
	static same (ar1,ar2) {
		if (ar1.length != ar2.length) return false;
		for (let i = 0; i < ar1.length; i++) {
			if (ar1[i]!=ar2[i]) return false;
		}
		return true;
	}

	/**
	 * Adds ar to the set
	 * @param {Number[]} ar An array of integers
	 * @return {ArraySet} This object
	 */
	add (ar) {
		var h = ArraySet.hash (ar);
		if (this.map.has(h)) {
			for (let x of this.map.get(h)) {
				if (ArraySet.same(x,ar)) return this;
			}
			this.map.get(h).push(ar.slice(0));
		}
		else {
			this.map.set(h,[ar.slice(0)]);
		}
		this.count++;
		return this; 
	}

	/**
	 * Tells if ar is in this set
	 * @param  {Number[]}  ar An array of integers
	 * @return {Boolean}    true if ar is in the set
	 */
	has (ar) {
		var h = ArraySet.hash (ar);
		if (this.map.has(h)) {
			for (let x of this.map.get(h)) {
				if (ArraySet.same(x,ar)) return true;
			}
		}
		return false;
	}

	/**
	 * Removes ar from the set if it was there
	 * @param  {Number[]} ar An array of integers
	 * @return {array or false}    If the array was there, the copy stored in the set, otherwise, false
	 */
	delete (ar) {
		var h = ArraySet.hash (ar);
		if (this.map.has(h)) {
			var value = this.map.get(h);
			for (let i = 0; i < value.length; i++) {
				let x = value[i];
				if (ArraySet.same(x,ar)) {
					value.splice(i,1);
					this.count--;
					return x;
				}
			}
		}
		return false;
	}

	/**
	 * Number of elements in the set
	 * @return {number} cardinality of the set
	 */
	get size () {
		return this.count;
	}

	/**
	 * Default iterator
	 */
	*[Symbol.iterator]() {
		for (let [key,value] of this.map) {
			for (let ar of value) yield ar;
		}
  	}
}
/* // test code
var as = new ArraySet();
as.add([1,2,3]);
as.add([1,2,3]);
console.log (as.map);
console.assert(as.has([1,2,3]));
as.add([1,2]);
console.assert(as.has([1,2]));
console.assert(!as.has ([1,1]));
console.assert(!as.delete([1,1]));
as.add([2,1]);
console.log ([...as]);
console.assert (as.delete([2,1]));
console.log ([...as]);
console.assert(as.size == 2);
*/