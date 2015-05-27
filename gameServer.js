// Written by Romain Cerovic 
//Based on the code of the Realtime Multiplayer Game in HTML5 code

var
        gameServer = module.exports = { games : {}, gameCount:0 },
        UUID        = require("node-uuid"),
        verbose     = true;

    global.window = global.document = global;

    require("./gameManager.js");

    gameServer.log = function() {
        if(verbose) console.log.apply(this,arguments);
    };

    gameServer.presetPing = 0;
    gameServer.lTime = 0;
    gameServer.deltaT = new Date().getTime();
    gameServer.deltaTe = new Date().getTime();

    gameServer.messages = [];

    setInterval(function(){
        gameServer.deltaT = new Date().getTime() - gameServer.deltaTe;
        gameServer.deltaTe = new Date().getTime();
        gameServer.lTime += gameServer.deltaT/1000.0;
    }, 4);

    gameServer.onMessage = function(client,message) {

        if(this.presetPing && message.split(".")[0].substr(0,1) == "i") {

            gameServer.messages.push({client:client, message:message});

            setTimeout(function(){
                if(gameServer.messages.length) {
                    gameServer.msgHandler( gameServer.messages[0].client, gameServer.messages[0].message );
                    gameServer.messages.splice(0,1);
                }
            }.bind(this), this.presetPing);

        } else {
            gameServer.msgHandler(client, message);
        }
    };
    
    gameServer.msgHandler = function(client,message) {

        var messageParts = message.split(".");
        var messageType = messageParts[0];

        var otherClient =
            (client.game.playerHost.userid == client.userid) ?
                client.game.playerClient : client.game.playerHost;

        //identifies the message based on the first character sent
        switch(messageType) {
    	case "i":
    		this.onInput(client,messageParts);
    		break;
    	case "p":
    		client.send("s.p" + messageParts[1]);
    		break;
    	case "c":
    		if(otherClient)
    			otherClient.send("s.c" + messageParts[1]);
    		break;
    	case "l":
    		this.presetPing = parseFloat(messageParts[1]);
    		break;
    	default:
    		this.log("No message received.");
    }

    };

    gameServer.onInput = function(client, parts) {

        var iCommands = parts[1].split("-");
        var iTime = parts[2].replace("-",".");
        var iSeq = parts[3];

        if(client && client.game && client.game.gameManager) {
            client.game.gameManager.handle_server_input(client, iCommands, iTime, iSeq);
        }

    };

    gameServer.createGame = function(player) {

        var aGame = {
                id : UUID(),
                playerHost:player,
                playerClient:null,
                playerCount:1
            };

        this.games[ aGame.id ] = aGame;

        this.gameCount++;

        aGame.gameManager = new game_Manager( aGame );
        aGame.gameManager.update( new Date().getTime() );

        player.send("s.h."+ String(aGame.gameManager.lTime).replace(".","-"));
        console.log("server host at  " + aGame.gameManager.lTime);
        player.game = aGame;
        player.hosting = true;
        
        this.log("Game created with ID of " + player.game.id + "by player " + player.userid);

        return aGame;

    }; 

    gameServer.endGame = function(gameid, userid) {

        var aGame = this.games[gameid];

        if(aGame) {

            aGame.gameManager.stop_update();

            if(aGame.playerCount > 1) {

                if(userid == aGame.playerHost.userid) {

                    if(aGame.playerClient) {
                        aGame.playerClient.send("s.e");
                        this.findGame(aGame.playerClient);
                    }
                    
                } else {
                    if(aGame.playerHost) {
                        aGame.playerHost.send("s.e");
                        aGame.playerHost.hosting = false;
                        this.findGame(aGame.playerHost);
                    }
                }
            }

            delete this.games[gameid];
            this.gameCount--;

        } else {
            this.log("404 Game not found!");
        }

    };

    gameServer.startGame = function(game) {

        game.playerClient.send("s.j." + game.playerHost.userid);
        game.playerClient.game = game;

        game.playerClient.send("s.r."+ String(game.gameManager.lTime).replace(".","-"));
        game.playerHost.send("s.r."+ String(game.gameManager.lTime).replace(".","-"));
 
        game.active = true;
    };

    gameServer.findGame = function(player) {

        this.log("looking for a game. We have : " + this.gameCount);

        if(this.gameCount) {
                
            var joined_a_game = false;

            for(var gameid in this.games) {
                if(!this.games.hasOwnProperty(gameid)) continue;

                var game_instance = this.games[gameid];

                if(game_instance.playerCount < 2) {

                    joined_a_game = true;

                    game_instance.playerClient = player;
                    game_instance.gameManager.players.other.instance = player;
                    game_instance.playerCount++;

                    this.startGame(game_instance);

                }
            } 

            if(!joined_a_game) {

                this.createGame(player);
            }

        } 
        else { 

            this.createGame(player);
        }

    };