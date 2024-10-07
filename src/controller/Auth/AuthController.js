const path = require("path");
const moment = require("moment");
const DB = require("../../dbConfig/mdbConnection");
const { hashPassword, comparePassword } = require("../../Helper/hashPasswordHelper");
const { generateToken } = require("../../Helper/jwtHelper");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const AuthController = {
  async signup(req, res) {
    let t;
    try {
      t = await DB.sequelize.transaction();
      const { username, email,phone, password, first_name, last_name, dealership_name } = req.body;

      const userExist = await DB.UserModel.findOne({
        where: { email },
      });

      if (userExist) {
        return res.errorResponse(true, "User already exist");
      }

      let hashedPassword = await hashPassword(password);

      const user = await DB.UserModel.create(
        {
          username,
          email,
          phone,
          password_hash: hashedPassword,
          first_name,
          last_name,
          dealership_name,
        },
        { transaction: t }
      );

      await t.commit();
      return res.successResponse(true, { user }, "User created successfully");
    } catch (error) {
      await t.rollback();
      console.log("signup: ", error);
      return res.errorResponse(true, error.message);
    }
  },

  // login
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await DB.UserModel.findOne({
        where: { email },
      });

      if (!user) {
        return res.errorResponse(true, "User not found");
      }

      const validPass = await comparePassword(password, user.password_hash);
      if (!validPass) {
        return res.errorResponse(true, "Invalid password");
      }

      let token = generateToken({
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        dealership_name: user.dealership_name,
        created_at: moment().format(),
      });

      return res.successResponse(true, { token, user }, "User logged in successfully");
    } catch (error) {
      console.log("login: ", error);
      return res.errorResponse(true, error.message);
    }
  },

  async checkoutSession(req, res) {
    try {
      const { user_id } = req.user;
      const user = await DB.UserModel.findOne({
        where: { user_id },
      });

      if (!user) {
        return res.errorResponse(true, "User not found");
      }

      let customer = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (customer.data.length === 0) {
        customer = await stripe.customers.create({
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
        });
      } else {
        customer = customer.data[0];
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "aed",
              product_data: {
                name: "Unlock Leads",
              },
              unit_amount: 10000,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.CLIENT_URL}/dashboard`,
        cancel_url: `${process.env.CLIENT_URL}/dashboard`,
        customer: customer.id,
        metadata: {
          user_id: user.user_id,
        },
      });

      return res.successResponse(true, { session }, "Session created");
    } catch (error) {
      console.log("checkoutSession: ", error);
      return res.errorResponse(true, error.message);
    }
  },

  async paymentSuccess(req, res) {
    try {
      const { session_id } = req.body;
      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status === "paid") {
        const user_id = session.metadata.user_id;
        const user = await DB.UserModel.findOne({
          where: { user_id },
        });

        if (!user) {
          return res.errorResponse(true, "User not found");
        }

        // update user credits in UserModel
        await DB.UserModel.update(
          { credits: user.credits + 100 },
          {
            where: { user_id },
          }
        );

        return res.successResponse(true, { user }, "Payment success");
      }
    } catch (error) {
      console.log("paymentSuccess: ", error);
      return res.errorResponse(true, error.message);
    }
  },
};

module.exports = AuthController;
