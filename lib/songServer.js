"use strict";
var util = require("util"),
    helper = require("./helper.js"),
    fs = require('fs'),
    Media = require('./media.js').Media,
    MediaList = require('./media.js').MediaList,
    User = require('./user.js').User,
    UserCollection = require('./user.js').UserCollection,
    Player = require("./player.js"),
    EventEmitter = require("events").EventEmitter,
    config = require('../config.js');

function SongServer(config) {
    this.player = null;
    this.baseDir = config.directory || "/media/";
    this.users = null;
    this.mediaList = null;
    this.adminList = config.adminlist;
    EventEmitter.call(this);
    this.init(config);
}

util.inherits(SongServer, EventEmitter);

helper.extend(SongServer.prototype, {
    constructor: SongServer,
    
    init: function (config) {
         this.mediaList = new MediaList();
         this.users = new UserCollection(this.adminList);
         this.initPlayer(config.playerClient);
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
        if (user.queuedSongsCount < config.maxSongLimitPerIP) {
            if (!this.player.has(media)) {
                
                if (!user.songAddedOn || ((Date.now() - user.songAddedOn) > (config.songSelectionGap * 1000))) {
                    user.songAddedOn = Date.now();
                    media.setUser(user);
                    this.player.enqueue(media);
                    return true;
                } else {
                    return new Error('Spam');
                }
                
            } else {
                return new Error('SongExists');
            }
        } else {
            return new Error('LimitReached');
        }
    },
    
    dequeue: function (name, user) {
        var song = this.player.getSongByName(name),
            user = song.user;

        if (user.ip === user.ip || user.isAdmin === true) {
            this.player.dequeue(song);
            return true;
        }
        return new Error('NotAllowed');
    },

    upVote: function (name, ip) {
        var media = this.getMediaByName(name),
            user = this.getUser(ip);
        if (media.user !== user) {
            media.upVote(user);
            this.player.sortPlaylist();
        } else {
            return new Error('conflict');
        }
    },
    
    downVote: function (name, ip) {
        var media = this.getMediaByName(name),
            user = this.getUser(ip);
        
        if (media.user !== user) {
            media.downVote(user);
            this.player.sortPlaylist();
         } else {
            return new Error('conflict');
         }
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
    
    initPlayer: function (playerClient) {
        var oThis = this,
            player;
            
        player = oThis.player = new Player(playerClient);
        
        player.on("start", function (media) {
            oThis.emit("nowPlaying", media);
        }).on('end', function (err, media) {
            media.clearVotes();
            oThis.emit('end', media);
        }).on('next', function (media) {
            oThis.emit('next', media);
        }).on('mediaQueued', function (media) {
            media.user.queuedSongsCount++;
            oThis.emit('playListChange', this.getqueue());
        }).on('mediaRemoved', function (media, isPlaying) {
            if (!isPlaying) {
                media.clearVotes();
            }
            media.user.queuedSongsCount--;
            oThis.emit('playListChange', this.getqueue());
        }).on('mediaSorted', function () {
            oThis.emit('playListChange', this.getqueue());
        });
    }
});

module.exports = SongServer;
