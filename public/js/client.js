"use strict";

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
            socket.on('error', this.trigger.bind(this, 'error'));
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

            xhr.open("post", "/upload");
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
            localStorage.setItem("username", user.name);
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
            socket.emit('songRemoved', song.name);
        },
        
        filterMedia: function (songs, keyword) {
            return songs.filter(function (song) {
                return (song.name.toLowerCase().indexOf(keyword.toLowerCase()) > -1);
            });
        },
        
        isMySong: function (song) {
            return (song.user.address === user.address);
        },
        
        onMessage: function (msg, type) {
            this.trigger("message", msg, type);
        },
        
        onSongStart: function (song) {
            this.trigger("songStart", song);
        },

        userListHasMe: function (list) {
            var i, length;
            for (i = 0, length = list.length; i < length; i++) {
                if (list[i].address === user.address) {
                    return true;
                }
            }
            return false;
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
                if (user.name.indexOf(user.address) >= 0) {
                    view.getUserName();
                }
            });
            model.on('error', this.onError, this);
            model.on('uploadProgress', view.showUploadProgress, view);
            model.on("uploadSuccess", function () {
                view.onUploadSuccess();
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
            view.on("songUpload", function (files) {
                model.uploadSongs(files);
            });
        },
        
        onMediaListChange: function (list) {
            view.renderMediaList(list);
        },
        
        onPlayListChange: function (list) {
            view.renderPlayList(list);
        },
        
        onSearch: function (keyword) {
            this.searchKey = keyword;
            var result = model.filterMedia(model.getMediaList(), keyword);
            
            this.onMediaListChange(result);
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
           // console.log(song);
            model.enqueue(song);
        },
        
        onDequeue: function (song) {
            model.dequeue(song);
        },
        
        onSongStart: function (song) {
            //console.log("Start", song);
            view.showNowPlaying(song);
        },
        
        onSongEnd: function () {
            view.songComplete(song);
        },
        
        onMessage: function (msg, type) {
            view.showMessage(msg, type || "info");
        },
        
        onError: function (error) {
            switch (error.message) {
                case 'LimitReached':
                    view.alert('You already got 5 songs queued, give others a chance!');
                break;
                case 'SongExists':
                    view.showUpVoteDialog('Song already exist in queue', error.song);
                break;
                case 'Spam':
                    view.alert("Whao, Dont SPAM! Please try after some time.");
                break;
                case 'conflict':
		    view.alert("You cannot " + error.action + " your own song.");
                break;
            }
        }
        
    };

});

$(function () {
    var app = Controller(View, SongServer);

    app.init();
});

