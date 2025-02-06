import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {apiErrors as apiError} from "../utils/apiErrors.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncDbHandler as asyncHandler} from "../utils/asyncDbHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new apiError(400, "VideoId or format is incorrect");
    }

    try {
        let isVideoLiked = await Like.findOne({ 
            video: videoId, 
            likedBy: userId 
        });

        if (!isVideoLiked) {
            const newLike = await Like.create({
                video: videoId,
                likedBy: userId,
                isLiked: true
            });

            return res.status(200).json(
                new apiResponse(200, newLike, "Video like status toggled successfully to liked!")
            );
        } else {
            const unliked = await Like.deleteOne({ _id: isVideoLiked._id });

            return res.status(200).json(
                new apiResponse(200, unliked, "Video like status toggled successfully to unliked!")
            );
        }
    } catch (error) {
        console.error(error);
        throw new apiError(500, "Error while toggling video like status", error.message);
    }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
        throw new apiError(400, "CommentId or format is incorrect");
    }

    let commentLikeStatus;

    try {
        commentLikeStatus = await Like.findOneAndUpdate(
            { comment: commentId },
            { $bit: { isLiked: { xor: 1 } } },
            { new: true }
        );

        if (!commentLikeStatus) {
            commentLikeStatus = await Like.create({
                comment: commentId,
                isLiked: 1,
            });
        }

    } catch (error) {
        throw new apiError(500, "Error while toggling comment like status", error);
    }

    return res
        .status(200)
        .json(
            new apiResponse(200, commentLikeStatus.isLiked, "Comment like status toggled successfully!")
        );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!tweetId || !mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new apiError(400, "TweetId or format is incorrect");
    }

    let tweetLikeStatus;
    try {
        tweetLikeStatus = await Like.findOneAndUpdate(
            { tweet: tweetId },
            { $bit: { isLiked: { xor: 1 } } },
            { new: true }
        );

        if (!tweetLikeStatus) {
            tweetLikeStatus = await Like.create({
                tweet: tweetId,
                isLiked: 1,
            });
        }

    } catch (error) {
        throw new apiError(500, "Error while toggling tweet like status", error);
    }

    return res
        .status(200)
        .json(
            new apiResponse(200, tweetLikeStatus.isLiked, "Tweet like status toggled successfully!")
        );
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    if (!userId) {
        throw new apiError(400, "Ineligible request | User not found!");
    }

    try {
        const likedVideos = await Like.aggregate([
            {
                $match: {
                    likedBy: userId
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "video",
                    foreignField: "_id",
                    as: "videoDetails"
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        const filteredVideos = likedVideos.filter(video => video.videoDetails.length > 0);
        if (filteredVideos.length === 0) {
            throw new apiError(404, "There is no valid video liked by the user!");
        }


        console.log("Fetched liked videos successfully!");

        return res.status(200).json(
            new apiResponse(200, likedVideos, "Fetched liked videos successfully!")
        );

    } catch (error) {
        throw new apiError(500, "Could not fetch the liked videos for the user!", error);
    }
});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}