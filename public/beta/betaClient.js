"use strict";

var EventEmitter = function () {

    return {
        on: function (name, cb, ctx) {
            var e = (this._events || (this._events = Object.create(null)));

            e[name] = (e[name] || []);
            e[name].push({
                callback: cb,
                context: ctx || null
            });
            return this;
        },

        off: function (name, cb) {
            var callbacks,
                retain;

            if (arguments.length === 0) {
                this._events = Object.create(null);
                return;
            }
            if (!this._events || !this._events[name]) {
                throw new Error("Invalid event --> " + name);
            }
            callbacks = this._events[name];

            if (Array.isArray(callbacks)) {
                this._events[name] = retain = [];
                callbacks.forEach(function (obj) {
                    if (cb !== obj.callback) {
                        retain.push(obj);
                    }
                });
            }
        },

        trigger: function (name) {
            var args,
                objs,
                key;

            if (this._events && (objs = this._events[name]) && Array.isArray(objs)) {
                args = Array.prototype.slice.call(arguments, 1);
                objs.forEach(function (obj) {
                    obj.callback.apply(obj.context || null, args);
                });
            }
            if (this._events && (objs = this._events.all) && Array.isArray(objs)) {
                objs.forEach(function (obj) {
                    obj.callback.apply(obj.context || null, arguments);
                });
            }
        },

        listenTo: function (name, cb) {
            return app.Events.on(name, cb.bind(this));
        }
    };
};

var SongServer = (function () {
    
    var mediaList,
        playList,
        socket,
        user,
        username = "";

    return $.extend(EventEmitter(), {
        getName: function () {
            username = username || localStorage.getItem("username") || "";
            return username;
        },
        
        setName: function (name) {
            username = name.trim();
            localStorage.setItem("username", name);
            socket.emit('userNameChange', name);
        },
        
        init: function () {
            this.bindSocketEvents();
        },
        
        bindSocketEvents: function () {
            socket = io.connect(null, {query: "name=" + this.getName()});
            socket.on('init', this.onInit.bind(this));
            socket.on('message', this.onMessage, this);
            socket.on('mediaListChange', this.onMediaListChange.bind(this));
            socket.on("playListChange", this.onPlayListChange.bind(this));
            socket.on('nowPlaying', this.onSongStart.bind(this));
        },
        
        uploadSongs: function (files, addtoQueue) {
            var oThis = this,
                formData = new FormData(),
                xhr = new XMLHttpRequest();
                
            for (var i = 0; i < files.length; i++){
                formData.append("file" + i, files[i]);
            }
            
            if (addtoQueue) {
                formData.append("addToQueue", true);
            }

            xhr.open("post", "upload");
            xhr.onreadystatechange = function(){
                if (this.readyState == 4 && this.status == 200) {
                   oThis.trigger("uploadSuccess", files);
                }
            };
            xhr.upload.onprogress = function(e){
                if (e.lengthComputable){
                    var percent = Math.floor((e.loaded / e.total) * 100);
                    oThis.trigger("uploadProgress", percent);
                }
            };
            xhr.send(formData);
        },
        
        onMediaListChange: function (list) {
            mediaList = list;
            this.trigger("mediaListChange", list);
        },
        
        onPlayListChange: function (list) {
            playList = list;
            this.trigger("playListChange", list);
        },

        onInit: function (data) {
            user = data.user;
            this.trigger('userInfo', user);
            this.onMediaListChange(data.mediaList);
            this.onPlayListChange(data.playList);
            if (data.nowPlaying) {
                this.onSongStart(data.nowPlaying);
            }
        },
        
        getPlayList: function () {
            return playList;
        },
        
        getMediaList: function () {
            return mediaList;
        },
        
        upVote: function (song) {
            socket.emit('upVote', song.name);
        },
        
        downVote: function (song) {
            socket.emit('downVote', song.name);
        },
        
        enqueue: function (song) {
            socket.emit('songSelected', song);
        },
        
        dequeue: function (song) {
            socket.emit('songRemoved', song);
        },
        
        filterMedia: function (keyword) {
            
        },
        
        onMessage: function (msg, type) {
            this.trigger("message", msg, type);
        },
        
        onSongStart: function (song) {
            this.trigger("songStart", song);
        }
    });

})();


