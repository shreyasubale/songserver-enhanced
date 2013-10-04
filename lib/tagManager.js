"use strict";
var fs = require('fs');
var mm = require('musicmetadata');
var util = require("util");
var crypto = require("crypto");
var metaData = require("../metaData.json") || {};

function TagManager (config) {
    config = config || {};
    this.mediaFolder = config.mediaFolder || "./media/"
    this.metaData = metaData;

};

TagManager.prototype.parseFile = function (fileName,callBack) {
    var fileExt = fileName.split(".");
    var oThis = this;
    fileExt = fileExt[fileExt.length-1];
    var mmObj = new mm(fs.createReadStream(this.mediaFolder + fileName));
    mmObj.on('metadata', function (result) {

        if(result.title!=="" && result.title!==" "){
            fs.rename(oThis.mediaFolder+fileName,oThis.mediaFolder+result.title+"."+fileExt);
            fileName = result.title+"."+fileExt;
        }
        var hash = crypto.createHash('md5').update(fileName).digest("hex");
        if(util.isArray(result.picture)){
            fs.writeFile("./public/albumart/"+hash+".jpg",result.picture[0].data);
        }
        delete result.picture;

        if(fileName){
            oThis.metaData[hash] = result;
            oThis._writeTag();
            if(typeof callback === "function"){
                callBack.call(oThis,metaData,fileName,hash);
            }
        }

    });
};

TagManager.prototype.parseFiles = function (files,callBack) {
    for(var file in files){
        if(files.hasOwnProperty(file)){
            this.parseFile(files[file].name,callBack);
        }

    }

};

TagManager.prototype._writeTag = function () {
    fs.writeFile("./metaData.json",JSON.stringify(this.metaData,null,4));
}

module.exports = TagManager;
