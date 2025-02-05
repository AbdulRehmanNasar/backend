import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {apiErrors as apiError} from "../utils/apiErrors.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncDbHandler} from "../utils/asyncDbHandler.js"
import { unsubscribe } from "diagnostics_channel"


const toggleSubscription = asyncDbHandler(async (req, res) => {
    const {channelId} = req.params
    const userId = req.user._id
    // TODO: toggle subscription
    if ( !userId || !mongoose.Types.ObjectId.isValid(userId) ) {
        throw new apiError(404, "UserId not found or format is incorrect")
    }
    if ( !channelId || !mongoose.Types.ObjectId.isValid(channelId) ) {
        throw new apiError(400, "ChannelId or format is incorrect");
    }

    try {
        const isUserSubscriber = await Subscription.findOne({
            subscriber: userId,
            channel: channelId
        });    
    
        if ( !isUserSubscriber || isUserSubscriber.length === 0 ) {
            const subscribed = await Subscription.create({
                subscriber: userId,
                channel: channelId
            })
            if ( !subscribed ) {
                throw new apiError(500, "User subscription is failed!")
            }
    
            if ( subscribed ) {
                return res
                .status(200)
                .json(new apiResponse(200, { isSubscribed: true }, "User subscribed successfully!"))
            }
        } else if ( isUserSubscriber ) {
            const unsubscribed = await Subscription.findOneAndDelete({
                subscriber: userId,
                channel: channelId
            });

            if ( !unsubscribed ) {
                throw new apiError(500, "User unsubsription failed!")
            }
    
            return res
            .status(200)
            .json(
                new apiResponse(200, { isSubscribed: false }, "User unsubsribed successfully!")
            )
        }
    } catch (error) {
        throw new apiError(500, "Toggling subscription failed!")
    }
    
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncDbHandler(async (req, res) => {
    const {channelId} = req.params

    if ( !channelId || !mongoose.Types.ObjectId.isValid(channelId) ) {
        throw new apiError(400, "ChannelId or format is incorrect");
    }

    try {
        const subscribers = await Subscription.aggregate([
            {
                $match: {
                    channel: new mongoose.Types.ObjectId(channelId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "subscriber",
                    foreignField: "_id",
                    as: "subscriberDetails"
                }
            },
            {
                $unwind: "$subscriberDetails"
            },
            {
                $project: {
                    _id: 0,
                    subscriberId: "$subscriberDetails._id",
                    username: "$subscriberDetails.username",
                    fullname: "$subscriberDetails.fullname",
                    avatar: "$subscriberDetails.avatar",
                }
            }
        ])

        if ( !subscribers || subscribers.length === 0 ) {
            throw new apiError(404, "No subscribers found on the channel!")
        }

    return res
    .status(200)
    .json(
        new apiResponse(200, subscribers, "Subscribers got successfully!")
    )

    } catch (error) {
        throw new apiError(500, "Error occured during fetching subsribers list!")
    }
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncDbHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!subscriberId || !mongoose.Types.ObjectId.isValid(subscriberId)) {
        throw new apiError(400, "Subscriber ID is missing or invalid.");
    }

    try {
        const channelsSubscribed = await Subscription.aggregate([
            {
                $match: {
                    subscriber: new mongoose.Types.ObjectId(subscriberId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "channel",
                    as: "subscribedToList"
                }
            },
            {
                $unwind: "$subscribedToList"
            },
            {
                $project: {
                    _id: 0,
                    channelId: "$subscribedToList._id",
                    username: "$subscribedToList.username",
                    fullname: "$subscribedToList.fullname",
                    avatar: "$subscribedToList.avatar",
                }
            }
        ])

        if ( !channelsSubscribed || channelsSubscribed.length === 0 ) {
            throw new apiError(404, "No subscribed channels found!")
        }

    return res
    .status(200)
    .json(
        new apiResponse(200, channelsSubscribed, "Subscribed channels got successfully!")
    )

    } catch (error) {
        throw new apiError(500, "Error occured during fetching subscribed channels list!")
    }
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}