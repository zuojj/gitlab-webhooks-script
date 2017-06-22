/**
 * @author: zuojj(zuojj.com@gmail.com) 
 * @description: 自动化部署脚本
 * @Date: 2017-06-22 15:31:29 
 */

const express = require('express');
const BL = require('bl');
const spawn = require('child_process').spawn;
const EventEmitter = require('events').EventEmitter;
const app = express();
const emitter = new EventEmitter();


function run_cmd(cmd, args, callback) {
    console.log('runing deploy.sh ...');
    let child = spawn(cmd, args),
        str = '';

    child.stdout.on('data', function (buffer) {
        str += buffer.toString();
    });
    child.stdout.on('end', function () {
        callback(str);
    });
}

app.post('/_deploy_', function (req, res) {
    let reqHeaders = req.headers,
        gitlabEvent = reqHeaders['x-gitlab-event'],
        protocol = req.protocol,
        url = req.url,
        host = reqHeaders['host'];

    if (!gitlabEvent) return console.log('No X-Gitlab-Event found on request');

    req.pipe(BL(function (err, data) {
        let result,
            repname,
            eventType,
            emitData;

        if (err) return console.log(err.message);

        try {
            result = JSON.parse(data.toString());
        } catch (e) {
            return console.log(e);
        }

        if (!result || !result.repository || !result.repository.name) {
            return console.log('received invalid data from ' + req.headers['host'] + ', returning 400');
        }

        eventType = result.object_kind;
        repname = result.repository.name;

        res.writeHead(200, {
            'content-type': 'application/json'
        });

        res.end('{"ok":true}');

        emitData = {
            type: eventType,
            payload: result || {},
            protocol: protocol,
            host: host,
            url: url
        }

        emitter.emit(eventType, emitData)
        emitter.emit('*', emitData)
    }))
});

console.log("Running at http://10.129.152.51/webx-docs");
app.listen(8899);

emitter.on('error', function (err) {
    console.error('Error:', err.message)
})

emitter.on('push', function (event) {
    console.log('Received a push event for %s to %s', event.payload.repository.name, event.payload.ref);
    run_cmd('sh', ['./deploy.sh'], function (text) {
        console.log(text);
    });
});

emitter.on('issues', function (event) {
  console.log('Received an issue event for % action=%s: #%d %s',
    event.payload.repository.name,
    event.payload.action,
    event.payload.issue.number,
    event.payload.issue.title)
})

