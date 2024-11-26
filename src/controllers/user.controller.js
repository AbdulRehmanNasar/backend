import { asyncDbHandler } from "../utils/asyncDbHandler.js";
import { apiErrors } from "../utils/apiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";
import cookie from "cookie-parser"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()
    
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
    
        return { accessToken, refreshToken }
    } catch (error) {
        throw new apiErrors(500, "Something went wrong while generating access and refresh tokens")
    }
}

const registerUser = asyncDbHandler ( async (req, res) => {
    const {username, email, fullname, password} = req.body
    
    if ( [username, email, fullname, password].some((field) => //some function return true if any of the element fulfills the condition
            field?.trim() === ""
        ) )
    {
        throw new apiErrors(400, "All fields are required")
    }

    const exitingUser = await User.findOne({
        $or: [{ username }, { email }] // $or another way to write logical operator
    })

    if ( exitingUser ) {
        throw new apiErrors(409, "User with the email or username already exists")
    }

    // console.log(req.files);
    
    

    const avatarLocalPath = req.files?.avatar[0]?.path

    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath;

    if( req.files &&  Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 ) {
        coverImageLocalPath = req.files.coverImage[0].path
    }


    if( !avatarLocalPath ) {
        throw new apiErrors(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if ( !avatar ) {
        throw new apiErrors(400, "Avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // console.log(user);
    

    const createdUser = await User.findById(user._id).select( //select => method to select all the elements except defined in the block
        "-password -refreshToken"
    )

    if( !createdUser ) {
        throw new apiErrors(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new apiResponse(200, createdUser, "User registered successfully!")
    )
})

const loginUser = asyncDbHandler ( async (req, res) => {
    // req body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token

    const {username, email, password} = req.body

    if (!(username || email)) {
        throw new apiErrors(400, "Username and email is required")
    }

    const user = await User.findOne({$or: [{username}, {email}]})

    if ( !user ) {
        throw new apiErrors(404, "Account does not exits!")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if ( !isPasswordValid ) {
        throw new apiErrors(401, "Your username, email or password is incorrect")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken") // will do it using user

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User LoggedIn Successfully!")
    )

})

const logoutUser = asyncDbHandler ( async (req, res) => {
    // const refreshToken = req.cookie.refreshToken
    // const user = await User.findOne({ refreshToken })

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: { refreshToken: 1 }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new apiResponse(200, {}, "User Logged Out")
    )
})

const refreshAccessToken = asyncDbHandler ( async (req, res) => {
    const cookieRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if ( !cookieRefreshToken ) {
        throw new apiErrors(401, "unauthorized request")
    }

    try {
        const decodedRefreshToken = jwt.verify( cookieRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = User.findById(decodedRefreshToken?._id).select("-password")
    
        if ( !user ) {
            throw new apiErrors(401, "Invalid refresh token")
        }
    
        if ( decodedRefreshToken !== user?.refreshToken) {
            throw new apiErrors(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200)
                  .cookie("accessToken", accessToken, options)
                  .cookie("refreshToken", refreshToken, options)
                  .json(
                    new apiResponse(
                        200,
                        {
                            accessToken,
                            refreshToken
                        },
                        "Access token is refreshed"
                    )
                  )
    } catch (error) {
        throw new apiErrors(401, error?.message || "Invalid refresh token")
    }
})

const updateCurrentPassword = asyncDbHandler ( async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    if (!user) {
        throw new apiErrors(404, "Error while getting user for update password")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new apiErrors(404, "Old password is incorrect")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new apiResponse(200, {}, "Password is changed successfully!"))
})

const getCurrentUser = asyncDbHandler ( async (req, res) => {
    return res
    .status(200)
    .json(new apiResponse(200, req.user.select("-password -refreshToken"), "Got current user!"))
})

const updateAccountDetails = asyncDbHandler ( async (req, res) => {
    const {fullname, email} = req.body

    if (!fullname || !email) {
        throw new apiErrors(400, "Fields are empty to update account details")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {fullname, email}
        },
        {new: true}
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new apiResponse(200, user, "Account details updated successfully!"))
})

const updateUserAvatar = asyncDbHandler ( async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new apiErrors(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new apiErrors(200, "Error while uploading avatar on cloudinary in update user avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new apiResponse(200, user, "Avatar updated successfully"))
})

const updateUserCoverImage = asyncDbHandler ( async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new apiErrors(400, "Cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new apiErrors(200, "Error while uploading cover image on cloudinary in update user cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new apiResponse(200, user, "Cover image updated successfully"))
})

const getUserChannelProfile = asyncDbHandler ( async (req, res) => {
    const { username } = req.params

    if ( !username ) {
        throw new apiErrors(400, "Username is required")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if ( !channel?.length ) {
        throw new apiErrors(404, "Channel does not exist!")
    }

    return res
    .status(200)
    .json(
        new apiResponse(200, channel[0], "User channel fetched successfully!")
    )

})

const getWatchHistory = asyncDbHandler ( async (req, res) => {
    const watchHistory = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
                // _id: req.user?._id
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullname: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner "
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new apiResponse(200, watchHistory[0].watchHistory, "Watch history fetched successfully!"))
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    updateCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}