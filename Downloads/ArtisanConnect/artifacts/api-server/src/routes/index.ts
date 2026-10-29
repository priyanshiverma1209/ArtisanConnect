import { Router, type IRouter } from "express";
import healthRouter from "./health";
import marketplaceRouter from "./marketplace";
import connectionsRouter from "./connections";
import reviewsRouter from "./reviews";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(marketplaceRouter);
router.use(connectionsRouter);
router.use(reviewsRouter);
router.use(notificationsRouter);

export default router;