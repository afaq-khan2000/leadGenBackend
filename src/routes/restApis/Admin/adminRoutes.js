const express = require("express");
const router = express.Router();
const validateRequest = require("../../../middleware/validateRequest");
const { authenticateUser } = require("../../../middleware/authenticateUser");
const { authenticateAdmin } = require("../../../middleware/authenticateAdmin");
const { AdminController } = require("../../../controller");

router.get(
  "/users",
  authenticateUser(),
  authenticateAdmin(),
  AdminController.getAllUsers
);

router.get(
  "/stats",
  authenticateUser(),
  authenticateAdmin(),
  AdminController.getStats
);

module.exports = router;
