const { Router } = require("express");
const upload = require("../middleware/multer");
const { uploadVideo, trimVideo } = require("../controllers/video.controllers");

function videoRoute(){
    const router = Router()
    router.post('/upload', upload.single('video'), uploadVideo);
    router.post("/:id/trim", trimVideo)

    return router
}


module.exports = videoRoute