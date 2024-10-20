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

      const { rows: users, count: totalUsers } =
        await DB.UserModel.findAndCountAll({
          limit: limit,
          offset: offset,
          order: sortOrder,
          where: {
            [Sequelize.Op.and]: [
              search
                ? {
                    [Sequelize.Op.or]: [
                      Sequelize.where(
                        Sequelize.fn("LOWER", Sequelize.col("username")),
                        {
                          [Sequelize.Op.like]: `%${search}%`,
                        }
                      ),
                      Sequelize.where(
                        Sequelize.fn("LOWER", Sequelize.col("email")),
                        {
                          [Sequelize.Op.like]: `%${search}%`,
                        }
                      ),
                      Sequelize.where(
                        Sequelize.fn("LOWER", Sequelize.col("phone")),
                        {
                          [Sequelize.Op.like]: `%${search}%`,
                        }
                      ),
                      Sequelize.where(
                        Sequelize.fn("LOWER", Sequelize.col("first_name")),
                        {
                          [Sequelize.Op.like]: `%${search}%`,
                        }
                      ),
                      Sequelize.where(
                        Sequelize.fn("LOWER", Sequelize.col("last_name")),
                        {
                          [Sequelize.Op.like]: `%${search}%`,
                        }
                      ),
                      Sequelize.where(
                        Sequelize.fn("LOWER", Sequelize.col("dealership_name")),
                        {
                          [Sequelize.Op.like]: `%${search}%`,
                        }
                      ),
                    ],
                  }
                : {},
            ],
          },
          attributes: [
            "username",
            "email",
            "phone",
            "first_name",
            "last_name",
            "dealership_name",
            "created_at",
          ],
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
};

module.exports = AdminController;
