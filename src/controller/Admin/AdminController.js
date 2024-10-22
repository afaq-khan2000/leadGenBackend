const path = require("path");
const moment = require("moment");
const DB = require("../../dbConfig/mdbConnection");
const Sequelize = require("sequelize");

const AdminController = {
  async getAllUsers(req, res) {
    try {
      const { query } = req;
      let { page, limit, search, sortBy, order } = query;

      page = parseInt(page) || 1;
      limit = parseInt(limit) || 10;
      const offset = (page - 1) * limit;

      order = order ? order.toUpperCase() : "ASC";
      let sortOrder = [[sortBy || "created_at", order]];

      if (search) {
        search = search.toLowerCase();
      } else {
        search = null;
      }

      const { rows: users, count: totalUsers } = await DB.UserModel.findAndCountAll({
        limit: limit,
        offset: offset,
        order: sortOrder,
        where: {
          [Sequelize.Op.and]: [
            search
              ? {
                  [Sequelize.Op.or]: [
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("username")), {
                      [Sequelize.Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("email")), {
                      [Sequelize.Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("phone")), {
                      [Sequelize.Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("first_name")), {
                      [Sequelize.Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("last_name")), {
                      [Sequelize.Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("dealership_name")), {
                      [Sequelize.Op.like]: `%${search}%`,
                    }),
                  ],
                }
              : {},
          ],
        },
        attributes: ["username", "email", "phone", "first_name", "last_name", "dealership_name", "created_at"],
      });

      let pagination = {};

      pagination.totalItems = totalUsers;
      pagination.currentPage = page;
      pagination.totalPages = Math.ceil(totalUsers / limit);

      return res.successResponse(
        false,
        {
          users,
          pagination,
        },
        "All Users Get Successfully"
      );
    } catch (error) {
      console.log("getAllUsers: ", error);
      return res.errorResponse(true, error.message);
    }
  },

  async getStats(req, res) {
    try {
      const totalUsers = await DB.UserModel.count();
      const totalLeads = await DB.LeadModel.count();
      const unlockedLeads = await DB.UnlockLeadModel.count();

      return res.successResponse(
        false,
        {
          totalUsers,
          totalLeads,
          unlockedLeads,
        },
        "All Stats Get Successfully"
      );
    } catch (error) {
      console.log("getStats: ", error);
      return res.errorResponse(true, error.message);
    }
  },

  async getUnlockedLeads(req, res) {
    try {
      const { query } = req;
      let { page, limit, search, sortBy, order } = query;

      page = parseInt(page) || 1;
      limit = parseInt(limit) || 10;
      const offset = (page - 1) * limit;

      order = order ? order.toUpperCase() : "ASC";
      let sortOrder;

      if (sortBy === "lead_name") {
        sortOrder = [[{ model: DB.LeadModel, as: "lead_final" }, "name", order]];
      } else if (sortBy === "lead_email") {
        sortOrder = [[{ model: DB.LeadModel, as: "lead_final" }, "email", order]];
      } else if (sortBy === "lead_phone") {
        sortOrder = [[{ model: DB.LeadModel, as: "lead_final" }, "phone", order]];
      } else if (sortBy === "car_brand_name") {
        sortOrder = [[{ model: DB.LeadModel, as: "lead_final" }, { model: DB.CarBrandModel, as: "car_brand_relationship" }, "car_brand_name", order]];
      } else if (sortBy === "car_model") {
        sortOrder = [[{ model: DB.LeadModel, as: "lead_final" }, "car_model", order]];
      } else if (sortBy === "unlock_date") {
        sortOrder = [["unlock_date", order]];
      } else if (sortBy === "credits_used") {
        sortOrder = [["credits_used", order]];
      } else if (sortBy === "lead_time") {
        sortOrder = [[{ model: DB.LeadModel, as: "lead_final" }, "lead_time", order]];
      } else {
        sortOrder = [["unlock_date", order]];
      }

      if (search) {
        search = search.toLowerCase();
      } else {
        search = null;
      }

      const { rows: leads, count: totalLeads } = await DB.UnlockLeadModel.findAndCountAll({
        limit: limit,
        offset: offset,
        order: sortOrder,
        include: [
          {
            model: DB.LeadModel,
            as: "lead_final",
            include: [
              {
                model: DB.CarBrandModel,
                attributes: ["car_brand_name"],
                as: "car_brand_relationship",
              },
            ],
          },
          {
            model: DB.UserModel,
            as: "user",
            attributes: ["username", "email", "phone"],
          },
        ],
        where: {
          [Sequelize.Op.and]: [
            search
              ? {
                  [Sequelize.Op.or]: [
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("lead_final.name")), {
                      [Sequelize.Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("lead_final.email")), {
                      [Sequelize.Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("lead_final.phone")), {
                      [Sequelize.Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("lead_final.car_brand_relationship.car_brand_name")), {
                      [Sequelize.Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("lead_final.car_model")), {
                      [Sequelize.Op.like]: `%${search}%`,
                    }),
                  ],
                }
              : {},
          ],
        },
      });

      let pagination = {};

      pagination.totalItems = totalLeads;
      pagination.currentPage = page;
      pagination.totalPages = Math.ceil(totalLeads / limit);

      return res.successResponse(
        false,
        {
          leads,
          pagination,
        },
        "All Unlocked Leads Get Successfully"
      );
    } catch (error) {
      console.log("getUnlockedLeads: ", error);
      return res.errorResponse(true, error.message);
    }
  },
};

module.exports = AdminController;
