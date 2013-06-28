"use strict";

var http = require('http');
var staticServer = require('node-static');
var socketio = require('socket.io');

var formidable = require('formidable');

var fileServer = new staticServer.Server(__dirname + '/public');

var argv = require('optimist')
    .usage('Start the Song Server.\nUsage: $0')
    .alias('p', 'port')
    .describe('p', 'Port to start server on')
    .alias('m', 'media')
    .describe('m', 'The media folder(where songs will be stored) ex : -m "/media"')
    .argv
;

/* Setting Defaults */

var PORT = argv.port || 8085;
var mediaFolder = argv.media || "/media";

var SongServer = require('./lib/songServer.js');
var mediaFileServer = new staticServer.Server(__dirname + mediaFolder);
var songServer = new SongServer({
    directory: __dirname + mediaFolder
});




var server = http.createServer(function (request, response) {
    if (request.url === '/upload') {
        var form = new formidable.IncomingForm();
        try {
            form.parse(request, function(err, fields, files){
                if (!err) {
                    songServer.saveSongs(files);
                    songServer.once("songsSaved", function () {
                        response.end('ok');
                    });
                } else {
                    response.end('error');
                }
            });
        } catch(ex) {
            cme +onsole.log(ex);
        }
    } else if (request.url.indexOf("/mediaFiles") === 0) {
	mediaFileServer.serve(request, response);
    } else {
        fileServer.serve(request, response);
    }
});
server.listen(PORT);

var websock = socketio.listen(server);

websock.configure(function (){
    websock.set('authorization', function (handshakeData, callback) {
        songServer.connectUser(handshakeData.address.address, handshakeData.query.name);
        callback(null, true);
    });
});

websock.configure(function() {
    websock.disable('log');
});

songServer.on("mediaListChange", function (list) {
    websock.sockets.in('users').emit('mediaListChange', list.toJSON());
});

songServer.on("playListChange", function (playlist) {
    websock.sockets.in('users').emit('playListChange', playlist.toJSON());
});

songServer.on("nowPlaying", function (media) {
    websock.sockets.in('users').emit('nowPlaying', media.toJSON());
});




websock.sockets.on('connection', function(socket) {
    socket.join('users');
    
    var ip = socket.handshake.address.address;

    var user = songServer.connectUser(ip);

    socket.emit('init', {
        playList: songServer.getPlayList().toJSON(),
        mediaList: songServer.getMediaList().toJSON(),
        user: user.toJSON(),
        nowPlaying: songServer.getCurrentMedia(true)
    });

    socket.on('songSelected', function (song) {
        var name = song.name,
            result;

        result = songServer.enqueue(name, user);
        if (result instanceof Error) {
            socket.emit('error', {
                message: result.message,
                song: song
            });
        }
    });
    
    socket.on('userNameChange', function (name) {
        user.setName(name);
    });
    
    socket.on('songRemoved', function(song) {
        var result = songServer.dequeue(song, user);
        if (result instanceof Error) {
            socket.emit('error', result);
        }
    });
    
    socket.on('upVote', function(song) {
        songServer.upVote(song, user);
    });
    
    socket.on('downVote', function(song) {
        songServer.downVote(song, user);
    });
});

console.log('Server started on port: ' + PORT);

