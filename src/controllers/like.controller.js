import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new apiError(400, "VideoId or format is incorrect");
    }
    let videoLikeStatus;
    try {
        videoLikeStatus = await Like.aggregate([
            {
                $match: mongoose.Types.ObjectId(videoId)
            }
        ])

        if (!videoLikeStatus) {
            console.log("Could not get the status of liked video");
        }

        const videoCurrentLikeStatus = videoLikeStatus.isLiked;
        videoLikeStatus.isLiked = !videoCurrentLikeStatus

        if (videoCurrentLikeStatus !== videoLikeStatus.isLiked) {
            await videoLikeStatus.save();
        }

    } catch (error) {
        throw new apiError(500, "Error while toggling video like status")
    }

    return res
    .status(200)
    .json(
        new apiResponse(200, videoLikeStatus.isLiked, "Video like status toggled successfully!")
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
        throw new apiError(400, "CommentId or format is incorrect");
    }
    let commentLikeStatus;
    try {
        commentLikeStatus = await Like.aggregate([
            {
                $match: mongoose.Types.ObjectId(commentId)
            }
        ])

        if (!commentLikeStatus) {
            console.log("Could not get the status of liked comment");
        }

        const commentCurrentLikeStatus = commentLikeStatus.isLiked;
        commentLikeStatus.isLiked = !commentCurrentLikeStatus

        if (commentCurrentLikeStatus !== commentLikeStatus.isLiked) {
            await commentLikeStatus.save();
        }

    } catch (error) {
        throw new apiError(500, "Error while toggling comment like status")
    }

    return res
    .status(200)
    .json(
        new apiResponse(200, commentLikeStatus.isLiked, "Comment like status toggled successfully!")
    )
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if (!tweetId || !mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new apiError(400, "TweetId or format is incorrect");
    }
    let likeStatus;
    try {
        likeStatus = await Like.aggregate([
            {
                $match: mongoose.Types.ObjectId(tweetId)
            }
        ])

        if (!likeStatus) {
            console.log("Could not get the status of like");
        }

        const currentLikeStatus = likeStatus.isLiked;
        likeStatus.isLiked = !currentLikeStatus

        if (currentLikeStatus !== likeStatus.isLiked) {
            await likeStatus.save();
        }

    } catch (error) {
        throw new apiError(500, "Error while toggling tweet like status")
    }

    return res
    .status(200)
    .json(
        new apiResponse(200, likeStatus.isLiked, "Tweet like status toggled successfully!")
    )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user._id;
    if (!userId) {
        throw new apiError(400, "Inelegible request | User not found!")
    }
    let likedVideos;
    try {
        likedVideos = await Like.aggregate([
            {
                $match: {
                    likedBy: userId
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            }
        ])
        if (!likedVideos) {
            console.log("Could not get any liked video in getLikedVideos");
            throw new apiError(404, "There is no video liked by the user!")
        }
    } catch (error) {
        throw new apiError(500, "Could not fetch the liked videos for the user!")
    }

    if (likedVideos.length !== 0) {
        console.log("Fetched liked videos successfully!");
    }

    return res
    .status(200)
    .json(
        new apiResponse(200, likedVideos, "Fetched liked videos successfully!")
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}