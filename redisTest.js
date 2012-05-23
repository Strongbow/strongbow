console.log(new Date().getTime());

var redis = require("redis"),
    client = redis.createClient();

client.on("error", function (err) {
    console.log("error event - " + client.host + ":" + client.port + " - " + err);
});

client.set("lastMessage",0);
client.hmset ("1",{user:'sheetzam',message:'This was the message'});
client.hgetall ("1", function(err,obj){
	console.dir(obj);
});
/*
client.set("string key", "string val", redis.print);
client.hset("hash key", "hashtest 1", "some value", redis.print);
client.hset(["hash key", "hashtest 2", "some other value"], redis.print);
client.hkeys("hash key", function (err, replies) {
    if (err) {
        return console.error("error response - " + err);
    }

    console.log(replies.length + " replies:");
    replies.forEach(function (reply, i) {
        console.log("    " + i + ": " + reply);
    });
});
*/
client.quit(function (err, res) {
    console.log("Exiting from quit command.");
});