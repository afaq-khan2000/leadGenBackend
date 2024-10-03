const express = require("express");
const { AuthController } = require("../../../controller");
const { signupSchema, loginSchema } = require("../../../validation/authSchema");
const router = express.Router();
const validateRequest = require("../../../middleware/validateRequest");
const { authenticateUser } = require("../../../middleware/authenticateUser");

router.post("/register", validateRequest(signupSchema), AuthController.signup);
router.post("/login", validateRequest(loginSchema), AuthController.login);
router.get("/checkout-session", authenticateUser(), AuthController.checkoutSession);
router.post("/payment/success", AuthController.paymentSuccess);

module.exports = router;
