const { Router } = require("express");
const upload = require("../middleware/multer");
const { uploadVideo, trimVideo, addSubtitles, renderVideo } = require("../controllers/video.controllers");

function videoRoute(){
    const router = Router()
    router.post('/upload', upload.single('video'), uploadVideo);
    router.post("/:id/trim", trimVideo)
    router.put("/:id/subtitle", addSubtitles)
    router.post("/:id/render", renderVideo)

    return router
}


module.exports = videoRoute