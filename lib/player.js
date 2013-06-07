'use strict';

var exec = require('child_process').exec,
    utils = require('util'),
    media = require('./media.js'),
    Media = media.Media,
    MediaList = media.MediaList,
    EventEmitter = require('events').EventEmitter;

function MediaPlayer () {
    this.isPlaying = false;
    this.currentMedia = null;
    this.queue = new MediaList();
    EventEmitter.call(this);
}

utils.inherits(MediaPlayer, EventEmitter);

MediaPlayer.prototype.play = function (media) {
    if (!this.isPlaying && media instanceof Media){
        this.isPlaying = true;
        var command = 'mplayer -novideo \'' + media.getFullPath() + '\'';
        media.play();
        exec(command, {maxBuffer: 1024 * 1024}, this._songComplete.bind(this));
        this.currentMedia = media;
        this.emit('start', media);
    } else {
        var e = new Error(!this.isPlaying ? 'Player busy' : 'Invalid Media');
        this.emit('error', e);
    }
};

MediaPlayer.prototype.getCurrentMedia = function () {
    return this.currentMedia;
},

MediaPlayer.prototype._songComplete = function (err, stdout, stderr) {
    this.isPlaying = false;
    this.emit('end', err, this.currentMedia);
    this.dequeue(this.currentMedia);
    this.currentMedia = null;
    this.next();
};

MediaPlayer.prototype.stop = function () {
    if (this.isPlaying) {
        this.isPlaying = false;
        // Executing the following exec will execute 'songComplete' callback
        exec('killall mplayer');
        this.deque(this.currentMedia);
        this.emit('stop', this.currentMedia);
    }
};

MediaPlayer.prototype.enqueue = function (media) {
    if (this.queue.add(media)) {
        this.emit("mediaQueued", media);
        if (!this.isPlaying) {
            this.next();
        }
    }
};

MediaPlayer.prototype.dequeue = function (media) {
    if (this.queue.remove(media)) {
        this.emit("mediaRemoved", media);
    }
};

MediaPlayer.prototype.getqueue = function () {
    return this.queue;
};

MediaPlayer.prototype.next = function () {
    if (this.queue.size() > 0) {
        var media = this.queue.getByIndex(0);
        this.stop();
        this.emit("next", media);
        this.play(media);
    } else {
        this.emit("emptyQueue");
    }
};

MediaPlayer.prototype.sortPlaylist = function () {
    var queue = this.queue;
    if (this.currentMedia === queue.getByIndex(0)) {
        queue.shift();
        queue.sortByRating();
        queue.unshift(this.currentMedia);
        this.emit("mediaSorted");
    }
};



module.exports = MediaPlayer;
