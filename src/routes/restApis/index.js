const express = require("express");
const authRoutes = require("./Auth/authRoutes");
const leadRoutes = require("./Leads/leadRoutes");
const adminRoutes = require("./Admin/adminRoutes");


const { jsonResponseFormat } = require("../../middleware/jsonResponseFormat");

const router = express.Router();

// Router will use response formate
router.use(jsonResponseFormat);

// Auth Routes
router.use("/auth/", authRoutes);
router.use("/leads/", leadRoutes);
router.use("/admin/", adminRoutes);
module.exports = router;
