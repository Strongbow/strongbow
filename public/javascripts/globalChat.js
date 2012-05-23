function setStatus(myStatus){
	chatGlobal.myStatus=myStatus;
	socket.emit('adduser', {name:chatGlobal.myName, status:myStatus});
}
function checkMoreButton(){
	if (chatGlobal.earliestMessage == 1){
		$("#more").hide();
	}
	else {
		$("#more").show();
	}
}
function timeConverter(timestamp){
	var a = new Date(parseInt(timestamp,10));
	return a.toLocaleString();
}
function putStatusBox(){
	return "<input type='text' value='"+chatGlobal.myStatus+"' id='updateStatus'>";
}
var chatGlobal={earliestMessage:Number.MAX_VALUE, oldestMessage:Number.MIN_VALUE, myStatus:''};
var socket = io.connect('http://bovineamerica.com:3000');

// on connection to server, ask for user's name with an anonymous callback
socket.on('connect', function(){
	// call the server-side function 'adduser' and send one parameter (value of prompt)
	if (typeof chatGlobal.myName === 'undefined'){
		chatGlobal.myName=prompt("What's your name?");
	}
	socket.emit('adduser', {name:chatGlobal.myName, status:chatGlobal.myStatus});
});

// listener, whenever the server emits 'updatechat', this updates the chat body
socket.on('updatechat', function (username, data) {
	if (data.messageid < chatGlobal.earliestMessage) {
		$('#conversation').append("<span class='time'>"+timeConverter(data.timestamp)+'</span> <b>'+username + ':</b> ' + data.message + '<br>');
		chatGlobal.earliestMessage=data.messageid;
	}
	else if (typeof data.messageid === 'undefined' || data.messageid > chatGlobal.oldestMessage){
		$('#conversation').prepend("<span class='time'>"+timeConverter(data.timestamp)+'</span> <b>'+username + ':</b> ' + data.message + '<br>');
		if (typeof data.messageid !== 'undefined') chatGlobal.oldestMessage=data.messageid;
	}
	checkMoreButton();
});

// listener, whenever the server emits 'updateusers', this updates the username list
socket.on('updateusers', function(data) {
	$('#users').empty();
	$.each(data, function(key, value) {
		if (chatGlobal.myName != key){
			$('#users').prepend('<div class="user '+key+'">'+key+'<div class="status">'+value.status+'</div></div>');
		}
		else{
			$('#users').prepend('<div class="user '+key+'">'+key+'<div>'+putStatusBox()+'</div></div>');
		}
	});
});

// on load of page
$(function(){
	// when the client clicks SEND
	$('#datasend').click( function() {
		var message = $('#data').val();
		$('#data').val('');
		// tell server to execute 'sendchat' and send along one parameter
		socket.emit('sendchat', message);
	});

	// when the client hits ENTER on their keyboard
	$('#data').keypress(function(e) {
		if(e.which == 13) {
			$('#datasend').click();
		}
	});
	$("#updateStatus").live("keypress",function(e){
		if (e.which == 13){
			setStatus($("#updateStatus").val());
		}
	});
	$("#more").click(function(){
		socket.emit('more',chatGlobal.earliestMessage);
	});
});
