var myVersion = "0.47g", myProductName = "syncHttp"; 

var config = {
	baseFolder: "/home/ubuntu/", //on the target machine
	baseUrl: "http://demo.forpoets.org/distribution/"
	};
var fnameConfig = "config.json"; //8/23/15 by DW

var stats = {
	ctStarts: 0, whenLastStart: new Date (0),
	ctChecks: 0, whenLastCheck: new Date (0),
	ctDownloads: 0, whenLastDownload: new Date (0)
	}
var statsfilename = "stats.json";
var flScheduledEveryMinute = false; //8/22/15 by DW
var origAppModDate, fnameApp = "sync.js";

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
function readConfig (callback) { //8/23/15 by DW
	fs.readFile (fnameConfig, function (err, data) {
		if (!err) {
			var storedConfig = JSON.parse (data.toString ());
			for (var x in storedConfig) {
				config [x] = storedConfig [x];
				}
			}
		callback ();
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
	request (config.baseUrl + relpath, function (err, response, filetext) {
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
	request (urlIndex, function (err, response, jsontext) {
		if (!err && response.statusCode == 200) {
			var theList = JSON.parse (jsontext);
			function considerFile (ixfile) {
				if (ixfile < theList.length) {
					var obj = theList [ixfile], relfilepath = obj.path, f = config.baseFolder + relfilepath;
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
			console.log ("checkForUpdates: " + theList.length + " files in " + urlIndex);
			considerFile (0);
			}
		});
	}
function productNameVersion () {
	return (myProductName + " v" + myVersion);
	}
function getAppModDate (callback) { //8/22/15 by DW
	fs.exists (fnameApp, function (flExists) {
		if (flExists) {
			fs.stat (fnameApp, function (err, stats) {
				if (err) {
					callback (undefined);
					}
				else {
					callback (new Date (stats.mtime).toString ());
					}
				});
			}
		else {
			callback (undefined);
			}
		});
	}
function everyMinute () {
	console.log ("\n" + productNameVersion () + ": " + new Date ().toLocaleTimeString ());
	readStats (statsfilename, stats, function () {
		stats.ctChecks++;
		stats.whenLastCheck = new Date ();
		writeStats (statsfilename, stats);
		checkForUpdates (config.baseUrl, function () {
			});
		});
	}
function everySecond () {
	if (!flScheduledEveryMinute) { //8/22/15 by DW
		if (new Date ().getSeconds () == 0) {
			setInterval (everyMinute, 60000); 
			flScheduledEveryMinute = true;
			everyMinute (); //it's the top of the minute, we have to do one now
			}
		}
	getAppModDate (function (theModDate) { //8/22/15 by DW -- quit if the app changed
		if (theModDate != origAppModDate) {
			console.log ("\neverySecond: " + fnameApp + " has been updated. " + myProductName + " is quitting now.");
			process.exit (0);
			}
		});
	}
function startup () {
	console.log ("\n" + productNameVersion () + " launched at " + new Date ().toLocaleTimeString ());
	readConfig (function () {
		console.log ("\nstartup: config == " + utils.jsonStringify (config));
		readStats (statsfilename, stats, function () {
			getAppModDate (function (appModDate) { //set origAppModDate -- 8/22/15 by DW
				origAppModDate = appModDate;
				stats.ctStarts++;
				stats.whenLastStart = new Date ();
				writeStats (statsfilename, stats);
				setInterval (everySecond, 1000); 
				everyMinute ();
				});
			});
		});
	}
startup ();
