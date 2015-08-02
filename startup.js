function runUnixCommand (theCommand, callback) {
	if (theCommand.length > 0) {
		var exec = require ("child_process").exec;
		console.log ("runUnixCommand: " + theCommand);
		exec (theCommand, function (error, stdout, stderr) {
			if (callback !== undefined) {
				callback (error, stdout, stderr);
				}
			});
		}
	}
function runCommands (s) {
	var theList = s.split ("\n");
	
	function doCommand (ix) {
		if (ix < theList.length) {
			runUnixCommand (theList [ix], function (error, stdout, stderr) {
				doCommand (ix + 1);
				});
			}
		}
	doCommand (0);
	
	}
runCommands ("cd /home/ubuntu/ec2ForPoets/synchttp\nforever start sync.js\n");
