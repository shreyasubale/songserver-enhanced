var exec = require('child_process').exec,
media = require('../media.js'),
Media = media.Media;


function mplayerDriver(){
};

mplayerDriver.prototype.play = function (media) {
    if (!this.isPlaying && media instanceof Media){
        this.isPlaying = true;
        var command = 'mplayer -novideo \'' + media.getFullPath() + '\'';
        media.play();
        exec(command, {maxBuffer: 1024 * 1024}, this._songComplete.bind(this));
        this.currentMedia = media;
        this.emit('start', media);
    } else {
        var e = new Error(!this.isPlaying ? 'Player busy' : 'Invalid Media');
        this._currentRating = this.getRating();
        this.emit('error', e);
    }
};

mplayerDriver.prototype._songComplete = function (err, stdout, stderr) {
        this.isPlaying = false;
        this.emit('end', err, this.currentMedia);
        //this.dequeue(this.currentMedia);
        this.currentMedia = null;
        this.next();
    };

mplayerDriver.prototype.stop = function () {
    if (this.isPlaying) {
        this.isPlaying = false;
        // Executing the following exec will execute 'songComplete' callback
        exec('killall mplayer');
        this.deque(this.currentMedia);
        this.emit('stop', this.currentMedia);
    }
};

module.exports = mplayerDriver;