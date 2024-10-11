// Importing Modules
const express = require("express");
const http = require("http");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const restApis = require("./src/routes");
const DB = require("./src/dbConfig/mdbConnection");
const moment = require("moment");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // Make sure to initialize Stripe

// App Configuration
const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

// Global Middleware
app.use(cors(corsOptions));
app.use(fileUpload());

// DO NOT APPLY express.json() and express.urlencoded() globally here
// Place these after your webhook route definition to avoid interfering with raw body

// Webhook route for Stripe
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // Verify Stripe signature
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`⚠️  Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle event: "checkout.session.completed"
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Prepare data to be sent to your API
    const data = {
      session_id: session.id,
      credits: session.metadata.credits,
    };

    // Axios configuration for API request
    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: `${process.env.API_URL}/api/auth/payment/success`,
      headers: {
        "Content-Type": "application/json",
      },
      data,
    };

    // Call your API to process the session data
    try {
      const response = await axios(config);
      console.log(`Payment success response:`, response.data);
    } catch (error) {
      console.error(`Error in API call:`, error.message);
    }
  }

  // Send 200 status to acknowledge the event
  res.status(200).json({ received: true });
});

// Now apply express.json() and express.urlencoded() globally
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static serves
app.use("/static/files", express.static("./upload"));

// API Routes
app.use("/api/", restApis);

// API status route
app.get("/status", (req, res) => {
  res.status(200).json({
    status: "Healthy",
    API: "Lead Management API",
    version: 1.0,
    developer: "Muhammad Afaq Khan",
  });
});

// Start the server
server.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});
