var baseS3path = "/fargo.io/code/ec2forpoets/", basefolder = "syncfiles/";

var s3 = require ("./lib/s3.js");
var utils = require ("./lib/utils.js");
var fs = require ("fs");

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
function downloadFile (s3path, f, whenModified, callback) {
	console.log ("downloadFile: s3path == " + s3path);
	s3.getObject (s3path, function (err, data) {
		if (err) {
			console.log ("downloadFile: error reading S3 file == " + err.message);
			callback ();
			}
		else {
			fs.writeFile (f, data.Body, function (err) {
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
		});
	}
function checkForUpdates (baseS3path, callback) {
	var splitpath = s3.splitPath (baseS3path);
	var bucketname = splitpath.Bucket;
	getFileList (baseS3path, function (theList) {
		function considerFile (ixfile) {
			if (ixfile < theList.length) {
				var obj = theList [ixfile], relfilepath = utils.stringDelete (obj.Key, 1, splitpath.Key.length), f = basefolder + relfilepath;
				fsSureFilePath (f, function () {
					fs.exists (f, function (flExists) {
						if (flExists) {
							fs.stat (f, function (err, stats) {
								var remoteModDate = new Date (obj.LastModified);
								var localModDate = new Date (stats.mtime);
								if (remoteModDate > localModDate) { //it's been modified
									downloadFile (bucketname + "/" + obj.Key, f, obj.LastModified, function () {
										considerFile (ixfile + 1);
										});
									}
								else {
									considerFile (ixfile + 1);
									}
								});
							}
						else {
							downloadFile (bucketname + "/" + obj.Key, f, obj.LastModified, function () {
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
		console.log ("checkForUpdates: " + theList.length + " files in the list.");
		considerFile (0);
		});
	}
function everyMinute () {
	var whenstart = new Date ();
	checkForUpdates (baseS3path, function () {
		console.log ("\neveryMinute: took " + utils.secondsSince (whenstart) + " secs.");
		});
	}

everyMinute ();
setInterval (everyMinute, 60000); 
