const { Sequelize, where } = require("sequelize");
const DB = require("../../dbConfig/mdbConnection");

const getAllLeads = async (req, res) => {
  let t;
  try {
    const { query, user } = req;
    let { page, limit } = query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    // get all unlocked leads
    let unlockedLeads = await DB.UnlockLeadModel.findAll({
      where: { user_id: user.user_id },
      attributes: ["lead_id", "user_id"],
    });

    t = await DB.sequelize.transaction();
    const leads = await DB.LeadModel.findAll({
      // attributes: ["lead_id", "name", "lead_time"],
      limit: limit,
      offset: offset,
      order: [["lead_time", "DESC"]],
      include: [
        {
          model: DB.CarBrandModel,
          attributes: ["car_brand_name"],
          as: "car_brand_relationship",
        },
      ],
    });

    leads.map((lead) => {
      let is_unlocked = unlockedLeads.find((ul) => ul.lead_id === lead.lead_id);
      if (is_unlocked) {
        lead.is_unlocked = true;
      } else {
        lead.is_unlocked = false;
        delete lead.dataValues.tier;
        delete lead.dataValues.credits_required;
        delete lead.dataValues.car_brand_id;
        delete lead.dataValues.car_model;
        delete lead.dataValues.status;
        delete lead.dataValues.car_brand_relationship;
        delete lead.dataValues.email;
        delete lead.dataValues.phone;
      }
    });

    let pagination = {};

    let totalLeads = await DB.LeadModel.count();
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

    await DB.UserModel.update(
      { credits: Sequelize.literal(`credits - ${lead.credits_required}`) },
      { where: { user_id: user.user_id }, transaction: t }
    );

    await t.commit();
    return res.successResponse(
      false,
      unlockedLead,
      "Lead unlocked successfully"
    );
  } catch (error) {
    await t.rollback();
    console.log("unlockLead: ", error);
    return res.errorResponse(true, error.message);
  }
};

const getUnlockedLeads = async (req, res) => {
  let t;
  try {
    const { user } = req;
    t = await DB.sequelize.transaction();
    const unlockedLeads = await DB.UnlockLeadModel.findAll({
      where: { user_id: user.user_id },
      include: [
        {
          model: DB.LeadModel,
          as: "lead_final",
        },
      ],
      transaction: t,
    });

    await t.commit();
    return res.successResponse(
      false,
      unlockedLeads,
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
    return res.successResponse(
      false,
      { myCredits, totalLeads, unlockedLeads },
      "Stats Get Successfully"
    );
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
