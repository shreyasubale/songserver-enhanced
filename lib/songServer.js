"use strict";
var util = require("util"),
    helper = require("./helper.js"),
    fs = require('fs'),
    Media = require('./media.js').Media,
    MediaList = require('./media.js').MediaList,
    User = require('./user.js').User,
    UserCollection = require('./user.js').UserCollection,
    Player = require("./player.js"),
    EventEmitter = require("events").EventEmitter;

function SongServer(config) {
    this.player = null;
    this.baseDir = config.directory || "/media/";
    this.users = null;
    this.mediaList = null;
    EventEmitter.call(this);
    this.init();
}

util.inherits(SongServer, EventEmitter);

helper.extend(SongServer.prototype, {
    constructor: SongServer,
    
    init: function () {
         this.mediaList = new MediaList();
         this.users = new UserCollection();
         this.initPlayer();
         this.fetchMediaList();
    },
    
    getMediaList: function () {
        return this.mediaList;
    },
    
    getMediaByName: function (name) {
        return this.mediaList.getByName(name);
    },
    
    connectUser: function (ip, name) {
        if (this.users.has(ip)) {
            return this.users.getByIp(ip).connect();
        } else {
            return this.users.add(ip, name);
        }
    },
    
    disConnectUser: function (ip) {
        this.getUser(ip).disConnect();
    },
    
    getUser: function (ip) {
        return this.users.get(ip);
    },
    
    stopPlaying: function () {
        this.player.stop();
    },
    
    playNextSong: function () {
        this.player.next();
    },
    
    getPlayList: function () {
        return this.player.getqueue();
    },
    
    enqueue: function (name, ip) {
        var media = this.getMediaByName(name),
            user = this.getUser(ip);
        
        media.setUser(user);
        this.player.enqueue(media);
    },
    
    upVote: function (name, ip) {
        var media = this.getMediaByName(name),
            user = this.getUser(ip);
        
        media.upVote(user);    
    },
    
    downVote: function (name, ip) {
        var media = this.getMediaByName(name),
            user = this.getUser(ip);
        
        media.downVote(user);    
    },
    
    removeFromQueue: function (name) {
        this.player.deque(name);
    },
    
    addSong: function (name) {
        this.mediaList.add(name, this.baseDir);
    },
    
    saveSongs: function (files) {
        var oThis = this,
            totalFiles = 0,
            baseDir = this.baseDir;

        for (var j in files) {
            totalFiles++;
        }

        var count = 0;
        for (var i in files) {
            var file = files[i];
            fs.rename(file.path, baseDir + file.name, (function(filename, err){
                count++;
                if (err) {
                    console.error(err);
                } else {
                    this.addSong(filename);
                }
                
                if (count === totalFiles) {
                    this.emit("songsSaved");
                    this.emit("mediaListChange", this.getMediaList());
                }
            }).bind(this, file.name));
        }
    },
    
    fetchMediaList: function () {
        var list = [];
   
        try {
            list = fs.readdirSync(this.baseDir);
        } catch (e) {
            if (e.code === 'ENOENT') {
                console.log("creating media folder!!");
                fs.mkdirSync(this.baseDir);
            }
        } finally {
            list.forEach(function (song) {
                this.addSong(song);
            }, this);
        }
    },
    
    getCurrentMedia: function (returnJSON) {
        var media = this.player.getCurrentMedia();
        if (returnJSON && media) {
            return media.toJSON();
        }
        return media;
    },
    
    initPlayer: function () {
        var oThis = this,
            player;
            
        player = oThis.player = new Player();
        
        player.on("start", function (media) {
            oThis.emit("nowPlaying", media);
        }).on('end', function (media) {
            oThis.emit('end', media);
        }).on('next', function (media) {
            oThis.emit('next', media);
        }).on('mediaQueued', function () {
            oThis.emit('playListChange', this.getqueue());
        }).on('mediaRemoved', function (media) {
            media.clearVotes();
            oThis.emit('playListChange', this.getqueue());
        });
    }
});

module.exports = SongServer;
