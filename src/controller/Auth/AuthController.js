const path = require("path");
const moment = require("moment");
const DB = require("../../dbConfig/mdbConnection");
const {
  hashPassword,
  comparePassword,
} = require("../../Helper/hashPasswordHelper");
const { generateToken } = require("../../Helper/jwtHelper");
const { sendMail } = require("../../Helper/mailer");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const AuthController = {
  async signup(req, res) {
    let t;
    try {
      t = await DB.sequelize.transaction();
      const {
        username,
        email,
        phone,
        password,
        first_name,
        last_name,
        dealership_name,
      } = req.body;

      const userExist = await DB.UserModel.findOne({
        where: { email },
      });

      if (userExist) {
        return res.errorResponse(true, "User already exist");
      }

      let hashedPassword = await hashPassword(password);
      let verification_code = Math.floor(100000 + Math.random() * 900000);

      const user = await DB.UserModel.create(
        {
          username,
          email,
          phone,
          password_hash: hashedPassword,
          first_name,
          last_name,
          dealership_name,
          verification_code,
        },
        { transaction: t }
      );

      let templatePath = path.join(
        __dirname,
        "../../templates/verifyEmail.html"
      );
      let replacements = {
        username,
        url: `${process.env.CLIENT_URL}/verify-email?verification_code=${verification_code}`,
      };

      let mailOptions = {
        from: " dealerpro.io@gmail.com",
        to: email,
        subject: "Email Verification",
      };

      sendMail(mailOptions, templatePath, replacements);

      await t.commit();
      return res.successResponse(
        true,
        { user },
        "Verification link sent to your email. Please verify your email"
      );
    } catch (error) {
      await t.rollback();
      console.log("signup: ", error);
      return res.errorResponse(true, error.message);
    }
  },

  // verify email
  async verifyEmail(req, res) {
    try {
      const { verification_code } = req.body;
      const user = await DB.UserModel.findOne({
        where: { verification_code },
      });

      if (!user) {
        return res.errorResponse(true, "User not found");
      }

      await DB.UserModel.update(
        { is_verified: true, verification_code: null },
        {
          where: { verification_code },
        }
      );

      return res.successResponse(true, { user }, "User verified successfully");
    } catch (error) {
      console.log("verifyEmail: ", error);
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

      if (!user.is_verified) {
        return res.errorResponse(true, "User not verified");
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

      return res.successResponse(
        true,
        { token, user },
        "User logged in successfully"
      );
    } catch (error) {
      console.log("login: ", error);
      return res.errorResponse(true, error.message);
    }
  },

  async checkoutSession(req, res) {
    try {
      const { user_id } = req.user;
      const { query } = req;
      let { credits } = query;
      const user = await DB.UserModel.findOne({
        where: { user_id },
      });

      if (!user) {
        return res.errorResponse(true, "User not found");
      }

      credits = parseInt(credits);

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
                name: "Credits",
              },
              unit_amount: 1 * 100,
            },
            quantity: credits,
          },
        ],
        mode: "payment",
        success_url: `${process.env.CLIENT_URL}/dashboard`,
        cancel_url: `${process.env.CLIENT_URL}/dashboard`,
        customer: customer.id,
        metadata: {
          user_id: user.user_id,
          credits,
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
      const { session_id, credits } = req.body;
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
          { credits: user.credits + credits },
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

  // get customer's stripe transaction details
  async getStripeTransactions(req, res) {
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
        return res.errorResponse(true, "No transaction found");
      }

      customer = customer.data[0];

      // get all purchases by customer
      let transactions = await stripe.charges.list({
        customer: customer.id,
      });

      return res.successResponse(
        true,
        { transactions },
        "Transactions fetched successfully"
      );
    } catch (error) {
      console.log("getStripeTransactions: ", error);
      return res.errorResponse(true, error.message);
    }
  },
};

module.exports = AuthController;
