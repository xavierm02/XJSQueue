// create a new scope to avoid creating unnecessary global variables
// this (which always refers to the global object : window in browsers, global in node.js and so on ) is given as first argument and is therefore referenced as window
// no second argument is given so the undefined argument is undefined so that you can use it even if undefined has been given a value in the global scope
( function ( window, undefined ) {
	
	// 'use strict' throws errors when depreciated parts of JavaScript are used
	'use strict';
	
	// store the prototype of Array in a variable because it will be used several times
	var ArrayPrototype = Array.prototype;
	// store some methods in variables so shorten lookup later
	var slice = ArrayPrototype.slice;
	var splice = ArrayPrototype.splice;
	// transform instances of array-like objects (such as XJSQueue) into real arrays
	ArrayPrototype.toArray = function ( ) {
		return slice.call( this );
	};
	// push the items of an array at the end on another one
	Array.prototype.pushAll = function ( array ) {
		// toArray( ) is use because otherwise, concat would consider array-like items as one item instead of an array
		splice.apply( this, [ this.length, 0 ].concat( array.toArray( ) ) );
		return this.length;
	};
	
	// the constructor
	function XJSQueue( queue ) {
		// as the prototype is needed, check if this is an instance of XJSQueue
		// if it is, just do the normal thing
		if ( this instanceof XJSQueue ) {
			// include queue in this
			this.pushAll( queue );
			// set the default queue (this.queue may reference child queues later
			this.queue = this;
			// set piles to store parent queues and their index when going into a child queue
			this.queuesPile = [ ];
			this.indexesPile = [ ];
			// allow calling some methods with a this not being the queue
			// those methods are the ones one can pass as callback
			var that = this;
			this.cycle = this.next = function ( ) {
				return next( that, this, arguments );
			};
			this.start = this.loop = this.execute = function ( ) {
				return execute( that, this, arguments );
			};
			// this return is the default one but just make it explicit
			return this;
		} else {
		// if not, call XJSQueue recursively with the new operator
			return new XJSQueue( queue );
		}
	}
	
	// execute calls the callback according to the current queue and the current index
	// execute is called by functions that might be used as callback and therefore need to transfer this and the arguments to the callback
	// queue is the queue, the that from inside the constructor
	// that is the this to be passed to the callback
	// givenArguments contain the arguments to be passed to the callback
	function execute( queue, that, givenArguments ) {
		var action;
		while ( true ) {
			// get the action
			action = queue.queue[ queue.index ];
			// if action isn't defined
			if ( action === undefined ) {
				// get to the parent queue
				queue.up( );
				// if there is no parent queue
				if ( queue.queue === undefined ) {
					// reset que queue
					queue.reset( );
				// if there if a parent queue
				} else {
					// the current item is the child queue we were in so we want to get to the next item of the parent queue
					++queue.index;
				}
			// if action is defined
			} else {
				// if it is a child queue (array)
				if ( Array.isArray( action ) ) {
					// get to this child queue
					queue.down( );
				// if it is a function (not an array in fact, but it can only be an array or a function)
				} else {
					// get out of the loop
					break;
				}
			}
		}
		// transfer this and arguments to the callback
		action.apply( that, givenArguments );
		// allow chaining
		return queue;
	}
	
	// next does the same thing as execute except that it increments the index before doing so
	function next( queue, that, givenArguments ) {
		++queue.index;
		return execute( queue, that, givenArguments );
	}
	
	// make XJSQueue.prototype be an object having the same properties as Array.prototype so that XJSQueue instances have the same behaviour as Array instances except that their length property doesn't update on it's own if an item is added or removed using the [ ] operator
	// store it in a variable because several properties are going to be added to it
	var XJSQueuePrototype = XJSQueue.prototype = Object.create( Array.prototype );
	
	// down should be used only when this.queue[ this.index ] is an array
	// it just stores current queue and index and makes the current queue (this.queue) be the array itself, sets the index to 0
	XJSQueuePrototype.down = function ( ) {
		// store current queue and index
		this.queuesPile.push( this.queue );
		this.indexesPile.push( this.index );
		// set the new queue
		this.queue = this.queue[ this.index ];
		// set the index to 0 (as we delete it, reading it will be reading the prototype's index property which is 0)
		delete this.index;
		// allow chaining
		return this;
	};
	XJSQueuePrototype.goto = function ( indexes, fromRoot ) {// TODO
		if ( fromRoot ) {
			this.queue = this;
		}
		if ( Array.isArray( indexes ) ) {
			var that = this;
			indexes.forEach( function ( index, notFirst ) {
				if ( notFirst ) {
					that.down( );
				}
				that.goto( index );
			} );
		} else {
			this.index = indexes;
		}
		return this;
	};
	// default index
	XJSQueuePrototype.index = 0;
	// reset sets the queue back to the state of when it was created
	XJSQueuePrototype.reset = function ( ) {
		// make the queue be the root queue
		this.queue = this;
		// delete the index so that it takes the prototype's value: 0
		delete this.index;
		// allow chaining
		return this;
	};
	// skip allorws to skip some actions in the current queue
	// the first parameter is a number: the number of actions to skip
	// it will be rounded
	// if it isn't a number or is rounded to 0, it'll be set as 1
	// number can be negative even though if you need it to be negative, you probably aren't using XJSQueue properly
	XJSQueuePrototype.skip = function ( number ) {
		// round number and if the result is either 0 or NaN, return 1 instead
		// add this number to the current index
		this.index += Math.round( number ) || 1;
		// allow chaining
		return this;
	};
	// up resore the parent queue and the parent index that were stored by calling down
	XJSQueuePrototype.up = function ( ) {
		// restore queue
		this.queue = this.queuesPile.pop( );
		// restore index
		this.index = this.indexesPile.pop( );
		// allow chaining
		return this;
	};
	
	// expose XJSQueue in the global scope or to module if we're in node.js
	if ( typeof module === 'undefined' ) {
		window.XJSQueue = XJSQueue;
	} else {
		module.exports = XJSQueue;
	}
	
} )( this );