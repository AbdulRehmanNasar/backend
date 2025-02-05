import { Router } from "express"
import {
    createTweet, getUserTweets, updateTweet, deleteTweet
} from "../controllers/tweet.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.route("/create-tweet")
.post(
    verifyJWT,
    upload.fields([
        {
            name: "tweetImage",
            maxCount: 5
        },
        {
            name: "tweetVideo",
            maxCount: 3
        }
    ]),
    createTweet
)

router.route("/get-tweets")
.get(
    verifyJWT,
    getUserTweets
)

router.route("/update-tweet/:tweetId")
.patch(
    verifyJWT,
    upload.fields([
        {
            name: "tweetImage",
            maxCount: 5
        },
        {
            name: "tweetVideo",
            maxCount: 3
        }
    ]),
    updateTweet
)

router.route("/delete-tweet/:tweetId")
.delete(
    verifyJWT,
    deleteTweet
)

export default router