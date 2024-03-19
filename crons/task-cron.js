const cron = require("node-cron");
const User = require("../database/user");
const Task = require("../database/task");
// Cron job for changing task priority

const taskcron = () => {
  try {
    cron.schedule("* * * * *", async () => {
      const calculateTaskPriority = (task, tasks) => {
        let priority = 3;
        if (task.status !== "DONE") {
          const subtasksStatus0 = task.subtasks.filter(
            (subtask) => subtask.status === 0
          ).length;
          if (subtasksStatus0 >= 3) {
            priority = 0;
          } else if (subtasksStatus0 >= 2) {
            priority = 1;
          } else if (subtasksStatus0 >= 1) {
            priority = 2;
          }
        }
        return priority;
      };
      try {
        const users = await User.find({});
        for (const user of users) {
          const tasks = await Task.find({ _id: { $in: user.tasks } }).populate(
            "subtasks"
          );
          for (const task of tasks) {
            const priority = calculateTaskPriority(task);
            task.priority = priority;
            await task.save();
          }
          console.log("Priority assigned to tasks for user:", user._id);
        }
        console.log("Priority assigned to tasks successfully.");
      } catch (error) {
        console.error("Error assigning priority to tasks:", error);
      }
    });
  } catch (err) {
    console.log(err);
  }
};

module.exports = taskcron;
