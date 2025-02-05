import { Router } from "express"
import {
    healthcheck
} from "../controllers/healthcheck.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/healthcheck")
.get(
    verifyJWT,
    healthcheck
)

export default router