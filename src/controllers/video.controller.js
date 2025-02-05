import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {User} from "../models/user.model.js"
import {apiErrors} from "../utils/apiErrors.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncDbHandler} from "../utils/asyncDbHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { v2 as cloudinary } from 'cloudinary';



const getAllVideos = asyncDbHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, uploadDate, duration, userId } = req.query
    const { userID } = req.user._id
    //TODO: get all videos based on query, sort, pagination
    let videos;
    
    let watchChannelsOffset = (page-1);
    let othersOffset = (page-1)*3;

    const sort = { [sortBy]: sortType === "desc" ? -1 : 1 };
    
    const filters = [];
    if (uploadDate) filters.push({ uploadDate: { $gte: new Date(uploadDate) } });
    if (duration) filters.push({ duration: { $lte: parseInt(duration, 10) } });
    if (userId) filters.push({ userId });

    const finalFilters = filters.length > 0 ? { $and: filters } : {};
    
    // if ( (!(query) || query === "" || query === " ") && userID ) {
        if (!(query) || query === "" || query === " ") {
            try {
                videos = await User.aggregate([
                    {
                        $match: {
                            _id: userID
                        }
                    },        
                    {
                        $lookup: {
                            from: "videos",
                            localField: "watchHistory",
                            foreignField: "id",
                            as: "allCategories",
                            pipeline: [
                                {
                                    $match: {
                                        isPublished: true
                                    }
                                },
                                {
                                    $facet: {
                                        watchedVideosChannel: [...subscribedChannelsLatestVideo(watchChannelsOffset, limit)],
                                        tagMatchedVideos: [...relevantVideosByMatchingTags(othersOffset, limit)],
                                        tagMatchedMillionVideos: [...relevantPopularVideosByMatchingTags(othersOffset, limit)]
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $lookup: {
                            from: "videos",
                            as: "trendingVideos",
                            pipeline: [
                                { 
                                    $match: { 
                                        isPublished: true,
                                        $expr: {
                                            $and: [
                                                { $gte: ["$views", 1000000] },
                                                {
                                                    $gte: [
                                                        "$uploadAt",
                                                        { $dateSubtract: { startDate: "$$NOW", unit: "day", amount: 1 } }
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                },
                                { $sort: { views: -1 } },
                                { $skip: othersOffset },
                                { $limit: limit-7 }
                            ]
                        }
                    },
                    {
                        $project: {
                            combinedVideos: {
                                $concatArrays: [
                                    "$allCategories.watchedVideosChannel",
                                    "$allCategories.tagMatchedVideos",
                                    "$allCategories.tagMatchedMillionVideos",
                                    "$trendingVideos"
                                ]
                            }
                        }
                    },
                    { $unwind: "$combinedVideos" },
                    {
                        $group: {
                            _id: "$combinedVideos._id",
                            video: { $first: "$combinedVideos" }
                        }
                    },
                    { $replaceRoot: { newRoot: "$video" } },
                    { $sort: { uploadDate: -1 } }
                ]);

            return res
            .status(200)
            .json(new apiResponse(200, videos, "Videos fetched successfully!"))

            } catch (error) {
                throw new apiErrors(500, "Something went wrong while fetching videos for user feed", error);
            }
        } else {
            try {
                videos = await Video.aggregate([
                    {
                        $match: {
                            isPublished: true,
                            $or: [
                                { title: { $regex: `.*${query.trim()}.*`, $options: 'i' } },
                                { description: { $regex: `.*${query.trim()}.*`, $options: 'i' } }
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
                                                    { $regexMatch: { input: "$title", regex: query.trim(), options: "i" } },
                                                    { $regexMatch: { input: "$description", regex: query.trim(), options: "i" } }
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
                        $match: finalFilters
                    },
                    {
                        $sort: sort
                    }
                ]);
                
                if (!videos || videos.length === 0) {
                    throw new apiErrors(404, "Videos not found!");
                }
        
                return res
                    .status(200)
                    .json(new apiResponse(200, videos, "Videos fetched successfully!"));
            } catch (error) {
                throw new apiErrors(500, "Something went wrong while fetching videos for the query", error);
            }
        }
        
})

const subscribedChannelsLatestVideo = (watchChannelsOffset, limit) => [
    { 
        $match: { 
            $expr: {
                $gte: [
                    "$addedAt",
                    { $dateSubtract: { startDate: "$$NOW", unit: "day", amount: 7 } }
                ]
            }
        }
    },
    {
        $lookup: {
            from: "subscriptions",
            localField: "owner",
            foreignField: "channel",
            as: "watchedAndSubscribedSameChannel",
            pipeline: [
                {
                    $lookup: {
                        from: "videos",
                        localField: "channel",
                        foreignField: "owner",
                        as: "channelVideos",
                        pipeline: [
                            { $sort: { uploadDate: -1 } },
                            {
                                $group: {
                                    _id: "$owner",
                                    latestVideo: { $first: "$$ROOT" }
                                }
                            }
                        ]
                    }
                }
            ]
        }
    },
    { $skip: watchChannelsOffset },
    { $limit: limit - 9 }
];

const relevantVideosByMatchingTags = (othersOffset, limit) => [
    {
        $lookup: {
            from: "videos",
            localField: "tags",
            foreignField: "tags",
            as: "matchedVideosByTags",
            pipeline: [
                {
                    $match: { 
                        $expr: {
                            $gte: [
                                "$addedAt",
                                { $dateSubtract: { startDate: "$$NOW", unit: "day", amount: 30 } }
                            ]
                        }
                    }
                }
            ]
        }
    },
    { $skip: othersOffset },
    { $limit: limit - 7 },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", videos: { $push: "$$ROOT" } } }
];

const relevantPopularVideosByMatchingTags = (othersOffset, limit) => [
    { 
        $lookup: {
            from: "videos",
            localField: "tags",
            foreignField: "tags",
            as: "matchedVideosByTags",
            pipeline: [
                {
                    $match: { 
                        $expr: {
                            $and: [
                                { 
                                    $gte: ["$addedAt", { $dateSubtract: { startDate: "$$NOW", unit: "day", amount: 30 } }] 
                                },
                                { $gte: ["$views", 1000000] }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        matchedTagsLength: { $size: "$matchedVideosByTags" }
                    }
                }
            ]
        }
    },
    { $skip: othersOffset },
    { $limit: limit - 7 },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", videos: { $push: "$$ROOT" } } }
];

// const publishAVideo = asyncDbHandler(async (req, res) => {
//     const { title, description, tags, isPublished } = req.body;
//     console.log("INside publish video");
    

//     // TODO: get video, upload to cloudinary, create video
//     if (!(title && description)) {
//         throw new apiErrors(400, "Both title and description of the video are required");
//     }

//     const videoFileLocalPath = req.files?.video[0].path;
//     if (!videoFileLocalPath) {
//         throw new apiErrors(400, "Video file is required to publish");
//     }

//     try {
//         const videoFile = await uploadOnCloudinary(videoFileLocalPath);
//         if (!videoFile) {
//             throw new apiErrors(500, "Failed to upload the video to Cloudinary");
//         }
//     } catch (error) {
//         throw new apiErrors(500, "Something went wrong while uploading the video to Cloudinary");
//     }


//     const thumbnailFileLocalPath = req.files?.thumbnail?.[0]?.path;
//     let thumbnailFile;

//     if (thumbnailFileLocalPath) {

//         try {
//             thumbnailFile = await uploadOnCloudinary(thumbnailFileLocalPath);
//             if (!thumbnailFile) {
//                 throw new apiErrors(500, "Something went wrong while uploading the thumbnail to Cloudinary");
//             }
//         } catch (error) {
//             throw new apiErrors(500, "Failed to upload the thumbnail to Cloudinary");
//         }
//     } else {
//         const generatedThumbnailUrl = cloudinary.url(videoFile.public_id, {
//             resource_type: "video",
//             start_offset: 10,
//             format: "jpg",
//         });

//         if (!generatedThumbnailUrl) {
//             throw new apiErrors(500, "Something went wrong while generating the thumbnail from the video");
//         }

//         thumbnailFile = {
//             url: generatedThumbnailUrl,
//         };
//     }

//     try {
//         const video = await Video.create({
//             videoFile: {
//                 url: videoFile.url,
//                 public_id: videoFile.public_id,
//             },
//             thumbnailFile: {
//                 url: thumbnailFile.url,
//                 public_id: thumbnailFile.public_id || null,
//             },
//             title,
//             description,
//             tags,
//             isPublished,
//             owner: req.user._id,
//         });
    
//         return res.status(201).json(
//             new apiResponse(201, video, "Video is published successfully!")
//         );
//     } catch (error) {
//         throw new apiErrors(500, "Uploading video failed!", error)
//     }
// });

const publishAVideo = asyncDbHandler(async (req, res) => {
    const { title, description, tags, isPublished } = req.body;

    if (!(title && description)) {
        throw new apiErrors(400, "Both title and description of the video are required");
    }

    const videoFileLocalPath = req.files?.video[0]?.path;
    if (!videoFileLocalPath) {
        throw new apiErrors(400, "Video file is required to publish");
    }

    let videoFile;
    try {
        videoFile = await uploadOnCloudinary(videoFileLocalPath);
        if (!videoFile) {
            throw new apiErrors(500, "Failed to upload the video to Cloudinary");
        }
    } catch (error) {
        throw new apiErrors(500, "Something went wrong while uploading the video to Cloudinary");
    }

    const thumbnailFileLocalPath = req.files?.thumbnail?.[0]?.path ?? "null";
    let thumbnailFile;

    if (!thumbnailFileLocalPath || thumbnailFileLocalPath === "undefined" || thumbnailFileLocalPath === "null") {
        try {
            const generatedThumbnailUrl = cloudinary.url(videoFile.public_id, {
                resource_type: "video",
                start_offset: 10,
                format: "jpg",
            });

            if (!generatedThumbnailUrl) {
                throw new apiErrors(500, "Something went wrong while generating the thumbnail from the video");
            }            

            thumbnailFile = generatedThumbnailUrl

        } catch (error) {
            throw new apiErrors(500, "Failed to generate the thumbnail from the video");
        }
    } else {
        try {
            thumbnailFile = await uploadOnCloudinary(thumbnailFileLocalPath);
            if (!thumbnailFile) {
                throw new apiErrors(500, "Something went wrong while uploading the thumbnail to Cloudinary");
            }
        } catch (error) {
            throw new apiErrors(500, "Failed to upload the thumbnail to Cloudinary");
        }
    }

    try {
        const video = await Video.create({
            videoFile: {
                videoURL: videoFile.secure_url,
                publicId: videoFile.public_id,
                format: videoFile.format,
                width: videoFile.width,
                height: videoFile.height
            },
            thumbnailFile: {
                thumbnailURL: thumbnailFile?.secure_url ?? thumbnailFile,
                publicId: thumbnailFile?.public_id ?? null,
            },
            duration: videoFile.duration,
            title,
            description,
            tags,
            isPublished,
            owner: req.user._id,
        });

        return res.status(201).json(
            new apiResponse(201, video, "Video is published successfully!")
        );
    } catch (error) {
        throw new apiErrors(500, "Uploading video failed!", error);
    }
});

const getVideoById = asyncDbHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if (!videoId) {
        throw new apiErrors(400, "VideoID is not provided by user")
    }
    let video;
    try {
        video = await Video.findById(videoId).select("Title description thumbnailFile tags")
    } catch (error) {
        throw new apiErrors(404, "Video not found")
    }
    if (!video) {
        throw new apiErrors(404, "Video not found")
    }

    return res
    .status(200)
    .json(
        new apiResponse(200, video, "Video fetched successfully!")
    )
})

const updateVideo = asyncDbHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body
    //TODO: update video details like title, description, thumbnail

    const video = await Video.findById(videoId)

    const thumbnailFilePath = req.files?.thumbnail[0].path

    let thumbnailFile = "";

    if ( thumbnailFilePath ) {
        try {
            thumbnailFile = await uploadOnCloudinary(thumbnailFilePath);
        } catch (error) {
            throw new apiErrors(500, "Failed to upload thumbnail to cloudinary", error)
        }
        await cloudinary.uploader.destroy(video.thumbnailFile.public_id)
    }

    if (title) video.title = title;
    if (description) video.description = description;
    if (thumbnailFile) video.thumbnailFile.url = thumbnailFile.url, video.thumbnailFile.public_id = thumbnailFile.public_id;


    await video.save();
 
    return res
    .status(200)
    .json(
        new apiResponse(200, video, "Video updated successfully!")
    )
})

const deleteVideo = asyncDbHandler(async (req, res) => {
    const { videoId } = req.params;

    //TODO: delete video
    let video;
    try {
        video = await Video.findById(videoId);
        if (!video) {
            throw new apiErrors(404, "No video found to delete");
        }
    } catch (error) {
        console.error("Error finding video:", error);
        throw new apiErrors(500, "Error occurred while searching for video", error);
    }

    try {

        if (!video.videoFile || !video.videoFile.publicId) {
            throw new apiErrors(400, "Video public_id is missing. Cannot delete video from Cloudinary.");
        }

        const deletedVideoResponse = await cloudinary.uploader.destroy(video.videoFile.publicId, { resource_type: "video" });

        if (!deletedVideoResponse || deletedVideoResponse.result !== "ok") {
            console.error("Failed to delete video from Cloudinary:", deletedVideoResponse);
            throw new apiErrors(500, "Video could not be deleted from Cloudinary");
        }

        console.log("Video deleted successfully from Cloudinary");

        const deletedThumbnailResponse = video.thumbnailFile?.publicId 
            ? await cloudinary.uploader.destroy(video.thumbnailFile.publicId) 
            : null;

        if (deletedThumbnailResponse && deletedThumbnailResponse.result !== "ok") {
            console.error("Failed to delete thumbnail from Cloudinary:", deletedThumbnailResponse);
            throw new apiErrors(500, "Thumbnail could not be deleted from Cloudinary");
        }

        console.log("Thumbnail deleted successfully from Cloudinary");
    } catch (error) {
        console.error("Error deleting video or thumbnail from Cloudinary:", error);
        throw new apiErrors(500, "An error occurred while deleting the video and thumbnail from Cloudinary", error);
    }

    try {
        await video.deleteOne();
        console.log("Video deleted successfully from the database");
    } catch (error) {
        console.error("Error deleting video from database:", error);
        throw new apiErrors(500, "An error occurred while deleting the video record", error);
    }

    return res.status(200).json(
        new apiResponse(200, null, "Video deleted successfully!")
    );
});

const togglePublishStatus = asyncDbHandler(async (req, res) => {
    const { videoId } = req.params

    let video;

    try {
        video = await Video.findById(videoId)
        if (!video) {
            throw new apiErrors(404, "Video does not found for toggling publish status!")
        }

        const previousStatus = video.isPublished;
        video.isPublished = !previousStatus;

        if (previousStatus !== video.isPublished) {
            await video.save();
        }
    } catch (error) {
        console.error("Error during video search or status update:", error);
        throw new apiErrors(500, "Error occurred while searching for video to toggle publish status!")
    }

    return res
    .status(200)
    .json(
        new apiResponse(200, video, "Video published status is toggled successfully!")
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}






//www {
           // VIDEO Controller
                //     $lookup: {
                //         from: "videos",
                //         localField: "watchHistory",
                //         foreignField: "id",
                //         as: "watchedVideosChannel",
                //         pipeline: [
                //             {
                //                 $match: {
                //                     $expr: {
                //                         $gte: [
                //                             "addedAt",
                //                             { $dateSubtract: { startDate: "$$NOW", unit: "day", amount: 7 } }
                //                         ]
                //                     }
                //                 },
                //                 $lookup: {
                //                     from: "subscriptions",
                //                     localField: "owner",
                //                     foreignField: "channel",
                //                     as: "watchedAndSubscribedSameChannel",
                //                     pipeline: [
                //                         {
                //                             $lookup: {
                //                                 from: "videos",
                //                                 localField: "channel",
                //                                 foreignField: "owner",
                //                                 as: "channelVideos",
                //                                 pipeline: [
                //                                     {
                //                                         $sort: {
                //                                             uploadDate: -1
                //                                         }
                //                                     },
                //                                     {
                //                                         $group: {
                //                                             _id: "$owner",
                //                                             latestVideo: { $first: "$$ROOT" }
                //                                         }
                //                                     },
                //                                     {
                //                                         $limit: 1
                //                                     }
                //                                 ]
                //                             }
                //                         }
                //                     ]
                //                 }
                //             }
                //         ]
                //     }
                //     {
                //         $unwind: "$watchedVideosChannel"
                //     },
                //     {
                //         $lookup: {
                //             from: "videos",
                //             as: "trendingVideos",
                //             pipeline: [
                //               {
                //                 $match: {
                //                   $expr: {
                //                     $and: [
                //                       { $gte: ["$views", 1000000] },
                //                       {
                //                         $gte: [
                //                           "$uploadAt",
                //                           { $dateSubtract: { startDate: "$$NOW", unit: "day", amount: 1 } }
                //                         ]
                //                       }
                //                     ]
                //                   }
                //                 }
                //               },
                //               {
                //                 $limit: 3
                //               }
                //             ]
                //           }
                          
                //     },
                //     {
                //         $lookup: {
                //             from: "videos",
                //             localField: "watchHistory",
                //             foreignField: "id",
                //             as: "watchHistoryVideos",
                //             pipeline: [
                //                 {
                //                     $match: {
                //                         isPublished: true,
                //                         $expr: {
                //                             $gte: [
                //                                 "addedAt",
                //                                 { $dateSubtract: { startDate: "$$NOW", unit: "day", amount: 30 } }
                //                             ]
                //                         }
                //                     }
                //                 },
                //                 {
                //                     $lookup: {
                //                         from: "videos",
                //                         localField: "tags",
                //                         foreignField: "tags",
                //                         as: "matchedVideosByTags",
                //                         pipeline: [
                //                             {
                //                                 $addFields: {
                //                                     matchedTagsLength: { $size: "$matchedVideosByTags" }
                //                                 }
                //                             },
                //                             {
                //                                 $limit: 3
                //                             }
                //                         ]
                //                     }
                //                 }
                //             ]
                //         }
                //     },
                //     {
                //         $lookup: {
                //             from: "videos",
                //             localField: "watchHistory",
                //             foreignField: "id",
                //             as: "watchHistoryVideos",
                //             pipeline: [
                //                 {
                //                     $lookup: {
                //                         from: "videos",
                //                         localField: "tags",
                //                         foreignField: "tags",
                //                         as: "matchedVideosByTags",
                //                         pipeline: [
                //                             {
                //                                 $match: {
                //                                     isPublished: true,
                //                                     $expr: {
                //                                         $gte: [
                //                                             "views",
                //                                             1000000
                //                                         ]
                //                                     }
                //                                 },
                //                                 $addFields: {
                //                                     matchedTagsLength: { $size: "$matchedVideosByTags" }
                //                                 },
                //                             },
                //                             {
                //                                 $limit: 3
                //                             }
                //                         ]
                //                     }
                //                 }
                //             ]
                //         }
                //     },
                // },www