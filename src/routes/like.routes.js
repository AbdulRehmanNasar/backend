import { Router } from "express"
import {
    toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos
} from "../controllers/like.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/toggle-comment-like/:commentId")
.patch(
    verifyJWT,
    toggleCommentLike
)

router.route("/toggle-tweet-like/:tweetId")
.patch(
    verifyJWT,
    toggleTweetLike
)

router.route("/toggle-video-like/:videoId")
.patch(
    verifyJWT,
    toggleVideoLike
)

router.route("/like-videos")
.get(
    verifyJWT,
    getLikedVideos
)

export default router