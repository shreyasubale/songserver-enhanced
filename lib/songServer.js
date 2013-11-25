'use strict';
var util = require('util'),
    helper = require('./helper.js'),
    fs = require('fs'),
    MediaList = require('./media.js').MediaList,
    logger = require('./logger.js'),
    UserCollection = require('./user.js').UserCollection,
    Player = require('./player.js'),
    EventEmitter = require('events').EventEmitter,
    config = require('../config.js'),
    TagManager = require('./tagManager.js');

var tagManager = new TagManager();

function SongServer(config) {
    this.player = null;
    this.baseDir = config.directory || '/media/';
    this.users = null;
    this.mediaList = null;
    this.setAdminList(config.adminList || []);
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

    setAdminList: function (list) {
        if (Array.isArray(list)) {
            this.adminList = list.map(function (ip) {
                return ip.trim();
                //trimming is not required since we accept ips through command line
                //keeping this as a safe check
            });
        } else {
            throw new Error('Admin list must be an Array');
        }
    },

    getMediaList: function () {
        return this.mediaList;
    },

    getMediaByName: function (name) {
        return this.mediaList.getByName(name);
    },

    connectUser: function (ip, name, oldIP) {
        if (this.users.has(ip)) {
            return this.users.getByIp(ip).setActive(true);
        } else {
            /*if (oldIP && this.users.has(oldIP)) {
                return this.users.changeIP(oldIP, ip);
            }*/
            /* jshint bitwise: false */
            return this.users.add(ip, name, !!~this.adminList.indexOf(ip));
        }
    },

    disConnectUser: function (ip) {
        this.getUser(ip).setActive(false);
    },

    getUser: function (ip) {
        return this.users.get(ip);
    },

    stopPlaying: function () {
        this.player.stop();
    },

    skipSong: function (user) {
        user = this.getUser(user);

        if (user.isAdmin) {
            this.stopPlaying();
            return true;
        } else {
            return new Error('permission');
        }
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
        if (!this.player.has(media)) {
            if (user.queuedSongsCount < config.maxSongLimitPerIP) {
                if (!user.songAddedOn || ((Date.now() - user.songAddedOn) > (config.songSelectionGap * 1000))) {
                    user.songAddedOn = Date.now();
                    media.setUser(user);
                    this.player.enqueue(media);
                    return true;
                } else {
                    return new Error('Spam');
                }

            } else {
                return new Error('LimitReached');
            }
        } else {
            return new Error('SongExists');
        }
    },

    dequeue: function (name, user) {
        var song = this.player.getSongByName(name);

        user = song.user;

        if (user.ip === user.ip || user.isAdmin) {
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
            return true;
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
            return true;
        } else {
            return new Error('conflict');
        }
    },

    addSong: function (name) {
        this.mediaList.add(name, this.baseDir);
    },

    removeSong: function (name) {
        this.mediaList.remove(name, this.baseDir);
    },


    saveSongs: function (files) {
        var totalFiles = Object.keys(files).length,
            count = 0;

        tagManager.parseFiles(files, function (metaData, fileName) {
            count++;
            this.addSong(fileName);
            if (count === totalFiles) {
                this.emit('songsSaved');
                this.emit('mediaListChange', this.getMediaList());
            }
        }.bind(this));
    },

    fetchMediaList: function () {
        var list = [];

        try {
            list = fs.readdirSync(this.baseDir);
        } catch (e) {
            if (e.code === 'ENOENT') {
                logger.log('creating media folder!!');
                fs.mkdirSync(this.baseDir);
            }
        } finally {
            list.forEach(function (song) {
                this.addSong(song);
            }, this);
        }
    },

    getStats: function () {
        var activeCount = 0;
        this.users.forEach(function (user) {
            if (user.isActive) {
                activeCount++;
            }
        });

        return {
            playList: this.getPlayList().size(),
            mediaList: this.getMediaList().size(),
            users: this.users.size(),
            active: activeCount,
            isPlaying: this.player.isPlaying
        };
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

        player.on('start', function (media) {
            oThis.emit('nowPlaying', media);
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
