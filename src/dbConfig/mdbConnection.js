const { Sequelize } = require("sequelize");
require("dotenv").config();

const DB = {};
module.exports = DB;

// Postgre Connection
// DB_USERNAME="myuser"
// DB_PASSWORD="mypassword"
// DB_NAME="Dealerpro"
// DB_HOST="51.21.88.37"
// DB_PORT=5432

// create a connection to a database postgres using env variables
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    port: process.env.DB_PORT,
    logging: false,
    // define: {
    //   timestamps: false,
    // },
  }
)
// sync it

DB.sequelize = sequelize;
DB.Op = Sequelize.Op;

const UserModel = require("./models/User.js");
const CarBrandModel = require("./models/CarBrand.js");
const CreditTransactionModel = require("./models/CreditTransaction.js");
const LeadModel = require("./models/Lead.js");
const UnlockLeadModel = require("./models/UnlockLeads.js");
const UserCreditModel = require("./models/UserCredits.js");

//change
DB.UserModel = UserModel;
DB.CarBrandModel = CarBrandModel;
DB.CreditTransactionModel = CreditTransactionModel;
DB.LeadModel = LeadModel;
DB.UnlockLeadModel = UnlockLeadModel;
DB.UserCreditModel = UserCreditModel;
