require("dotenv").config();
const cron = require("node-cron");
const twilio = require("twilio");
const User = require("../database/user");
const Task = require("../database/task");

const twiliocron = () => {
  try {
    cron.schedule("* * * * *", async () => {
      const twilioClient = new twilio(
        process.env.ACCOUNT_SID,
        process.env.AUTH_TOKEN
      );
      try {
        const usersByPriority = await User.find({}).sort({ priority: 1 });
        for (let priority = 0; priority <= 2; priority++) {
          const users = usersByPriority.filter(
            (user) => user.priority === priority
          );
          for (const user of users) {
            if (user.phone_number) {
              const call = await twilioClient.calls.create({
                twiml: `<Response><Say>Your task is overdue. Please check your task manager.</Say></Response>`, // URL to TwiML document or TwiML Bin
                to: `+91${user.phone_number}`,
                from: process.env.FROM_PHONE,
              });

              console.log(
                `Call initiated to ${user.phone_number}. SID: ${call.sid}`
              );
              user.priority = 3;
              await user.save();
            }
          }
        }
      } catch (error) {
        console.error("Error initiating call:", error);
      }
    });
  } catch (err) {
    console.log("Cron not started due to", err);
  }
};

module.exports = twiliocron;
