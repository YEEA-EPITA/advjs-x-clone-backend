const yup = require("yup");

// Register schema
const registerSchema = yup.object({
  username: yup
    .string()
    .matches(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    )
    .min(3)
    .max(30)
    .required("Username is required"),
  email: yup
    .string()
    .email("Please enter a valid email")
    .required("Email is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required(),
  displayName: yup.string().min(1).max(50).required("Display name is required"),
});

// Login schema
const loginSchema = yup.object({
  email: yup
    .string()
    .email("Please enter a valid email")
    .required("Email is required"),
  password: yup.string().required("Password is required"),
});

// Update password schema
const updatePasswordSchema = yup.object({
  currentPassword: yup.string().required("Current password is required"),
  newPassword: yup
    .string()
    .min(6, "New password must be at least 6 characters")
    .required(),
});

// Update profile schema
const updateProfileSchema = yup.object({
  displayName: yup.string().min(1).max(50).optional(),
  bio: yup.string().max(280, "Bio must not exceed 280 characters").optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  updatePasswordSchema,
  updateProfileSchema,
};
