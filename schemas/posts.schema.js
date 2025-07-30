const yup = require("yup");

const createPostSchema = yup.object({
  content: yup
    .string()
    .min(1, "Content must be at least 1 character")
    .max(2000, "Content must not exceed 2000 characters")
    .required("Content is required"),

  location: yup
    .string()
    .max(100, "Location must not exceed 100 characters")
    .required("Location is required"),

  poll: yup
    .string() // Accept raw JSON string from form-data
    .test("is-valid-json", "Poll must be a valid JSON object", (value) => {
      if (!value) return true; // optional
      try {
        const parsed = JSON.parse(value);
        return (
          typeof parsed === "object" &&
          typeof parsed.question === "string" &&
          Array.isArray(parsed.options) &&
          parsed.options.length >= 2
        );
      } catch (err) {
        return false;
      }
    })
    .optional(),
});

// User Feed
const userFeedQuerySchema = yup.object({
  limit: yup
    .number()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit must not exceed 100")
    .optional(),
  offset: yup.number().min(0, "Offset must be non-negative").optional(),
});

// Search Posts
const searchPostsQuerySchema = yup.object({
  q: yup
    .string()
    .min(1, "Query must be at least 1 character")
    .max(100, "Query must not exceed 100 characters")
    .optional(),
  type: yup
    .string()
    .oneOf(["text", "image", "video", "link"], "Invalid content type filter")
    .optional(),
  from: yup
    .string()
    .matches(/^\d{4}-\d{2}-\d{2}/, "From date must be a valid ISO 8601 date")
    .optional(),
  limit: yup.number().min(1).max(100).optional(),
});

// Trending Hashtags
const trendingHashtagsQuerySchema = yup.object({
  limit: yup
    .number()
    .min(1, "Limit must be at least 1")
    .max(50, "Limit must not exceed 50")
    .optional(),
  hours: yup
    .number()
    .min(1, "Hours must be at least 1")
    .max(168, "Hours must not exceed 168")
    .optional(),
});

// Like Post
const likePostParamsSchema = yup.object({
  postId: yup.string().uuid("Post ID must be a valid UUID"),
});

// Retweet Post
const retweetPostParamsSchema = yup.object({
  postId: yup.string().uuid("Post ID must be a valid UUID"),
});

const retweetPostBodySchema = yup.object({
  comment: yup
    .string()
    .max(280, "Comment must not exceed 280 characters")
    .optional(),
});

// Post Analytics
const postAnalyticsParamsSchema = yup.object({
  postId: yup.string().uuid("Post ID must be a valid UUID"),
});

module.exports = {
  createPostSchema,
  userFeedQuerySchema,
  searchPostsQuerySchema,
  trendingHashtagsQuerySchema,
  likePostParamsSchema,
  retweetPostParamsSchema,
  retweetPostBodySchema,
  postAnalyticsParamsSchema,
};
