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

var View = (function () {
    var playList,
        mediaList,
        progressBar,
        np;
    
    
    return $.extend(EventEmitter(), {
        init: function () {
            var oThis = this,
                timer;

            playList = $("#playlist");
            mediaList = $("#medialist"),
            np = $("#now-playing");
            progressBar = $("#progressBar");
            
            oThis.bindResizeEvent();
            oThis.initFileUploadComp();
            
            $("#searchTb").on("keyup", function () {
                window.clearTimeout(timer);
                timer = window.setTimeout(function (val) {
                    oThis.onSearch(val);
                }, 500, this.value);
            });
            
            playList.on("click", ".icon-thumbs-up", function (e) {
                var $this = $(this),
                    song = $this.parents(".np-songinfo").data("songInfo");
                
                $this.addClass("active");
                oThis.upVote(song);
                e.preventDefault();
            });
            
            playList.on("click", ".icon-thumbs-down", function (e) {
                var $this = $(this),
                    song = $this.parents(".np-songinfo").data("songInfo");
                
                $this.addClass("active");
                oThis.downVote(song);
                e.preventDefault();
            });
            
            playList.on("click", ".remove", function (e) {
                var $this = $(this),
                    song = $this.parents(".np-songinfo").data("songInfo");
                
                oThis.onDequeue(song);
            });
            

        },
        
        bindResizeEvent: function () {
            $(window).bind("resize",function(){
                var docHeight = $(window).height();
                playList.height(docHeight-120);
                mediaList.height(docHeight-160);
            });

            $(window).trigger("resize");
        },
        
        initFileUploadComp: function () {
            var oThis = this;

            $("#fileUpload").submit(function (event) {
                event.preventDefault();
                $("#uploadProgress").fadeIn();
                var files = document.getElementById("uploadFile").files;
                oThis.trigger("songUpload", files);
            });

            $("#upload-song").click(function () {
                $('#uploadFile').trigger("click");
            });

            $("#uploadFile").bind("change",function () {
                $("#upload").click();
            });
        },
        
        renderMediaList: function (list) {
            mediaList.empty();
            list.forEach(function (item) {
                var span = $("<span />"),
                    li = $("<li />");
                
                span.text(item.name);
                span.on("click", this.onEnqueue.bind(this, item));
                mediaList.append(li.append(span));
            }, this);
            
        },
        
        renderPlayList: function (songs) {
            //console.clear();
            playList.empty();
            songs.forEach(function (song) {
                var liked,
                    disliked;
                if (SongServer.userListHasMe(song.likers)) { //wrong
                    liked = true;
                } else {
                    disliked = SongServer.userListHasMe(song.dislikers);//wrong
                }
                playList.append(this.getPlaylistItemDom(song,
                    SongServer.isMySong(song), liked, disliked)); //wrong approach
            }, this);

        },
        
        showNowPlaying: function (song) {
            var dom = [
                '<div class="np-albumart"><img src="/img/50_album.png" /></div>',
                '<div class="container-sd">',
                    "<div class='np-songtext' title='" + song.name + "'>" + song.name + "</div>",
                    "<div class='addedBy' title='" + song.user.name + "'>Added By ",
                    song.user.name + "</div>",
                 '</div>',
            ];
            np.empty().append(dom.join(""));
        },
        
        alert: function (message) {
            bootbox.alert(message);
        },
        
        renderUploadComp: function (container) {
        
        },
        
        showMessage: function (msg, type) {
        
        },
        
        showNotification: function (message) {
        
        },
        
        showUploadProgress: function (val) {
            progressBar.css("width", val + "%");
        },
        
        onUploadSuccess: function () {
            $("#uploadProgress").delay(2000).fadeOut(function () {
                progressBar.css("width", 0);
                $("#alert-container .uploadComplete").slideDown(function () {
                    setTimeout(function (el) {
                        el.slideUp();
                    }, 5000, $(this))
                });
            });
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
        
        showUpVoteDialog: function (msg, song) {
            var oThis = this;

            bootbox.dialog(msg, [{
                "label": "Upvote",
                "class": "btn-success",
                "callback": function () {
                    oThis.upVote(song);
                }
            }, {
                "label": "Cancel",
                "class": "btn-secondary"
            }]);
        },
        
        getUserName: function () {
            var username = "";

            while (!username || username.trim().length < 3) {
                username = prompt("Please enter your name");
            }
            this.trigger('nameChange', username);
            this.setName(username);
        },
        
        getPlaylistItemDom: function (song, isMySong, likedByMe, disLikedByMe) {
            //console.log(song.name, song.weightedRating);
            var dom = $("<div>").addClass("np-songinfo"),
                container = $("<div>").addClass("container-sd"),
                songname = $("<div>").addClass('np-songtext'),
                addedBy = $("<div>").addClass("addedBy"),
                like = $("<a href='#'>").addClass('icon-thumbs-up'),
                dislike = $("<a href='#'>").addClass('icon-thumbs-down'),
                wrapper = $("<div>");
            
            dom.data("songInfo", song).data("isMySong", isMySong);
            dom.append('<div class="pl-albumart"></div>')

            songname.text(song.name).attr("title", song.name);
            addedBy.text("Added by " + song.user.name).attr("title", song.user.name);
            like.text(song.likes);
            dislike.text(song.dislikes);
            
            if (likedByMe) {
                like.addClass('active');
            } else if (disLikedByMe) {
                dislike.addClass('active');
            }
            
            if (song.likes) {
                like.tooltip({
                    placement: "left",
                    title: song.likers.map(function (liker) {
                        return liker.name;
                    }).join(", ")
                });
            }
            if (song.dislikes) {
                dislike.tooltip({
                    placement: "left",
                    title: song.dislikers.map(function (disliker) {
                        return disliker.name;
                    }).join(", ")
                });
            }
            
            wrapper.append(addedBy, $("<div class='actionIcons'>").append(like, dislike));
            container.append(songname, wrapper);
            dom.append(container);
            
            if (isMySong) {
                dom.append("<div class='icons'><a class='remove' href='javascript:void(0)'></a></div>");
            }
            
            return dom;
        }
    });

})();

