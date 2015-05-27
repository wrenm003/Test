// Written by Matthew Wren
// Based on the code of Realtime Multiplayer in HTML 5 
// client.js sets the game up for players joining the already made game.

var game = {};

window.onload = function(){

	//Creates the game client instance.
	game = new game_Manager();

		//Gets viewport for game client
		game.viewport = document.getElementById('viewport');
		
		//Adjusts the size of the client's viewport
		game.viewport.width = game.world.width;
		game.viewport.height = game.world.height;

		//Gets the rendering contexts
		game.ctx = game.viewport.getContext('2d');

		//Sets the font size and type
		game.ctx.font = '12px "Arial"';

	//Starts the game loop
	game.update( new Date().getTime() );
}
