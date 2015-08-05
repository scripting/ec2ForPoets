var myVersion = "0.43a", myProductName = "syncHttp"; 

var basefolder = "/home/ubuntu/"; //on the target machine, all folders are siblings of the ec2ForPoets folder
var baseUrl = "http://demo.forpoets.org/distribution/";

var stats = {
	ctStarts: 0, whenLastStart: new Date (0),
	ctChecks: 0, whenLastCheck: new Date (0),
	ctDownloads: 0, whenLastDownload: new Date (0)
	}
var statsfilename = "stats.json";

var request = require ("request");
var fs = require ("fs");
var utils = require ("./lib/utils.js");

function writeStats (f, stats, callback) {
	fsSureFilePath (f, function () {
		fs.writeFile (f, utils.jsonStringify (stats), function (err) {
			if (err != null) {
				console.log ("writeStats: error == " + err.message);
				}
			if (callback != undefined) {
				callback ();
				}
			});
		});
	}
function readStats (f, stats, callback) {
	fsSureFilePath (f, function () {
		fs.exists (f, function (flExists) {
			if (flExists) {
				fs.readFile (f, function (err, data) {
					if (err != null) {
						console.log ("readStats: error reading file " + f + " == " + err.message)
						if (callback != undefined) {
							callback ();
							}
						}
					else {
						var storedStats = JSON.parse (data.toString ());
						for (var x in storedStats) {
							stats [x] = storedStats [x];
							}
						writeStats (f, stats, function () {
							if (callback != undefined) {
								callback ();
								}
							});
						}
					});
				}
			else {
				writeStats (f, stats, function () {
					if (callback != undefined) {
						callback ();
						}
					});
				}
			});
		});
	}
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
	console.log ("downloadFile: " + relpath);
	stats.ctDownloads++;
	stats.whenLastDownload = new Date ();
	writeStats (statsfilename, stats);
	request (baseUrl + relpath, function (err, response, filetext) {
		if (!err && response.statusCode == 200) {
			fs.writeFile (f, filetext, function (err) {
				if (err != null) {
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
			if (err != null) {
				console.log ("downloadFile: error reading file == " + err.message);
				}
			callback ();
			}
		});
	}
function checkForUpdates (baseUrl, callback) {
	var urlIndex = baseUrl + "index.json";
	console.log ("checkForUpdates: " + urlIndex);
	request (urlIndex, function (err, response, jsontext) {
		if (!err && response.statusCode == 200) {
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
			console.log ("checkForUpdates: " + theList.length + " files in the list.");
			considerFile (0);
			}
		});
	}
function productNameVersion () {
	return ("\n" + myProductName + " v" + myVersion);
	}
function everyMinute () {
	readStats (statsfilename, stats, function () {
		var whenstart = new Date ();
		
		stats.ctChecks++;
		stats.whenLastCheck = whenstart;
		writeStats (statsfilename, stats);
		
		checkForUpdates (baseUrl, function () {
			console.log ("\n" + productNameVersion () +  " " + whenstart.toLocaleTimeString () + ": took " + utils.secondsSince (whenstart) + " secs.");
			});
		});
	}
function startup () {
	readStats (statsfilename, stats, function () {
		stats.ctStarts++;
		stats.whenLastStart = new Date ();
		writeStats (statsfilename, stats);
		console.log ("\n" + productNameVersion () + "\n");
		everyMinute ();
		setInterval (everyMinute, 60000); 
		});
	}

startup ();
