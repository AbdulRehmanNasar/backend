import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import Subscription from "../models/subscription.model.js"
import {User} from "../models/user.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { Video } from "../models/video.model.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, uploadDate, duration, userId } = req.query
    const { userID } = req.user._id
    //TODO: get all videos based on query, sort, pagination
    let videos;
// if ( (!(query) || query === "" || query === " ") && userID ) {
if ( (!(query) || query === "" || query === " ") && userID ) {

    videos = await User.aggregate([
        {
            $match: {
                _id: userID
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribedTo",
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            localField: "channel",
                            foreignField: "owner",
                            as: "channelVideos"
                        }
                    },
                    {
                        $addFields: {
                            channelVideos: "$channelVideos"
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscribedTo"
        }
    ]);
} else {
    videos = await Video.aggregate([
        {
            $match: {
                isPublished: true,
                $or: [
                    { title: { $regex: query.trim(), $options: 'i' } },
                    { description: { $regex: query.trim(), $options: 'i' } }
                ]
            }
        },
        {
            $addFields: {
                relevance: {
                    $cond: {
                        if: {
                            $or: [
                                { $regexMatch: { input: "$title", regex: `^${query.trim()}$`, options: "i" } },
                                { $regexMatch: { input: "$description", regex: `^${query.trim()}$`, options: "i" } }
                            ]
                        },
                        then: 1,
                        else: {
                            $cond: {
                                if: {
                                    $or: [
                                        { $regexMatch: { input: "$title", regex: `${query.trim()}`, options: "i" } },
                                        { $regexMatch: { input: "$description", regex: `${query.trim()}`, options: "i" } }
                                    ]
                                },
                                then: 2,
                                else: 3
                            }
                        }
                    }
                }
            }
        },
        {
            $sort: {
                relevance: 1,
                
            }
        }
    ]);
}

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}