import { Router } from "express";
import { checkUrlsController } from "../controller/urlController";

const router = Router();

router.post("/url-check", checkUrlsController);
export default router;
