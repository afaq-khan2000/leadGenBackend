const { DataTypes } = require("sequelize");
const { sequelize } = require("../mdbConnection");
const Lead = require("./Lead");
const User = require("./User");

const UnlockLead = sequelize.define(
  "UnlockLead",
  {
    unlock_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    lead_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Lead,
        key: "lead_id",
      },
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: "user_id",
      },
      allowNull: false,
    },
    unlock_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    is_unlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "active",
    },
    credits_used: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: false,
    tableName: "unlock_leads",
  }
);

// Relationships
UnlockLead.belongsTo(Lead, { foreignKey: "lead_id", as: "lead_final" });
UnlockLead.belongsTo(User, { foreignKey: "user_id", as: "user" });

Lead.hasMany(UnlockLead, { foreignKey: "lead_id", as: "unlock_leads" });
User.hasMany(UnlockLead, { foreignKey: "user_id", as: "unlock_leads" });

module.exports = UnlockLead;
