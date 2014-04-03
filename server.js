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
		io = require('socket.io').listen(server, {log: true});

var clients = 0, // Number of active clients
		shipPositions = {}, // Tracks the client ship positions
		currentRow = 0, // row we're currently on
    betterMediator = false; // Which mediator are we using?

// Start the server
server.listen('5000')

// Render the static directory

app.get("/average", function(req, res) {
  betterMediator = false;
  res.end("Set mode to average");
})
app.get("/better", function(req, res) {
  betterMediator = true;
  res.end("Set mode to better");
})
app.use("/", express.static(__dirname + "/public"));

//
// Game stuff
//

// Returns average of all defined positions
function getUpdatedPosition() {
  // Just average everything
  if (!betterMediator) {
    console.log("AVERAGE MEDIATOR");
  	var sum = 0;
  	for (key in shipPositions) {
  		pos = shipPositions[key].position;
  		var x = pos? pos : 0;
  		sum += x;
  	}
  	return Math.round(sum/clients);
  }

  // Take the majority
  else {
    console.log("BETTER MEDIATOR");
    var positions = [0,0,0,0,0];
    var active = false;
    for (key in shipPositions) {
      pos = shipPositions[key].position;
      time = (new Date().getTime()) - shipPositions[key].time;
      console.log("TIME DIFFERENCE IS " + time);


      if (pos && time < 10 * 1000) {
        positions[pos]++;
        active = true;
      }
    }

    // Fall back to basic if everyone times out
    if (!active) {
      var sum = 0;
      for (key in shipPositions) {
        pos = shipPositions[key].position;
        var x = pos? pos : 0;
        sum += x;
      }
      return Math.round(sum/clients);
    }


    return positions.map(function(e, i){
        return {pos:i, count:e}})
      .reduce(function(a, b){
        return a.count > b.count ? a : b;
      }).pos;
  }
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
		shipPositions[socket.id].time = new Date().getTime();

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

// Count down to start, in seconds
function countdown(time) {
  if(time <0){
    return
  }
  io.sockets.emit('countdown', {time: time});
  setTimeout(function() {
    countdown(time-1)
  }, 1000)
}

// Emit board updates once a second
var boardUpdate;
function updateBoard() {
	return setInterval(function() {
		if(isOccupied(1, getUpdatedPosition())) {
			clearInterval(boardUpdate);
			io.sockets.emit('gameOver', {
        pos: getUpdatedPosition(),
        data: shipPositions
      });
      countdown(15);
			setTimeout(function(){
				boardUpdate = updateBoard()
			}, 15 * 1000);
		}
		currentRow++;
		io.sockets.emit('updateBoard', { row: currentRow });
	}, 1000);
}
boardUpdate = updateBoard();
