var Game = function(opts) {
  opts = opts || {}; // Prevent referencing properties of null

  // The socket
  var socket = io.connect(window.location.protocol + "//" + window.location.hostname);

  // Constants
  var LEFT = 37,  // Key codes
      RIGHT = 39;

  // Parameters
  var rows           = opts.rows || 6,                  // rows in the grid
      cols           = opts.cols || 5,                  // columns in the grid
      size           = opts.size || 50,                 // size of a grid block in px.
      selector       = opts.selector || "#game",        // selector for game board
      scoreSelector  = opts.scoreSelector || "#score",  // selector of scoreboard
      scorePerSec    = opts.scorePerSec || 0.001,       // cost user gains per second
      maxScore       = opts.maxScore || 2;              // Highest attainable score

  // Globals that u don have 2 worry bout
  var that = this,                              // Global access to current game instance
      barrierColor = "#1abc9c",                 // Color of barriers
      shipColor = "#e74c3c",                    // Color of ship
      boardColor = "#34495e",                   // Color of board
      cursorColor = "#ecf0f1",                  // Color of cursor
      spacing = 5,                              // Pixel padding between barriers/ship
      boardInterval,                            // Interval id of drawBoard updater
      shipCol = Math.floor(cols/2),             // Ship's current position, starts at roughly the center
      running = true,                           // Is the game running?
      seconds = 0,                              // Seconds game has elapsed
      averageTimeout = 0,                       // Average time between ship movements
      movements = 0,                            // Number of ship movements
      lastMovement = new Date().getTime(),      // Time of last movement
      score = 0.000;                            // Game score

  // How do we style game blocks
  var styling = {
    width: size-(2*spacing),
    height: size-(2*spacing),
    position: "absolute",
    borderRadius: "5px",
    boxSizing: "border-box",
  }

  // Rows
  var currentRow = 0;
  var board = opts.board || [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ]

  // Get mturk submission form ready
  $("<form/>")
      .attr("id", "mturk_form")
      .html("<input type='hidden' id='scoreField' name='score' value='0'>" +
            "<input type='hidden' id='secondsField' name='seconds' value='0'>" +
            "<input type='hidden' id='timeoutField' name='avgTimeout' value='0'>" +
            "<input type='hidden' id='movementsField' name='numMovements' value='0'>" )
      .appendTo($("body"));



  // Initialize game board
  var game = $(selector)
      .width(cols * size)
      .height(rows * size)
      .css("position", "relative")
      .css("background-color", boardColor);

  // ...and the scoreboard.
  var scoreboard = $(scoreSelector)
      .width(cols * size)
      .css({
        textAlign: "center",
        fontFamily: "sans-serif"
      })
      .css("text-align", "center")
      .css("font-family", "sans-serif")
      .css("font-size", "36px")
      .css("margin-top", "12px")
      .css("margin-bottom", "12px")
      .css("font-weight", "bold")


  /*
   * STUFF TO DRAW THE BOARD WITH
   */

  /*  Determines if given coordinates have a barrier.
      Needed because we don't keep a separate board array. */
  function isOccupied(row, col) {
    // Check bounds, assume out of bounds are occupied
    if(row >= rows || row < 0 || col >= cols || col < 0) {
      return true
    }

    // Calculate based on @currentRow
    return board[(currentRow + row) % board.length][col] == 1;
  }

  /* Updates all the barriers */
  function drawBoard() {

    // Get rid of old blocks
    $(".barrier").remove();

    // Draw new ones
    for(var i = 0; i < rows; i++) {
      var curr = (i + currentRow) % board.length; // which row to draw

      // Draw board row on gameboard.
      for(var j = 0; j < cols; j++) {
        if (board[curr][j] == 1) {
          drawBlock(i, j, true)
        }
      }
    }
  }

  /*  Draws a block at the given row and column.
      Adds a barrier if barrier = true */
  function drawBlock(row, col, barrier, cursor) {
    // Create block
    var block = $("<div/>")
        .css("bottom", (row * size + spacing) + "px")
        .css("left", (col * size + spacing) + "px")
        .css(styling);
    // Style accordingly
    if(barrier) {
      block
        .css("background-color", barrierColor)
        .addClass("barrier");
    } else if(cursor) {
      block
        .css("background-color", cursorColor)
        .css("z-index", "100")
        .attr("id", "ship");
    } else {
      block
        .css(styling)
        .attr("id", "crowdShip")
        .css("border-radius", "50%")
        .css("transition", "height .5s")
        .css("-webkit-transition", "height .2s")
        .css("z-index", "200")
        .css("background-color", shipColor);
    }

    // Add to gameboard
    game.append(block);
  }


  /*
   * GAMEPLAY STUFFS
   */

  /* Move the ship left */
  this.moveLeft = function() {
    if (!running) {
      return
    }
    // if(!isOccupied(0, (((shipCol - 1) % cols) + cols) % cols)) {
      // Get current timeout
      var currTime = new Date().getTime();
      // Update average timeouts
      averageTimeout = ((averageTimeout * movements) + currTime - lastMovement)/(movements + 1);
      // Increment movement counter
      movements++;
      // Update last movement
      lastMovement = currTime;

      // Update ship position
      shipCol = (((shipCol - 1) % cols) + cols) % cols;
      $("#ship")
        .css("left", (shipCol * size + spacing) + "px");
    // }
  }

  /* Move the ship right */
  this.moveRight = function() {
    if (!running) {
      return
    }
    // if(!isOccupied(0, (shipCol + 1) % cols)) {
      // Get current timeout
      var currTime = new Date().getTime();
      // Update average timeouts
      averageTimeout = ((averageTimeout * movements) + currTime - lastMovement)/movements;
      // Increment movement counter
      movements++;
      // Update last movement
      lastMovement = currTime;

      // Update ship position
      shipCol = (shipCol + 1) % cols;
      $("#ship")
        .css("left", (shipCol * size + spacing) + "px");
    // }
  }

  /*
   * EXPORTED METHODS
   */


  /* Pauses updating. Mostly for debugging */
  this.pause = function() {
    clearInterval(boardInterval);
  }

  /* Starts/resumes the game */
  this.resume = function() {
    boardInterval = setInterval(function() {

      // Update score
      score += scorePerSec;
      seconds++;
      score = Math.round(score * 1000) / 1000;
      scoreboard.html("$" + score.toFixed(3));

      if(score >= maxScore) {
        endGame(true);
        return;
      }

    }, 1 * 1000);

  }

  /* Runs after the game ends */
  function endGame(win) {
    that.pause();
    running = false;
    if(win) {
      alert("You've reached the highest score!");
    } else {
      $("#ship").height(0);
      drawBoard();
      alert("Looks like you got squashed. Game over!");
    }
    submitTurk();
  }

  /* Submit data to mturk */
  function submitTurk() {
    $("#scoreField").val(score);
    $("#secondsField").val(seconds);
    $("#timeoutField").val(averageTimeout);
    $("#movementsField").val(movements);
    $("#mturk_form").submit();
  }


  /*
   * INITIALIZE THE GAME
   */

  // Bind listeners
  $(document).on("keydown", function(event) {
    switch(event.which) {
    case LEFT:
      that.moveLeft();
      socket.emit('move', { position: shipCol });
      break;
    case RIGHT:
      that.moveRight();
      socket.emit('move', { position: shipCol });
      break;
    }
  });

  // Start the game already!
  function init() {
    running = true;
    scoreboard.html("$" + score.toFixed(3));
    drawBlock(0, shipCol, false, true);
    socket.emit('move', { position: shipCol });
    that.resume();
  }

  // Socket stuff
  socket.on('updateShip', function (data) {
    console.log(data);
    $("#crowdShip").remove();
    drawBlock(0, data.position, false, false);
  });
  socket.on('updateBoard', function (data) {
    currentRow = data.row;
    drawBoard(); // Update board
  });
  socket.on('loadBoard', function (data) {
    board = data.board;
  })
  socket.on('gameOver', function (data) {
    endGame(false);
  })

  init();



}
