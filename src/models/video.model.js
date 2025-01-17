import mongoose, { Schema } from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

const videoSchema = new Schema({
    videoFile: {
        type: String, //from 3rd party like cloudinary
        required: true
    },
    thumbnailFile: {
        type: String, //also from 3rd party
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    tags: {
        type: Array,
    },
    duration: {
        type: Number, //also from 3rd party
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"

    }
},{timestamps: true})

videoSchema.plugin(mongooseAggregatePaginate) //to write aggregation queries

export const Video = mongoose.model("Video", videoSchema)