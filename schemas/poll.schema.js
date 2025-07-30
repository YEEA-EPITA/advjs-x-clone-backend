const yup = require("yup");

// Schema for voting in a poll
const votePollSchema = yup.object({
  poll_id: yup.string().uuid("Invalid poll ID").required("poll_id is required"),
  option_id: yup
    .string()
    .uuid("Invalid option ID")
    .required("option_id is required"),
});

module.exports = {
  votePollSchema,
};
