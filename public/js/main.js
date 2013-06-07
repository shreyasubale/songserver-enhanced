"use strict";

$(function(){
    var username = localStorage.getItem("username");
    if (username == null) {
        var name = '';
        while (name.trim().length < 3) {
            name = prompt("Please enter your name");
        }
        username = name;
        localStorage.setItem("username", username);
    }

    var socket = io.connect();
    var serverLastSeenOn = 0;
    
    socket.on('init', function(data){
        var medialist = data.medialist;
        var playlist = data.playlist;
        
        updatePlaylist(playlist);
        updateMedialist(medialist);
    });
    
    socket.on('playlist updated', updatePlaylist);
    socket.on('medialist updated', updateMedialist);
    socket.on('message', function(message) {
        bootbox.alert(message);
    });
    
    var serverTimeoutCheck;
    socket.on('server stats', function(stats) {
        serverLastSeenOn = new Date();
        
        clearTimeout(serverTimeoutCheck);
        $("#serverStatus").addClass("online");
        $("#totalConnectedUsers").text(stats.totalConnectedUsers);
        $("#totalSongs").text(stats.totalSongs);
        
        serverTimeoutCheck = setTimeout(function() {
            var now = new Date();
            
            if ((now - serverLastSeenOn) > 2000) {
                $("#serverStatus").removeClass("online");
            }
        }, 2000);
    });



    function truncateText(text,length){
        if(!length){
            length = 70;
        }
        if(text && text.length > length){
            return text.substring(0,length-3)+"..."; 
        }else{
            return text;
        }
        
    }

    function addPlaylistItem(data){
        
        var listItem = $("<div>").addClass("np-songinfo");
        var html = [
            "<div class='pl-albumart'></div>",
            "<div class='container-sd'>",
                "<div class='np-songtext'>"+truncateText(data.path)+"</div>",
                "<div class='addedBy'>Added By "+truncateText(data.username)+"</div>",
            "</div>",
            "<div class='icons'></div>"
        ];
        listItem.append(html.join(""));

        //listItem.append("<div class='pl-albumart'></div>");
        
        //listItem.append("<div class='np-songtext'>"+data.path+"</div>");
        //listItem.append("<div class='addedBy'>Added By"+data.username+"</div>");
        //listItem.append("<div class='icons'>");
        $("#playlist").append(listItem);
        return listItem;
    }
    
    function updatePlaylist(playlist){
        var songItem;
        $("#playlist").empty();
        if (playlist.length === 0){
            addPlaylistItem({path:"Queue empty"});
        }else{
            for (var i = 0; i < playlist.length; i++){
                var song = playlist[i];
                songItem = addPlaylistItem(song);
        
                $("<a class='remove' href='javascript:void(0)'>").click(function(songIndex) {
                    return function() {
                        removeSong(songIndex);
                    };
                }(i)).appendTo(songItem.find(".icons"));
                
                if (song.addedByIP === "127.0.0.1") {
                    //li.addClass("addedByServer");
                    //li.children(".ip").text("Admin");
                }
            }
        }
    }
    
    function updateMedialist(medialist){
        $("#medialist").empty();        
        if (medialist.length === 0){
            $("<div>").html("Medialist is empty, place some songs in the 'media' folder")
                .appendTo("#medialist");
        }else{
            for (var i = 0; i < medialist.length; i++){
                (function(song){
                    var li = $("<li>").appendTo("#medialist");
                    $("<span>").text(medialist[i]).click(function(){
                        socket.emit('song selected', {
                            song: song,
                            username: username
                        });
                    }).appendTo(li);
                })(medialist[i]);
            }
        }
    }
    
    function removeSong(songIndex) {
        socket.emit('song removed', songIndex);
    }
    
    $("#fileUpload").submit(function(event){
        event.preventDefault();
        $("#upload").fadeOut();
        var files = document.getElementById("uploadFile").files;
        var formData = new FormData();
        for (var i = 0; i < files.length; i++){
            formData.append("file" + i, files[i]);
        }
        var xhr = new XMLHttpRequest;
        xhr.open("post", "upload");
        xhr.onreadystatechange = function(){
            if (this.readyState == 4 && this.status == 200){
                bootbox.alert('upload complete');
                $("#upload").fadeIn();
                document.getElementById("uploadProgress").value = 0;
            }
        };
        xhr.upload.onprogress = function(e){
            if (e.lengthComputable){
                var percent = Math.floor((e.loaded / e.total) * 100);
                document.getElementById("uploadProgress").value = percent;
            }
        };
        xhr.send(formData);
    });
    
    $("#about span").click(function(){
        $("#about .content").slideToggle();
    });
    $("#upload-song").click(function(){
        $('#uploadFile').trigger("click");
    });
    $("#uploadFile").bind("change",function(){
        $("#upload").click();
    });

    $(document).ready(function(){
        //adjust the height
        $(window).bind("resize",function(){
            var docHeight = $(window).height();
            $("#playlist").height(docHeight-120);
            $(".leftSide").height(docHeight-120);
        });

        $(window).trigger("resize");
    });

    // $(window).load(function(){
    //     $('#playlist').mCustomScrollbar();
    // });

});
