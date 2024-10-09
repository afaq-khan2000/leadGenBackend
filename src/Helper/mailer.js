// Nodemailer functions and setup to send mails
const nodemailer = require("nodemailer");
const fs = require("fs");
const Handlebars = require("handlebars");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

const sendMail = async ({ from, to, subject},template,replacements) => {
  try {
   const source = fs.readFileSync(template, "utf-8").toString();
    const htmlToSend = Handlebars.compile(source);
    const html = htmlToSend(replacements);
    const info = await transporter.sendMail({
      from: from,
      to: to,
      subject: subject,
      html: html,
    });
    console.log("sendMail: ", info);
  } catch (error) {
    console.log("sendMail: ", error);
  }
};

module.exports = { sendMail };
