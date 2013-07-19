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
	try{
          exec(command, {maxBuffer: 1024 * 1024}, this._songComplete.bind(this));
        }catch(e){
	  console.log(e);
	}
	this.currentMedia = media;
        this.emit('start', media);
    } else {
        var e = new Error(!this.isPlaying ? 'Player busy' : 'Invalid Media');
          this._currentRating = this.getRating();
      this.emit('error', e);
    }
};

MediaPlayer.prototype.getCurrentMedia = function () {
    return this.currentMedia;
},

MediaPlayer.prototype._songComplete = function (err, stdout, stderr) {
    this.isPlaying = false;
    this.emit('end', err, this.currentMedia);
    this.currentMedia = null;
    this.next();
};

MediaPlayer.prototype.stop = function () {
    if (this.isPlaying) {
        // Executing the following exec will execute '_songComplete' callback
        try{
	 exec('killall mplayer');
	}catch(e){
	 console.log(e);
	}
        this.emit('stop', this.currentMedia);
    }
};

MediaPlayer.prototype.enqueue = function (media) {
    if (this.queue.add(media)) {
        if (!this.isPlaying) {
            this.next();
        }
        this.sortPlaylist(true);
        this.emit("mediaQueued", media);
    }
};

MediaPlayer.prototype.dequeue = function (media) {
    if (this.queue.remove(media)) {
        this.sortPlaylist(true);
        this.emit("mediaRemoved", media);
    }
};

MediaPlayer.prototype.getqueue = function () {
    return this.queue;
};

MediaPlayer.prototype.next = function () {
    if (this.queue.size() > 0) {
        var media = this.queue.getNext();
        this.stop();
        this.emit("mediaRemoved", media, true);
        this.play(media);
    } else {
        this.emit("emptyQueue");
    }
};

MediaPlayer.prototype.sortPlaylist = function (silent) {
    var queue = this.queue;
    if (queue.size() > 0) {
        queue.sortByRating();
        if (!silent) {
            this.emit("mediaSorted");
        }
    }
};

MediaPlayer.prototype.getSongByName = function (name) {
    var queue = this.queue;
    return queue.getByName(name);
};

MediaPlayer.prototype.has = function (song) {
    return (this.queue.has(song) || (song === this.currentMedia));
};

module.exports = MediaPlayer;
