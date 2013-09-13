'use strict';

var Users = require("./user.js").UserCollection;
// var meta = require("../metaData.js");

function Media(name, path) {
    this.name = name;
    this.path = path;
    this._info = null;
    this._albumArt = null;
    this.likes = 0;
    this._likers = new Users();
    this._disLikers = new Users();
    this.disLikes = 0;
    this.playCount = 0;
    this._currentRating = 0;
    this.user = null;
    this._time = 0;
}

Media.prototype = {
    getFullPath: function () {
        return this.path + this.name;
    },
    
    setUser: function (user) {
        this.user = user;
    },
    
    getUser: function () {
        return this.user;
    },
    
    getAlbumArt: function () {
    
    },
    
    getInfo: function () {
       //return meta[this.name]||{};
    },
    
    _fetchInfo: function () {
    
    },
    
    upVote: function (user) {
        if (this._disLikers.has(user)) {
            this.disLikes--;
            this._disLikers.remove(user);
            return this.likes;
        } else if (this._likers.has(user)) {
            return this.likes;
        } else {
            this._likers.add(user);
            return ++this.likes;
        }
    },
    
    downVote: function (user) {
        if (this._likers.has(user)) {
            this.likes--;
            this._likers.remove(user);
            return this.disLikes;
        } else if (this._disLikers.has(user)) {
            return this.disLikes;
        } else {
            this._disLikers.add(user);
            return ++this.disLikes;
        }
    },
    
    play: function () {
        return ++this.playCount;
    },
    
    getScore: function () {
        return this.likes - this.disLikes;
    },
    
    _getRating: function () {
        var total = this.getTotalVotes();
        
        return (total === 0 ? 0 : (5 * (this.likes / total)));
    },
    
    getRating: function () {
        var rating = this._getRating();
        
        if (this._currentRating === 0) {
            return rating;
        } else if (rating === 0) {
            return this._currentRating;
        } else {
            return (this._currentRating + rating) / 2;
        }
    },
     
    getTotalVotes: function () {
        return this.likes + this.disLikes;
    },
    
    //modification of Wilson score confidence
    getWeightedRating: function () {
        var s = this.getScore(),
            t = this.getTotalVotes(),
            z = 1.6, //95% confidence
            zz = z * z,
            p, left, right, under, wr;

        if (t === 0) {
            return 0;
        }
        
        p = (this.likes || this.disLikes) / t;
        
        left = p + 1/(2*t)*zz;
        right = z * Math.sqrt(p*(1-p)/t + zz/(4*t*t));
        under = 1 + 1/t*zz;
        
        wr = (left - right) / under;
        
        if (!this.likes) {
            wr = -wr;
        }
        return wr;
    },
    
    clearVotes: function () {
        this._currentRating = this.getRating();
        this.likes = this.disLikes = 0;
        this._likers.clear();
        this._disLikers.clear();
    },
    
    toJSON: function () {
        var user = this.getUser();
        return {
           name: this.name,
           likes: this.likes,
           dislikes: this.disLikes,
           //total: this.getTotalVotes(),
           rating: this._getRating(),
           value: this.getScore(),
           weightedRating: this.getWeightedRating(),
           playCount: this.playCount,
           user: user && user.toJSON(),
           likers: this._likers.toJSON(),
           info : this.getInfo(),
           dislikers: this._disLikers.toJSON()
        };
    }
};

function MediaList(list) {
    this._medias = [];
    this._lookup = {};
    if (list) {
        this.add(list);
    }
}


MediaList.prototype = {

    constructor: MediaList,
    
    getByName: function (name) {
        return this._lookup[name];
    },
    
    has: function (obj) {
        return !!this._lookup[(obj instanceof Media) ? obj.name : obj];
    },
    
    size: function () {
        return this._medias.length;
    },
    
    getNext: function () {
        var song = this._medias.shift();
        delete this._lookup[song.name];
        return song;
    },
    
    getByIndex: function (index) {
        return this._medias[index];
    },
    
    add: function (medias) {
        if (Array.isArray(medias)) {
            medias.forEach(function (media) {
                this._add(media);
            }, this);
        } else {
            return this._add.apply(this, arguments);
        }
    },
    
    _add: function (obj, path) {
        var m;
        if (typeof obj === 'string' && typeof path === 'string') {
            m = new Media(obj, path);
        } else if (obj instanceof Media) {
            m = obj;
        }
        
        if (m && !this._lookup[m.name]) {
            this._lookup[m.name] = m;
            this._medias.push(m);
            m._time = Date.now();
            return true;
        }
        return false;
    },
    
    remove: function (obj) {
        var index = -1,
            name;
        if (typeof obj === 'string') {
            index = this.indexOf(this._lookup[obj]);
            name = obj;
        } else if (obj instanceof Media) {
            index = this.indexOf(obj);
            name = obj.name;
        }
        if (index !== -1) {
            this._medias.splice(index, 1);
            return delete this._lookup[name];
        }
        return false;
    },
    
    toJSON: function () {
        return this.map(function(media) {
            return media.toJSON();
        });
    },
    
    sortByRating: function () {
        this.sort(function (a, b) {
            var ar = a.getWeightedRating(),
                br = b.getWeightedRating();

            if (br === ar) {
                return a._time - b._time;
            }
            return br - ar;
        });
    }
};
// has bug in pop/unshift/splice (_lookup is not handled in these cases)
['forEach', 'map', 'filter', 'slice', 'splice', 'indexOf', 'push', 'pop', 'sort',
    'shift', 'unshift'].forEach(function (method) {
    MediaList.prototype[method] = function () {
        return this._medias[method].apply(this._medias, arguments);
    };
});



exports.Media = Media;
exports.MediaList = MediaList;
