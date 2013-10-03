var exec = require('child_process').exec,
    media = require('../media.js'),
    Media = media.Media,
    logger = require("../logger.js"),
    mpd = require("mpd"),
    cmd = mpd.cmd,
    client = null;


function mpdDriver(){
    // Connect to the server
    this.client = mpd.connect({
        port:6600,
        host : "localhost"
    });

};

mpdDriver.prototype.play = function (media) {
    if (!this.isPlaying && media instanceof Media){
        this.isPlaying = true;
        var command = 'mplayer -novideo \'' + media.getFullPath() + '\'';
        media.play();
        try{
            exec(command, {maxBuffer: 1024 * 1024}, this._songComplete.bind(this));
        }catch(e){
            logger.error(e);
        }
        this.currentMedia = media;
        this.emit('start', media);
    } else {
        var e = new Error(!this.isPlaying ? 'Player busy' : 'Invalid Media');
        this._currentRating = this.getRating();
        this.emit('error', e);
    }
};
mpdDriver.prototype._songComplete = function (err, stdout, stderr) {
    this.isPlaying = false;
    this.emit('end', err, this.currentMedia);
    this.currentMedia = null;
    this.next();
};

mpdDriver.prototype.stop = function () {
    if (this.isPlaying) {
        // Executing the following exec will execute '_songComplete' callback
        try{
            exec('killall mplayer');
        }catch(e){
            logger.error(e);
        }
        this.emit('stop', this.currentMedia);
    }
};

module.exports = mplayerDriver;