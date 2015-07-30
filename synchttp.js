var baseUrl = "http://fargo.io/code/ec2forpoets/", basefolder = "syncfiles/";

var request = require ("request");
var fs = require ("fs");
var utils = require ("./lib/utils.js");

function fsSureFilePath (path, callback) { 
	var splits = path.split ("/");
	path = ""; //1/8/15 by DW
	if (splits.length > 0) {
		function doLevel (levelnum) {
			if (levelnum < (splits.length - 1)) {
				path += splits [levelnum] + "/";
				fs.exists (path, function (flExists) {
					if (flExists) {
						doLevel (levelnum + 1);
						}
					else {
						fs.mkdir (path, undefined, function () {
							doLevel (levelnum + 1);
							});
						}
					});
				}
			else {
				if (callback != undefined) {
					callback ();
					}
				}
			}
		doLevel (0);
		}
	else {
		if (callback != undefined) {
			callback ();
			}
		}
	}
function getFileList (s3path, callback) {
	var theList = new Array ();
	s3.listObjects (s3path, function (obj) {
		if (obj.flLastObject !== undefined) {
			if (callback != undefined) {
				callback (theList);
				}
			}
		else {
			theList [theList.length] = obj;
			}
		});
	}
function downloadFile (relpath, f, whenModified, callback) {
	console.log ("downloadFile: relpath == " + relpath);
	request (baseUrl + relpath, function (err, response, filetext) {
		if (!err && response.statusCode == 200) {
			fs.writeFile (f, filetext, function (err) {
				if (err) {
					console.log ("downloadFile: error writing local file == " + err.message);
					}
				else {
					whenModified = new Date (whenModified);
					fs.utimes (f, whenModified, whenModified, function () {
						callback ();
						});
					}
				}); 
			}
		else {
			console.log ("downloadFile: error reading file == " + err.message);
			callback ();
			}
		});
	
	
	}
function checkForUpdates (baseUrl, callback) {
	request (baseUrl + "index.json", function (error, response, jsontext) {
		if (!error && response.statusCode == 200) {
			var theList = JSON.parse (jsontext);
			function considerFile (ixfile) {
				if (ixfile < theList.length) {
					var obj = theList [ixfile], relfilepath = obj.path, f = basefolder + relfilepath;
					fsSureFilePath (f, function () {
						fs.exists (f, function (flExists) {
							if (flExists) {
								fs.stat (f, function (err, stats) {
									var remoteModDate = new Date (obj.whenModified);
									var localModDate = new Date (stats.mtime);
									if (remoteModDate > localModDate) { //it's been modified
										downloadFile (obj.path, f, obj.whenModified, function () {
											considerFile (ixfile + 1);
											});
										}
									else {
										considerFile (ixfile + 1);
										}
									});
								}
							else {
								downloadFile (obj.path, f, obj.whenModified, function () {
									considerFile (ixfile + 1);
									});
								}
							});
						});
					}
				else {
					callback ();
					}
				}
			considerFile (0);
			}
		});
	}
function everyMinute () {
	var whenstart = new Date ();
	checkForUpdates (baseUrl, function () {
		console.log ("\neveryMinute: took " + utils.secondsSince (whenstart) + " secs.");
		});
	}

everyMinute ();
setInterval (everyMinute, 60000); 
