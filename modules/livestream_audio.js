/*
A small module that allows local MP3 files to be saved and livestreamed. If a user attempts to download a file, they'll only be able to download what's currently being streamed to Spark. This obviously will not fully protect files from being illegally downloaded - mind you, most music is copyrighted - but it will deter them a bit.

This code is licensed the MIT OSS License: https://opensource.org/licenses/MIT

©2019 Diamond Grid Web, Autumn Rivers (SmartieCodes)
*/

const StreamSkip = require('stream-skip');

module.exports.cutFile((audioStream, bytesToSkip) => {
    const cutStream = new StreamSkip();
    return cutStream;
})