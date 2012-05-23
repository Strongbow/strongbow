/**
 * Functions we'll need later
 */
function sendOldMessage(theSocket,messageid){
	redisClient.hgetall ('m'+messageid, function(err,obj){
		//send it to the browser
		theSocket.emit('updatechat',obj.user,{message:obj.message, messageid:messageid, timestamp:obj.timestamp});
	});
}


/**
 * Module dependencies.
 */
//express is our framework which all of this will work in
var express = require('express');
//set up our simple page routes based on what requests we get from the client
var routes = require('./routes/index.js');
var app = module.exports = express.createServer();
//socket.io is the library that does the user agent <-> server communication once things are up and running
var io = require('socket.io').listen(app);
//redis is our key:value storage system
var redisClient = require('redis').createClient();

//we'll use this as our namespace for the chat stuff
var chatGlobal={};
// usernames which are currently connected to the chat
chatGlobal.usernames = {};

//set our logging level in socket.io
io.set('log level',3);
//make our jade output pretty
app.set('view options', { pretty: true });
// Configuration

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
	app.use(express.errorHandler());
});

// Routes
app.get('/', routes.index);
app.listen(3000, function(){
	console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

//here are our actions for socket events
io.sockets.on('connection', function (socket) {
	
	//send our old messages
	if (chatGlobal.lastMessage > 10){
		start=chatGlobal.lastMessage-10;
	}
	else {
		start=1;
	}
	end=chatGlobal.lastMessage;
	for (var i=start;i <= end; i++){
		sendOldMessage(socket,i);
	}

	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		var now=new Date().getTime();
		//increment lastMessage in our data store
		redisClient.incr("lastMessage",function(err,reply){
			//increment our message count variable
			chatGlobal.lastMessage++;
			//then use that number to store our next hash
			redisClient.HMSET('m'+reply,{user:socket.username,message:data,timestamp:now});
			// we tell the client to execute 'updatechat' with 2 parameters
			io.sockets.emit('updatechat', socket.username, {message:data, messageid:chatGlobal.lastMessage,timestamp:now});
		});
	});

	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(userO){
		// we store the username in the socket session for this client
		if (typeof socket.username === 'undefined'){
			socket.username = userO.name;
			// echo to client they've connected
			socket.emit('updatechat', 'SERVER', {message:'you have connected',timestamp:new Date().getTime()});
			// echo globally (all clients) that a person has connected
			socket.broadcast.emit('updatechat', 'SERVER', {message:userO.name + ' has connected',timestamp:new Date().getTime()});
		}
		// add the client's username to the global list
		chatGlobal.usernames[userO.name] = {status:userO.status};
		// update the list of users in chat, client-side
		io.sockets.emit('updateusers', chatGlobal.usernames);
	});

	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		// remove the username from global usernames list
		delete chatGlobal.usernames[socket.username];
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', chatGlobal.usernames);
		// echo globally that this client has left
		socket.broadcast.emit('updatechat', 'SERVER', {message:socket.username + ' has disconnected',timestamp:new Date().getTime()});
	});
	socket.on('more',function(data){
	
		var start=data-10;
		if (start < 1) start=1;
		var end=data;
		if (end === Number.MAX_VALUE) return;
		for (var i=end;i >= start; i--){
			sendOldMessage(socket,i);
		}
	});
});

redisClient.on("error", function (err) {
	console.log("Error " + err);
});

redisClient.get("lastMessage",function(err,result){
	chatGlobal.lastMessage=result;
});
