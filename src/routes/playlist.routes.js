import { Router } from "express"
import {
    createPlaylist, getUserPlaylists, getPlaylistById, addVideoToPlaylist,
    removeVideoFromPlaylist, deletePlaylist, updatePlaylist
} from "../controllers/playlist.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/create-playlist")
.post(
    verifyJWT,
    createPlaylist
)

router.route("/get-playlist/:userId")
.get(
    verifyJWT,
    getUserPlaylists
)

router.route("/get-playlist-by-id/:playlistId")
.get(
    verifyJWT,
    getPlaylistById
)

router.route("/add-video-to-playlist/:playlistId/:videoId")
.post(
    verifyJWT,
    addVideoToPlaylist
)

router.route("/remove-video-from-playlist/:playlistId/:videoId")
.patch(
    verifyJWT,
    removeVideoFromPlaylist
)

router.route("/delete-playlist/:playlistId")
.delete(
    verifyJWT,
    deletePlaylist
)

router.route("/update-playlist/:playlistId")
.patch(
    verifyJWT,
    updatePlaylist
)

export default router