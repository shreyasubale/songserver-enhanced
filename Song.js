"use strict";

var crypto = require("crypto");
var fs = require('fs');

function Song(args){
    this.path = args.path;
    this.type = args.type;
    this.addedOn = args.addedOn;
    this.addedByIP = args.addedByIP;
    this.username = args.username;
    this.md5hash = null;
    this.getHash(args.path);
}

Song.prototype.getHash = function(filePath){
	filePath = "./media/"+filePath;
	var md5 = crypto.createHash("md5");
	var stream = fs.ReadStream(filePath);
	stream.on('data', function(d) { md5.update(d); });
	stream.on('end', function() {
	    var d = md5.digest('hex');
	    this.md5hash = d;
	});
}
module.exports = Song;
