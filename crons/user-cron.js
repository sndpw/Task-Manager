const cron = require("node-cron");
const User = require("../database/user");
const Task = require("../database/task");
// Cron job for changing user priority
const IST_offset = 5.5 * 60 * 60 * 1000;
const currentDateIST = new Date(Date.now() + IST_offset);
const usercron = () => {
  try{
    cron.schedule("* * * * *", async () => {
      const calculatePriorityScore = (tasks) => {
        let score = 0;
        tasks.forEach((task) => {
          if (task.status !== "DONE") {
            const dueDateDiff = Math.ceil(
              (task.dueDate - currentDateIST) / (1000 * 60 * 60 * 24)
            );
            if (dueDateDiff <= 0) {
              score += 3;
            } else if (dueDateDiff <= 2) {
              score += 2;
            } else if (dueDateDiff <= 4) {
              score += 1;
            } else {
              score += 0;
            }
          }
        });
        return score;
      };
    
      try {
        const users = await User.find({});
        for (const user of users) {
          const tasks = await Task.find({ _id: { $in: user.tasks } });
          const priorityScore = calculatePriorityScore(tasks);
          if (priorityScore >= 6) {
            user.priority = 0;
          } else if (priorityScore >= 4) {
            user.priority = 1;
          } else if (priorityScore >= 2) {
            user.priority = 2;
          } else {
            user.priority = 3;
          }
          await user.save();
        }
    
        console.log("Priority assigned to users successfully.");
      } catch (error) {
        console.error("Error assigning priority to users:", error);
      }
    });
  }
  catch(err) {
    console.log(err);
  }
}

module.exports = usercron;

