import mongoose, {Schema} from "mongoose";
import { type } from "os";


const likeSchema = new Schema({
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    tweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet"
    },
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    isLiked: {
        type: Boolean,
        default: false
    }
}, {timestamps: true})

export const Like = mongoose.model("Like", likeSchema)