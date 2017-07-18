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
const path = require('path');
const OS = require('os');

/**
 * running shell
 * @param {any} cmd 
 * @param {any} args 
 * @param {any} callback 
 */
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

/**
 * execute shell
 */
function execute() {
    run_cmd('sh', ['./deploy.sh'], function (text) {
        console.log(text);
    });
}

app.use(express.static(path.join(__dirname, './')));
app.get('/docs', function(req, res) {
    res.sendFile(path.join(__dirname, './index.html'), function(err, html) {
        res.send(html);
    });
});
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
        };
        emitter.emit(eventType, emitData)
        emitter.emit('*', emitData)
    }))
});


emitter.on('error', function (err) {
    console.error('Error:', err.message)
})

emitter.on('push', function (event) {
    console.log('Received a push event for %s to %s', event.payload.repository.name, event.payload.ref);
    execute();
});

// 初始化, 注意，本地直接执行，可能会 remove 掉当前项目的代码
execute();

/* 获取服务器相关信息 */
let hostname = OS.hostname() || '',
    networks = OS.networkInterfaces(),
    port = 8899,
    ipv4;

(networks.eth0 || networks['本地连接'] || []).forEach((item, index) => {
    ipv4 = item.family.toLowerCase() === 'ipv4' ? item.address : null;
});

console.log(['Running At Host: ', hostname, ', IP: http://', ipv4, ':', port].join(''));
app.listen(port);
