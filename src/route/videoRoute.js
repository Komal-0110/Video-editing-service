const { Router } = require("express");
const upload = require("../middleware/multer");
const { uploadVideo, trimVideo } = require("../controllers/video.controllers");

function videoRoute(){
    Router.post('/upload', upload.single('video'), uploadVideo);
    Router.post("/:id/trim", trimVideo)
}


module.exports = videoRoute