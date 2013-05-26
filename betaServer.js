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
var mediaFolder = argv.media || "/media/";

var SongServer = require('./lib/songServer.js');

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
            console.log(ex);
        }
    } else {
        fileServer.serve(request, response);
    }
});
server.listen(PORT);

var websock = socketio.listen(server);

websock.configure(function() {
    websock.disable('log');
});

songServer.on("medialistChange", function (list) {
    websock.sockets.in('users').emit('medialist updated', list.toJSON());
});

songServer.on("playlistChange", function (playlist) {
    websock.sockets.in('users').emit('playlist updated', playlist.toJSON());
});

songServer.on("nowPlaying", function (media) {
    websock.sockets.in('users').emit('playlist updated', media.toJSON());
});



websock.sockets.on('connection', function(socket) {
    socket.join('users');
    
    var ip = socket.handshake.address.address;

    var user = songServer.connectUser(ip);
    
    socket.emit('init', {
        playlist: songServer.getPlayList().toJSON(),
        medialist: songServer.getMediaList().toJSON(),
        name: user.getName()
    });

    socket.on('song selected', function (song) {
        var name = song.name;
        songServer.enqueue(name, user);
    });
    
    socket.on('song removed', function(songIndex) {
        songServer.dequeue(song, user);
    });
});

// Send server stats
//setInterval(function() {
//    websock.sockets.in('users').emit('server stats', {
//        totalConnectedUsers: countTotalUsers(),
//        totalSongs: medialist.list.length
//    });
//}, 2000);

//playlist.onCurrentSongComplete = function(){
//    websock.sockets.in('users').emit('playlist updated', playlist.list);
//};

function countTotalUsers() {
    var count = 0;
    var users = websock.sockets.in('users').manager.connected;
    
    for (var u in users) {
        count++;
    }
    
    return count;
}

console.log('Server started on port: ' + PORT);

