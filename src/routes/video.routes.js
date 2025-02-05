import { Router } from "express"
import {
    getAllVideos, publishAVideo, getVideoById, updateVideo, deleteVideo, togglePublishStatus
} from "../controllers/video.controller.js"
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/get-all-videos")
.get(
    verifyJWT,
    getAllVideos
)

router.route("/publish-video")
.post(
    verifyJWT,
    upload.fields([
        {
            name: "video",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    publishAVideo
)

router.route("/get-video/:videoId")
.get(
    verifyJWT,
    getVideoById
)

router.route("/update-video/:videoId")
.patch(
    verifyJWT,
    upload.single("thumbnail"),
    updateVideo
)

router.route("/delete-video/:videoId")
.delete(
    verifyJWT,
    deleteVideo
)

router.route("/toggle-publish/:videoId")
.patch(
    verifyJWT,
    togglePublishStatus
)

export default router