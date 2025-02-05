import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {apiErrors as apiError} from "../utils/apiErrors.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncDbHandler as asyncHandler} from "../utils/asyncDbHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    const userId = req.user._id;
    //TODO: create playlist

    if ( !name || !description ) {
        throw new apiError(400, "Missing name or description for playlist.")
    }

    try {
        const existingPlaylist = await Playlist.findOne({ name, owner: userId });
            if (existingPlaylist) {
                throw new apiError(409, "Playlist with this name already exists.");
            }

        const createdPlaylist = await Playlist.create({
            name,
            description,
            owner: userId
        })
    
        if ( !createdPlaylist ) {
            throw new apiError(500, "Something went wrong while creating playlist")
        }
    
        return res
        .status(200)
        .json(
            new apiResponse(201, createdPlaylist, "Playlist created successfully!")
        )
    } catch (error) {
        throw new apiError(500, "Creating playlist failed!")
    }

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if ( !userId || !mongoose.Types.ObjectId.isValid(userId) ) {
        throw new apiError(400, "Unauthorized request || Incorrect format of userId")
    }

    try {
        const userPlaylist = await Playlist.find({owner: userId})
        
        if (userPlaylist.length === 0) {
            return res.status(200).json(
                new apiResponse(200, [], "No playlists found for this user.")
            );
        }

        return res
        .status(200)
        .json(
            new apiResponse(200, userPlaylist, "User playlist found successfully!")
        )
    } catch (error) {
        throw new apiError(500, "Fetching user playlist failed!")
    }
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if ( !playlistId || !mongoose.Types.ObjectId.isValid(playlistId) ) {
        throw new apiError(400, "Invalid or missing playlistId.");
    }

    try {
        const playlist = await Playlist.findById(playlistId)

        if ( !playlist ) {
            throw new apiError(404, "No playlist found!")
        }

        return res
        .status(200)
        .json(
            new apiResponse(200, playlist, "Playlist fetched successfully!")
        )
    } catch (error) {
        throw new apiError(500, "Fetching playlist failed!")
    }
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if ( !playlistId || !mongoose.Types.ObjectId.isValid(playlistId) ) {
        throw new apiError(400, "Invalid or missing playlistId.");
    }
    if ( !videoId || !mongoose.Types.ObjectId.isValid(videoId) ) {
        throw new apiError(400, "Invalid or missing videoId.");
    }

    try {
        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            { $addToSet: { videos: videoId } },
            { new: true }
        );        
    
        if ( !updatedPlaylist ) {
            throw new apiError(500, "Failed to add video to playlist!")
        }
    
        return res
        .status(201)
        .json(
            new apiResponse(200, updatedPlaylist, "Video added to playlist successfully!")
        )
    } catch (error) {
        throw new apiError(500, "Failed to add video to playlist!!")
    }
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

    if ( !playlistId || !mongoose.Types.ObjectId.isValid(playlistId) ) {
        throw new apiError(400, "Invalid or missing playlistId.");
    }
    if ( !videoId || !mongoose.Types.ObjectId.isValid(videoId) ) {
        throw new apiError(400, "Invalid or missing videoId.");
    }

    try {
        const updatedPlaylistAfterRemoval = await Playlist.findByIdAndUpdate(
            playlistId,
            { $pull: { videos: videoId } },
            { new: true }
        );

    
        if ( !updatedPlaylistAfterRemoval ) {
            throw new apiError(500, "Failed to delete video from playlist!")
        }
    
        return res
        .status(200)
        .json(
            new apiResponse(200, updatedPlaylistAfterRemoval, "Video removed from playlist successfully!")
        )
    } catch (error) {
        throw new apiError(500, "Failed to remove video from playlist!!")
    }
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist

    if ( !playlistId || !mongoose.Types.ObjectId.isValid(playlistId) ) {
        throw new apiError(400, "Invalid or missing playlistId.");
    }
    
    try {
        const deletedPlaylist = await Playlist.findByIdAndDelete( playlistId )
    
        if ( !deletedPlaylist ) {
            throw new apiError(404, "Playlist not found!");
        }
    
        return res
            .status(200)
            .json(
                new apiResponse(200, deletedPlaylist, "Playlist deleted successfully!")
            )
    } catch (error) {
        throw new apiError(500, "Failed to delete playlist!!")
    }
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if ( !playlistId || !mongoose.Types.ObjectId.isValid(playlistId) ) {
        throw new apiError(400, "Invalid or missing playlistId.");
    }

    if ( !name || !description ) {
        throw new apiError(400, "Missing name or description for playlist.")
    }

    try {
        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                name,
                description
            },
            {
                new: true
            }
        )
    
        if ( !updatedPlaylist ) {
            throw new apiError(404, "Playlist not found!");
        }
    
        return res
        .status(200)
        .json(
            new apiResponse(200, updatedPlaylist, "Playlist updated successfully!")
        )
    } catch (error) {
        throw new apiError(500, "Failed to update playlist!")
    }
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}