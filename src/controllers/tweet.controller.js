import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {apiErrors as apiError} from "../utils/apiErrors.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncDbHandler as asyncHandler} from "../utils/asyncDbHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { v2 as cloudinary } from 'cloudinary';

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body;
    const owner = req.user._id;

    if (!content || typeof content !== "string" || content.trim() === "") {
        throw new apiError(400, "Content is required and must be valid!");
    }

    if (!owner) {
        throw new apiError(400, "Login to post tweet | Unauthorized request");
    }

    let tweetImageFile, tweetVideoFile;

    try {
        if (req.files?.tweetImage) {
            const tweetImageLocalPath = req.files?.tweetImage[0].path;
            tweetImageFile = await uploadOnCloudinary(tweetImageLocalPath);
            if (!tweetImageFile) {
                throw new apiError(500, "Error uploading image to Cloudinary.");
            }
        }

        if (req.files?.tweetVideo) {
            const tweetVideoLocalPath = req.files?.tweetVideo[0].path;
            tweetVideoFile = await uploadOnCloudinary(tweetVideoLocalPath);
            if (!tweetVideoFile) {
                throw new apiError(500, "Error uploading video to Cloudinary.");
            }
        }

        let tweet;

        try {
            tweet = await Tweet.create({
                content,
                tweetImage: {
                    imageURL: tweetImageFile?.url ?? null,
                    publicId: tweetImageFile?.public_id ?? null
                },
                tweetVideo: {
                    videoURL: tweetVideoFile?.url ?? null,
                    publicId: tweetVideoFile?.public_id ?? null,
                    format: tweetVideoFile?.format ?? null,
                    width: tweetVideoFile?.width ?? null,
                    height: tweetVideoFile?.height ?? null
                },
                owner
            });
        } catch (error) {
            throw new apiError(500, "An error occurred while creating the tweet.", error);
        }

        return res.status(201).json(new apiResponse(201, tweet, "Tweet posted successfully!"));
    } catch (error) {
        throw new apiError(500, "An error occurred while posting the tweet.", error);
    }
});

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const userId = req.user._id;

    if (!userId) {
        throw new apiError(400, "Login to get your tweets | Unauthorized request")
    }

    try {
        const userTweets = await Tweet.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                },
            },
            {
                $sort: {
                    createdAt: -1
                }
            }
        ])
    
        if (!userTweets || userTweets.length === 0) {
            throw new apiError(404, "No tweets found!")
        }
    
        return res
        .status(200)
        .json(
            new apiResponse(200, userTweets, "Tweets fetched successfully!")
        )
    } catch (error) {
        throw new apiError(500, "Could not fetch tweets!", error)
    }
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params
    const {content} = req.body

    if (!content || typeof content !== "string" || content.trim() === "") {
        throw new apiError(400, "Content must be a valid non-empty string!");
    }

    let tweet;

    try {
        tweet = await Tweet.findById(tweetId)
    } catch (error) {
        throw new apiError(500, "Could not fetch the tweet", error)
    }

    if (!tweet) {
        throw new apiError(404, "No tweet found!")
    }

    const tweetImagePath = req.files?.tweetImage?.[0]?.path || null;
    const tweetVideoPath = req.files?.tweetVideo?.[0]?.path || null;

    let tweetImageFile = "";
    let tweetVideoFile = ""

    if ( tweetImagePath ) {
        try {
            tweetImageFile = await uploadOnCloudinary(tweetImagePath);
            tweet.tweetImage.imageURL = tweetImageFile.url,
            tweet.tweetImage.publicId = tweetImageFile.public_id
        } catch (error) {
            throw new apiError(500, "Failed to upload tweet image to cloudinary", error)
        }
        await cloudinary.uploader.destroy(tweet.tweetImage.publicId)
    }

    if ( tweetVideoPath ) {
        try {
            tweetVideoFile = await uploadOnCloudinary(tweetVideoPath);
            tweet.tweetVideo.videoURL = tweetVideoFile.url,
            tweet.tweetVideo.publicId = tweetVideoFile.public_id,
            tweet.tweetVideo.format = tweetVideoFile.format,
            tweet.tweetVideo.width = tweetVideoFile.width,
            tweet.tweetVideo.height = tweetVideoFile.height
        } catch (error) {
            throw new apiError(500, "Failed to upload tweet video to cloudinary", error)
        }
        await cloudinary.uploader.destroy(tweet.tweetVideo.publicId)
    }

    if (content) tweet.content = content

    await tweet.save();

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            tweet,
            "Tweet updated successfully!"
        )
    )

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params

    try {
        const tweet = await Tweet.findById(tweetId)

        if (!tweet) {
            throw new apiError(404, "Tweet does not found!")
        }

        try {
            if (tweet.tweetImage?.publicId) {
                await cloudinary.uploader.destroy(tweet.tweetImage.publicId);
            }
            if (tweet.tweetVideo?.publicId) {
                await cloudinary.uploader.destroy(tweet.tweetVideo.publicId);
            }
        } catch (error) {
            throw new apiError(500, "Failed to delete media files from Cloudinary.", error);
        }

        const deleteTweet = await Tweet.findByIdAndDelete(new mongoose.Types.ObjectId(tweetId))

        if (!deleteTweet) {
            console.log("Tweet is not deleted!");
        }

        return res
        .status(200)
        .json(
            new apiResponse(
                200,
                deleteTweet,
                "Tweet deleted successfully!"
            )
        )
    } catch (error) {
        throw new apiError(500, "Could not delete the tweet!", error)
    }
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}