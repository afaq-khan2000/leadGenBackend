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
    logging: true,
    pool: {
      max: 100, // Increase this value
      min: 0,
      acquire: 30000, // Time to wait before throwing a timeout error
      idle: 10000, // Time to keep idle connections
    },
  }
);

// i want to seed the database with some data after creating the tables

// sync it and also can alter the table
// sequelize.sync({ alter: true });

sequelize.sync().then(async () => {
  console.log("Database & tables created!");

  // Seed the admin user after syncing
  await seedAdminUser();
});

// Seed the admin user
async function seedAdminUser() {
  const UserModel = require("./models/User.js");

  // Check if admin user already exists
  const adminUser = await UserModel.findOne({
    where: { role: "admin" },
  });

  let hashedPassword = await hashPassword("admin123");

  // If admin user does not exist, create one
  if (!adminUser) {
    await UserModel.create({
      role: "admin",
      username: "admin",
      email: "admin.dealpro@yopmail.com",
      phone: "1234567890",
      password_hash: hashedPassword,
      first_name: "Admin",
      last_name: "User",
      dealership_name: null,
      is_verified: true,
      verification_code: null,
    });
  }
}

DB.sequelize = sequelize;
DB.Op = Sequelize.Op;

const UserModel = require("./models/User.js");
const CarBrandModel = require("./models/CarBrand.js");
const CreditTransactionModel = require("./models/CreditTransaction.js");
const LeadModel = require("./models/Lead.js");
const UnlockLeadModel = require("./models/UnlockLeads.js");
const UserCreditModel = require("./models/UserCredits.js");
const { hashPassword } = require("../Helper/hashPasswordHelper.js");

//change
DB.UserModel = UserModel;
DB.CarBrandModel = CarBrandModel;
DB.CreditTransactionModel = CreditTransactionModel;
DB.LeadModel = LeadModel;
DB.UnlockLeadModel = UnlockLeadModel;
DB.UserCreditModel = UserCreditModel;
