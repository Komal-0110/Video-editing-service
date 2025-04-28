const { Router } = require("express");
const upload = require("../middleware/multer");
const { uploadVideo } = require("../controllers/video.controllers");

function videoRoute(){
    Router.post('/upload', upload.single('video'), uploadVideo);
}


module.exports = videoRoute