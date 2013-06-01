"use strict";

var fs = require('fs');

function Medialist(mediaDir){
    this.baseDir = __dirname + mediaDir;
    try {
        this.list = fs.readdirSync(this.baseDir);
    } catch (e) {
        if (e.code === 'ENOENT') {
            console.log("creating media folder!!")
            fs.mkdirSync(this.baseDir);
            this.list = fs.readdirSync(this.baseDir);
        }
    }
}

Medialist.prototype.saveMedia = function(files, callback){
    var totalFiles = 0;
    for (var j in files){
        totalFiles++;
    }

    var count = 0;
    for (var i in files){
        var file = files[i];
        fs.rename(file.path, this.baseDir + file.name, (function(filename, err){
            count++;
            if (err){
                console.error(err);
            }else{
                //Check to see of the name already exists in list 
                if(this.list.indexOf(filename)===-1){
                    this.list.push(filename);    
                }
            }
            
            if (count === totalFiles){
                callback();
            }
        }).bind(this, file.name));
    }
};

module.exports = function(mediaDir){
    return new Medialist(mediaDir);
};
