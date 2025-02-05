import { Router } from "express"
import {
    getChannelStats, 
    getChannelVideos
} from "../controllers/dashboard.contoller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/channel-stats")
.get(
    verifyJWT,
    getChannelStats
)

router.route("/channel-videos")
.get(
    verifyJWT,
    getChannelVideos
)

export default router