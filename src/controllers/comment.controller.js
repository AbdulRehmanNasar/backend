import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {apiErrors as apiError} from "../utils/apiErrors.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncDbHandler as asyncHandler} from "../utils/asyncDbHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    let comments;
    try {
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
        };

        comments = await Comment.aggregatePaginate(
            await Comment.aggregate([
            {
                $match: {
                    video: videoId
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            }
        ]), options)
        if (comments.docs.length === 0) {
            console.log("No comments found for the video.");
            throw new apiError(404, "No comments found for the video.")
        }
    } catch (error) {
        throw new apiError(500, "Couldn't get the comments for the video", error)
    }

    return res
    .status(200)
    .json(
        new apiResponse(200, comments, "Comments fetched successfully for the video!")
    )
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { content } = req.body;
    const { videoId } = req.params
    const userId = req.user._id
    let createdComment;

    if (!content || typeof content !== "string" || content.trim() === "") {
        throw new apiError(400, "Please write something valid to add a comment!");
    }    

    if (!videoId  || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new apiError(400, "Invalid video ID or format.");
    }

    if (!userId) {
        throw new apiError(400, "User id does not exist, ineligible to comment!")
    }

    try {
        createdComment = await Comment.create({
            content,
            video: new mongoose.Types.ObjectId(videoId),
            owner: userId
        })
        if (!createdComment) {
            console.log("Error while creating the comment in addComment controller");
            
        }
    } catch (error) {
        throw new apiError(500, "Adding comment failed!", error)
    }

    return res
    .status(201)
    .json(
        new apiResponse(201, createdComment, "Comment added successfully!")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { content } = req.body;
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new apiError(400, "Invalid comment ID.");
    }

    if (!content) {
        throw new apiError(400, "Content cannot be empty.");
    }

    let commentUpdated;
    try {
        commentUpdated = await Comment.findByIdAndUpdate(
            commentId,
            { content },
            { new: true }
        );

        if (!commentUpdated) {
            throw new apiError(404, "Comment not found.");
        }
    } catch (error) {
        throw new apiError(500, "Comment could not be updated!", error);
    }

    return res
    .status(200)
    .json(
        new apiResponse(200, commentUpdated, "Comment updated successfully!"
        )
    );
});


const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
        throw new apiError(400, "Invalid comment ID.");
    }

    let commentDeleted;

    try {
        commentDeleted = await Comment.findByIdAndDelete(commentId)
        if (!commentDeleted) {
            console.log("Comment could not be deleted in deleteComment controller");
        }
    } catch (error) {
        throw new apiError(500, "Operation failed for deleting comment!", error)
    }

    return res
    .status(200)
    .json(
        new apiResponse(200, "Comment deleted successfully!", commentDeleted)
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
    }