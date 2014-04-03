/**
 ** Crowdsourced Game, v 0.0.1
 ** Salem Hilal
 **
 ** Collaborated with Neha Rathi at a design level
 **
 */


//
// Server stuff
//
var express = require('express'),
		app = express(),
		server = require('http').createServer(app),
		io = require('socket.io').listen(server);

var clients = 0, // Number of active clients
		shipPositions = {}, // Tracks the client ship positions
		currentRow = 0; // row we're currently on

// Start the server
server.listen('5000')

// Render the static directory
app.use("/", express.static(__dirname + "/public"));

//
// Game stuff
//

// Returns average of all defined positions
function getUpdatedPosition() {
	var sum = 0;
	for (key in shipPositions) {
		pos = shipPositions[key].position;
		var x = pos? pos : 0;
		sum += x;
	}
	return Math.round(sum/clients);
}

var board = [
		[1, 0, 0, 0, 0],
		[0, 0, 0, 1, 0],
		[0, 0, 0, 0, 0],
		[1, 0, 0, 0, 0],
		[1, 0, 0, 1, 0],
		[0, 1, 0, 0, 1],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 1, 0],
		[0, 0, 0, 1, 0],
		[1, 0, 0, 0, 0],
		[1, 0, 0, 0, 1],
		[0, 0, 0, 0, 1],
		[0, 0, 0, 0, 0],
		[0, 1, 0, 0, 0],
		[1, 0, 0, 0, 0],
	];

var rows = board.length;
var cols = board[0].length;

//
// Sockets Stuff
//

// Handle new clients
io.sockets.on('connection', function (socket) {
	shipPositions[socket.id] = {
		position: 2,
		time: new Date().getTime(),
		joinTime: new Date().getTime(),
	}

	clients++;
	socket.emit('loadBoard', { board: board
	});
	// Send it the game board position right away
	socket.emit('updateBoard', { row: currentRow });

	// If we here a movement, update the ship's position
	// and broadcast it
  socket.on('move', function (data) {
    shipPositions[socket.id].position = data.position;
		shipPositions[socket.id].joinTime = new Date().getTime();

		// Got updated move, recalculate position
		var pos = getUpdatedPosition();
		io.sockets.emit('updateShip', { position: pos, data: shipPositions });
  });

	// Update client count if it disconnects
	socket.on('disconnect', function() {
		delete shipPositions[socket.id]
		clients--;
	});

});

// To test if the game is over
function isOccupied(row, col) {
	// Check bounds, assume out of bounds are occupied
	if(row >= rows || row < 0 || col >= cols || col < 0) {
		return true
	}

	// Calculate based on @currentRow
	return board[(currentRow + row) % board.length][col] == 1;
}

// Emit board updates once a second

var boardUpdate;
function updateBoard() {
	return setInterval(function() {
		if(isOccupied(1, getUpdatedPosition())) {
			clearInterval(boardUpdate);
			io.sockets.emit('gameOver');
			setTimeout(function(){
				boardUpdate = updateBoard()
			}, 15 * 1000);
		}
		currentRow++;
		io.sockets.emit('updateBoard', { row: currentRow });
	}, 1000);
}
boardUpdate = updateBoard();