var View = (function () {
    var playList,
        mediaList;
    
    
    return $.extend(EventEmitter(), {
        init: function () {
            var oThis = this;
            playList = $("#playList");
            mediaList = $("#mediaList");
            playList.on("click", ".up", function (e) {
                var $this = $(this),
                    song = $this.parents("li").data("songInfo");
                
                $this.addClass("active");
                oThis.upVote(song);
            });
            
            playList.on("click", ".down", function (e) {
                var $this = $(this),
                    song = $this.parents("li").data("songInfo");
                
                $this.addClass("active");
                oThis.downVote(song);
            });
        },
        
        renderMediaList: function (list) {
            mediaList.empty();
            list.forEach(function (item) {
                var span = $("<span />");
                
                span.text(item.name);
                span.on("click", this.onEnqueue.bind(this, item));
                mediaList.append($("<li />").append(span));
            }, this);
            
        },
        
        renderPlayList: function (list) {
            playList.empty();
            list.forEach(function (item) {
                playList.append(this.getPlaylistItemDom(item));
            }, this);

        },
        
        renderUploadComp: function (container) {
        
        },
        
        showMessage: function (msg, type) {
        
        },
        
        showNowPlaying: function () {
        
        },
        
        showNotification: function (message) {
        
        },
        
        onEnqueue: function (song) {
            this.trigger("songSelected", song);
        },
        
        onDequeue: function (song) {
            this.trigger("songRemoved", song);
        },
        
        upVote: function (song) {
            this.trigger("upVote", song);
        },
        
        downVote: function (song) {
            this.trigger("downVote", song);
        },
        
        onSearch: function (keyWord, isMedia) {
            this.trigger("search", keyWord);
        },
        
        setName: function (name) {
            $("#nameHolder").text(name);
        },
        
        getUserName: function () {
            var username = "";

            while (!username || username.trim().length < 3) {
                username = prompt("Please enter your name");
            }
            
            this.trigger('nameChange', username);
        },
        
        getPlaylistItemDom: function (song) {
            var dom = $("<li />").addClass("row-fluid");
            
            dom.data("songInfo", song);
            
            dom.html('<div class="span8"><strong>' + song.name + '</strong><br />' +
                '<span>' + song.album + '</span><label>Added by: <span>' + song.user.name + 
                '</span></label></div><div class="span2"><a href="#" class="voteIcon up">'+ song.likes +
                '</a><a href="#" class="voteIcon down">' + song.dislikes + '</a></div><div class="span1 skip"><a href="#" class="skipIcon"></a></div>');
            return dom;
        }
    });

})();


var Controller = (function(view, model) {

    return {
        init: function () {
            this.searchKey = "";
            this.bindEvents();
            model.init();
            view.init();
        },
        
        bindEvents: function () {
            this.bindViewEvents();
            this.bindModelEvents();
        },
            
        bindModelEvents: function () {
            model.on('message', this.onMessage.bind(this));
            model.on('mediaListChange', this.onMediaListChange.bind(this));
            model.on("playListChange", this.onPlayListChange.bind(this));
            model.on("songStart", this.onSongStart.bind(this));
            model.on("songEnd", this.onSongEnd.bind(this));
            model.on("nameChange", view.setName, view);
            model.on('userInfo', function (user) {
                view.setName(user.name);
                console.log(user);
                if (user.name.indexOf(user.ip) >= 0) {
                    view.getUserName();
                }
            });
        },
        
        bindViewEvents: function () {
            view.on('nameChange', function (name) {
                model.setName(name);
            });
            view.on('songSelected', this.onEnqueue.bind(this));
            view.on('songRemoved', this.onDequeue.bind(this));
            view.on('upVote', this.onVote.bind(this, true));
            view.on("downVote", this.onVote.bind(this));
            view.on("search", this.onSearch.bind(this));
        },
        
        onMediaListChange: function (list) {
            view.renderMediaList(list);
        },
        
        onPlayListChange: function (list) {
            view.renderPlayList(list);
        },
        
        onSearch: function (keyword) {
            this.searchKey = keyWord;
            var result = model.filterMedia(keyword);
            
            this.onMediaListChange(null, result);
        },
        
        onVote: function (isupVote, song) {
            if (isupVote === true && song) {
                model.upVote(song);
            } else {
                song = isupVote;
                model.downVote(song);
            }
        },
        
        onEnqueue: function (song) {
            console.log(song);
            model.enqueue(song);
        },
        
        onDequeue: function (song) {
            model.dequeue(song);
        },
        
        onSongStart: function (song) {
            console.log("Start", song);
            view.showNowPlaying(song);
        },
        
        onSongEnd: function () {
            view.songComplete(song);
        },
        
        onMessage: function (msg, type) {
            view.showMessage(msg, type || "info");
        }
        
    };
    

});

$(function () {
    var app = Controller(View, SongServer);

    app.init();
});

