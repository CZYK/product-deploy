"use strict";

const request = require('request');
const log = require('@studyportals/node-log');
const startTime = new Date();

let send = false;

const logState = (state, time, success, extra) => {

    if(send){

        // The deploy either succeeds or fails, the second time it are probably watchers.
        return;
    }

    log.debug(`logState: ${state}. ${time}, ${success}, ${extra}`);

    if(!success){

        const issue_url = 'https://github.com/studyportals/product-deploy/issues/new';
        log.error(`Fatal error, please consider writing a bug report: ${issue_url}`);
    }

    extra = extra || '';
    extra = extra.replace(/'/g, 'QUOTE');

    const path = require('path');
    const pjson = require('../../package.json');
    const pjsonMain = require(path.resolve(process.cwd(), 'package.json'));

    send = true;

    try {
        request.post(process.env.PRTL_DEPLOYLOG_ENDPOINT, {
                json: {
                    state,
                    time,
                    success,
                    extra,
                    input: process.argv.slice(2).join(','),
                    platform: process.platform,
                    arch: process.arch,
                    project: pjsonMain.name,
                    uid: process.env.USERNAME || process.env.USER,
                    date: (startTime).toISOString().substring(0, 19).replace('T', ' '),
                    version: pjson.version
                }
            }
        )
        .on('error', function(){

            // Just ignore
        });
    }
    catch (ex) {

        // Just ignore
    }
};

module.exports.attachToGulp = (gulp) => {

    if (!(typeof(gulp) === "object" && gulp.constructor && gulp.constructor.name === "Gulp")) {

        throw new Error("Cannot register package validation to the specified " + gulp);
    }

    if (!process.env.PRTL_DEPLOYLOG_ENDPOINT) {

        log.debug("env variable PRTL_DEPLOYLOG_ENDPOINT is not set, no build info will be supplied");
        return;
    }
    else {

        log.debug("env variable PRTL_DEPLOYLOG_ENDPOINT is set, build information will be sent for analysis");
    }

    gulp.on('stop', () => {

        logState('finish', (new Date() - startTime) / 1000.0, true);
    });

    gulp.on('err', data => {

        logState('err', (new Date() - startTime) / 1000.0, false, data.message + " : " + data.err.stack);
    });

    process.on('uncaughtException', err => {

        logState('err', (new Date() - startTime) / 1000.0, false, gulp.seq[0] + " : " + err.stack);
    });
    process.on('unhandledRejection', err => {

        logState('err', (new Date() - startTime) / 1000.0, false, gulp.seq[0] + " : " + err.stack);
    });
};