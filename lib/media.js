'use strict';

var Users = require("./user.js").UserCollection;

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
    
    },
    
    _fetchInfo: function () {
    
    },
    
    upVote: function (user) {
        if (this._disLikers.has(user)) {
            this.disLikes--;
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
    
    getValue: function () {
        return this.likes - this.disLikes;
    },
    
    _getRating: function () {
        var total = this.getTotalVotes();
        
        return (total === 0) ? total : (5 * (this.likes / (this.likes + this.disLikes)));
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
    
    clearVotes: function () {
        this.likes = this.disLikes = 0;
        this._likers.clear();
        this._disLikers.clear();
        this._currentRating = this.getRating();
    },
    
    toJSON: function () {
        var user = this.getUser();
        return {
           name: this.name,
           likes: this.likes,
           dislikes: this.disLikes,
           total: this.getTotalVotes(),
           rating: this.getRating(),
           value: this.getValue(),
           playCount: this.playCount,
           user: user && user.toJSON()
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
        return this._medias.shift();
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
    }
};

['forEach', 'map', 'filter', 'slice', 'splice', 'indexOf', 'push', 'pop', 'sort'].forEach(function (method) {
    MediaList.prototype[method] = function () {
        return this._medias[method].apply(this._medias, arguments);
    };
});



exports.Media = Media;
exports.MediaList = MediaList;
