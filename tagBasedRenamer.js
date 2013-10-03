"use strict";
var fs = require('fs');
var mm = require('musicmetadata');
var util = require("util");
var mediaFolder = "./media";
var crypto = require("crypto");


var files = fs.readdirSync(mediaFolder);
var file="";
var metaData = {};


var parseFiles = function(fileName,callBack){
	callBack = typeof callBack == "function"?callBack : function(){};
	var fileExt = fileName.split(".");
	fileExt = fileExt[fileExt.length-1];
    var parseObj = new mm(fs.createReadStream(mediaFolder+'/'+fileName));
    parseObj.on('metadata', function (result) {
        var hash = crypto.createHash('md5').update(fileName).digest("hex");
        if(util.isArray(result.picture)){
            fs.writeFile("public/albumart/"+hash+".jpg",result.picture[0].data);
        }
        if(result.title!=="" && result.title!==" "){
        	fs.rename(mediaFolder+"/"+fileName,mediaFolder+"/"+result.title+"."+fileExt);
    	}
        delete result.picture;

        if(fileName){
            metaData[hash] = result;
            callBack.call(this,metaData,fileName);
        }

        //console.log(metaData)
    });

}

for(var i=0;i<files.length;i++){
    parseFiles(files[i],function(metaData,fileName){
//        console.log(fileName);
//        console.log(fileName);
//        console.log("----------");
    	//if(fileName == files[files.length-1]){
            console.log(fileName);
    		fs.writeFile("metaData.json",JSON.stringify(metaData,null,4));
    	//}

    });
    //fs.writeFile("albumart/"+result.title+".jpg",result.picture[0].data)
}
