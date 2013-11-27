'use strict';

var exec = require('child_process').exec,
    utils = require('util'),
    helper = require('./helper.js'),
    MediaList = require('./media.js').MediaList,
    EventEmitter = require('events').EventEmitter,
    driver = null;

function MediaPlayer() {
    this.isPlaying = false;
    this.currentMedia = null;
    this.queue = new MediaList();

    if (this.playerClient) {
        driver = require('./players/' + this.playerClient + 'Driver.js');
    } else {
        driver = require('./players/mplayerDriver.js');
    }
    helper.extend(MediaPlayer.prototype, driver.prototype);
    EventEmitter.call(this);
}

utils.inherits(MediaPlayer, EventEmitter);


MediaPlayer.prototype.getCurrentMedia = function () {
    return this.currentMedia;
};


MediaPlayer.prototype.enqueue = function (media) {
    if (this.queue.add(media)) {
        if (!this.isPlaying) {
            this.next();
        }
        this.sortPlaylist(true);
        this.emit('mediaQueued', media);
    }
};

MediaPlayer.prototype.dequeue = function (media) {
    if (this.queue.remove(media)) {
        this.sortPlaylist(true);
        this.emit('mediaRemoved', media);
    }
};

MediaPlayer.prototype.getqueue = function () {
    return this.queue;
};

MediaPlayer.prototype.next = function () {
    if (this.queue.size() > 0) {
        var media = this.queue.getNext();
        this.stop();
        this.emit('mediaRemoved', media, true);
        this.play(media);
    } else {
        this.emit('emptyQueue');
    }
};

MediaPlayer.prototype.sortPlaylist = function (silent) {
    var queue = this.queue;
    if (queue.size() > 0) {
        queue.sortByRating();
        if (!silent) {
            this.emit('mediaSorted');
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
