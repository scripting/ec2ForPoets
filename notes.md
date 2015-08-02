Folders are set up for <a href="https://github.com/strongloop/node-foreman">node-foreman</a>. 

Commands to start over

cd /home/ubuntu

rm -rf ec2ForPoets

git clone https://github.com/scripting/ec2ForPoets.git

cd ec2ForPoets/synchttp

pwd

Running shell commands from Node

https://github.com/arturadib/shelljs

Watch log

sudo tail -f /var/log/upstart/synchttp.log

To cause an update to happen

in frontier

nodeEditorSuite.utilities.buildEc2PoetsIndexJson ()

in terminal

cd /volumes/baltimore/ec2forpoets/distribution

aws s3 sync . s3://demo.forpoets.org/distribution

Folder structure

/home/ubuntu

ec2ForPoets -- the folder defined by the repo

river4 -- must be outside of ec2ForPoets, because we keep deleting that folder

