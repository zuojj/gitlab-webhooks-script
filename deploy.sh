#!/bin/bash
 
WEB_PATH='/usr/local/src/webx-docs'
WEB_USER='root'
WEB_USERGROUP='root'
 
echo "Start deployment"
cd $WEB_PATH
echo "pulling source code..."
git reset --hard origin/master
git clean -f
git pull
git checkout master
echo "start building..."
npm run build
echo "changing permissions..."
chown -R $WEB_USER:$WEB_USERGROUP $WEB_PATH
chmod -R 777 $WEB_PATH
echo "Finished."
