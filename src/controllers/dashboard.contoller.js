import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {User} from "../models/user.model.js"
import {apiErrors as apiError} from "../utils/apiErrors.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncDbHandler as asyncHandler} from "../utils/asyncDbHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const channelId = req.user._id;
    const { page = 1, limit = 5, uploadTime, numberOfVideos } = req.query;

    if (!channelId) {
        throw new apiError(400, "Invalid or missing channelId!");
    }

    const pageLimit = parseInt(limit);
    const offset = (page - 1) * pageLimit;
    const numberOfVideosToShow = numberOfVideos ? parseInt(numberOfVideos) : null;

    const finalLimit = numberOfVideosToShow && numberOfVideosToShow <= pageLimit
        ? numberOfVideosToShow
        : pageLimit;

    const timeRanges = {
        week: 7,
        month: 30,
        year: 365,
        alltime: null
    };

    const days = timeRanges[uploadTime] || null;
    const matchCondition = {
        owner: new mongoose.Types.ObjectId(channelId),
        ...(days && { createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } })
    };

    try {
        const totalSubscribers = await Subscription.countDocuments({
            channel: new mongoose.Types.ObjectId(channelId)
        });

        const videoInsights = await Video.aggregate([
            { $match: matchCondition },
            
            {
                $lookup: {
                    from: "likes",
                    foreignField: "video",
                    localField: "_id",
                    as: "likedVideos"
                }
            },
            {
                $lookup: {
                    from: "comments",
                    foreignField: "video",
                    localField: "_id",
                    as: "commentedVideos"
                }
            },

            { $sort: { views: -1 } },
            { $skip: offset },
            { $limit: finalLimit },

            {
                $group: {
                    _id: null,
                    totalVideos: { $sum: 1 },
                    totalViews: { $sum: "$views" },
                    totalLikes: { $sum: { $size: "$likedVideos" } },
                    totalComments: { $sum: { $size: "$commentedVideos" } }
                }
            },

            {
                $project: {
                    _id: 0,
                    totalVideos: 1,
                    totalViews: 1,
                    averageViews: {
                        $cond: [
                            { $eq: ["$totalVideos", 0] },
                            0,
                            { $divide: ["$totalViews", "$totalVideos"] }
                        ]
                    },
                    totalLikes: 1,
                    totalComments: 1
                }
            }
        ]);

        res
        .status(200)
        .json( new apiResponse(
            200,
            {data: {
                totalSubscribers,
                ...videoInsights[0] || {
                    totalVideos: 0,
                    totalViews: 0,
                    averageViews: 0,
                    totalLikes: 0,
                    totalComments: 0
                }
            }},
            "Channel stats fetched successfully!")
        );

    } catch (error) {
        throw new apiError(500, "Failed to fetch channel stats.");
    }
});

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const channelId = req.user._id

    if ( !channelId || !mongoose.Types.ObjectId.isValid(channelId) ) {
        throw new apiError(400, "Invalid or missing channel id.");
    }

    try {
        const userExists = await User.findById(channelId);

        if (!userExists) {
            throw new apiError(404, "Channel does not exist.");
        }

        const channelVideos = await Video.find(
            {
                owner: channelId
            }
        )
    
        if (channelVideos.length === 0) {
            throw new apiError(404, "No videos found for this channel.");
        }        
    
        return res
            .status(200)
            .json(
                new apiResponse(200, channelVideos, "Channel videos fetched successfully!")
        )
    } catch (error) {
        throw new apiError(500, "Failed to fetche channel videos!", error)
    }

})

export {
    getChannelStats, 
    getChannelVideos
    }