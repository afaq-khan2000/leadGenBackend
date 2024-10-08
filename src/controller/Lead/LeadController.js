const { Sequelize, where } = require("sequelize");
const DB = require("../../dbConfig/mdbConnection");

const getAllLeads = async (req, res) => {
  let t;
  try {
    const { query, user } = req;
    let { page, limit, search, sortBy, order } = query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    order = order ? order.toUpperCase() : "ASC";
    let sortOrder;
    if (sortBy === "car_brand_name") {
      sortOrder = [[{ model: DB.CarBrandModel, as: "car_brand_relationship" }, "car_brand_name", order]];
    } else {
      sortOrder = [[sortBy || "lead_time", order]];
    }

    if (search) {
      search = search.toLowerCase();
    } else {
      search = null;
    }

    t = await DB.sequelize.transaction();
    const { rows: leads, count: totalLeads } = await DB.LeadModel.findAndCountAll({
      limit: limit,
      offset: offset,
      order: sortOrder,
      where: {
        [Sequelize.Op.and]: [
          search
            ? {
                [Sequelize.Op.or]: [
                  Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("name")), {
                    [Sequelize.Op.like]: `%${search}%`,
                  }),
                  Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("car_model")), {
                    [Sequelize.Op.like]: `%${search}%`,
                  }),
                  {
                    "$car_brand_relationship.car_brand_name$": {
                      [Sequelize.Op.like]: `%${search}%`,
                    },
                  },
                ],
              }
            : {},
          {
            // Exclude leads that exist in UnlockLeadModel
            lead_id: {
              [Sequelize.Op.notIn]: Sequelize.literal(`(SELECT lead_id FROM unlock_leads)`),
            },
          },
        ],
      },
      include: [
        {
          model: DB.CarBrandModel,
          attributes: ["car_brand_name"],
          as: "car_brand_relationship",
        },
      ],
    });

    leads.map((lead) => {
      lead.is_unlocked = false;
      lead.name = lead.name.split(" ")[0] + "...";
      delete lead.dataValues.tier;
      delete lead.dataValues.car_brand_id;
      delete lead.dataValues.status;
      delete lead.dataValues.email;
      delete lead.dataValues.phone;
    });

    let pagination = {};

    pagination.totalItems = totalLeads;
    pagination.currentPage = page;
    pagination.totalPages = Math.ceil(totalLeads / limit);

    await t.commit();
    return res.successResponse(
      false,
      {
        leads,
        pagination,
      },
      "All Leads Get Successfully"
    );
  } catch (error) {
    console.log("getAllLeads: ", error);
    return res.errorResponse(true, error.message);
  }
};

const unlockLead = async (req, res) => {
  let t;
  try {
    const { user, params } = req;
    const { lead_id } = params;
    t = await DB.sequelize.transaction();
    const lead = await DB.LeadModel.findOne({
      where: { lead_id },
      transaction: t,
    });

    if (!lead) {
      return res.errorResponse(true, "Lead not found");
    }

    if (lead.is_unlocked) {
      return res.errorResponse(true, "Lead already unlocked");
    }

    if (user.credits < lead.credits_required) {
      return res.errorResponse(true, "Insufficient credits");
    }
    let unlockedLead = await DB.UnlockLeadModel.create(
      {
        lead_id,
        user_id: user.user_id,
        credits_used: lead.credits_required,
      },
      { transaction: t }
    );

    await DB.UserModel.update({ credits: Sequelize.literal(`credits - ${lead.credits_required}`) }, { where: { user_id: user.user_id }, transaction: t });

    await t.commit();
    return res.successResponse(false, unlockedLead, "Lead unlocked successfully");
  } catch (error) {
    await t.rollback();
    console.log("unlockLead: ", error);
    return res.errorResponse(true, error.message);
  }
};

const getUnlockedLeads = async (req, res) => {
  let t;
  try {
    const { user, query } = req;
    let { page, limit, search, sortBy, order } = query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    order = order ? order.toUpperCase() : "ASC";
    let sortOrder;
    if (sortBy === "name") {
      sortOrder = [[{ model: DB.LeadModel, as: "lead_final" }, "name", order]];
    } else if (sortBy === "email") {
      sortOrder = [[{ model: DB.LeadModel, as: "lead_final" }, "email", order]];
    } else if (sortBy === "phone") {
      sortOrder = [[{ model: DB.LeadModel, as: "lead_final" }, "phone", order]];
    } else if (sortBy === "car_brand_name") {
      sortOrder = [[{ model: DB.LeadModel, as: "lead_final" }, { model: DB.CarBrandModel, as: "car_brand_relationship" }, "car_brand_name", order]];
    } else if (sortBy === "car_model") {
      sortOrder = [[{ model: DB.LeadModel, as: "lead_final" }, "car_model", order]];
    } else if (sortBy === "lead_time") {
      sortOrder = [[{ model: DB.LeadModel, as: "lead_final" }, "lead_time", order]];
    } else if (sortBy === "unlock_date") {
      sortOrder = ["unlock_date", order];
    } else if (sortBy === "credits_used") {
      sortOrder = ["credits_used", order];
    } else {
      sortOrder = [["unlock_date", order]];
    }

    if (search) {
      search = search.toLowerCase();
    } else {
      search = null;
    }

    t = await DB.sequelize.transaction();

    const { rows: leads, count: totalLeads } = await DB.UnlockLeadModel.findAndCountAll({
      limit: limit,
      offset: offset,
      order: sortOrder,
      where: {
        user_id: user.user_id,
        [Sequelize.Op.and]: [
          search
            ? {
                [Sequelize.Op.or]: [
                  Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("lead_final.name")), {
                    [Sequelize.Op.like]: `%${search.toLowerCase()}%`,
                  }),
                  Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("lead_final.email")), {
                    [Sequelize.Op.like]: `%${search.toLowerCase()}%`,
                  }),
                  Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("lead_final.phone")), {
                    [Sequelize.Op.like]: `%${search.toLowerCase()}%`,
                  }),
                  Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("lead_final.car_brand_relationship.car_brand_name")), {
                    [Sequelize.Op.like]: `%${search.toLowerCase()}%`,
                  }),
                  Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("lead_final.car_model")), {
                    [Sequelize.Op.like]: `%${search.toLowerCase()}%`,
                  }),
                ],
              }
            : {},
        ],
      },
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
      ],
    });

    let pagination = {};

    pagination.totalItems = totalLeads;
    pagination.currentPage = page;
    pagination.totalPages = Math.ceil(totalLeads / limit);

    await t.commit();
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
};

const getStats = async (req, res) => {
  let t;
  try {
    const { user } = req;
    t = await DB.sequelize.transaction();
    const myCredits = await DB.UserModel.findOne({
      where: { user_id: user.user_id },
      attributes: ["credits"],
      transaction: t,
    });

    const totalLeads = await DB.LeadModel.count();
    const unlockedLeads = await DB.UnlockLeadModel.count({
      where: { user_id: user.user_id },
    });

    await t.commit();
    return res.successResponse(false, { myCredits, totalLeads, unlockedLeads }, "Stats Get Successfully");
  } catch (error) {
    console.log("getStats: ", error);
    return res.errorResponse(true, error.message);
  }
};

module.exports = {
  getAllLeads,
  unlockLead,
  getUnlockedLeads,
  getStats,
};
