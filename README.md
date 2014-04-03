Crowd-powered Game
=================

A simple game to be played by multiple people at the same time. Because why not.
Also because it's a homework assignment.

Gameplay
--------

Each client controls a white "cursor" using the left and right arrow keys. This
influences the position of the red "ship." How does it influence the ship? Based
on the mediator settings (see "Mediator" below). The object is to get the ship
to not hit any green blocks.


Installing
----------

Installing and running is pretty straightforward.

		git clone https://github.com/bichiliad/crowd-game.git
		cd crowd-game
		npm install
		npm start

This app runs [forever][forever], so once it's up, it'll stay up until you kill it.


Running
-------

To run it, just navigate to ```host:5000``` and start playing. Send a bunch of people
there for _hours_ of fun.


Mediator
--------

 * Navigate to ```/average``` to set the mediator mode to "average". This takes the
   average position of all clients and uses this to set the ship's position. This
	 is default.
 * Navigate to ```/better``` to set the mediator mode to "better". This takes the
   average position of all active clients (i.e. have moved within the past fifteen
	 seconds). It also weighs clients that have been playing for longer than a minute
	 twice as high as those who have played shorter.


[forever]:https://github.com/nodejitsu/forever
