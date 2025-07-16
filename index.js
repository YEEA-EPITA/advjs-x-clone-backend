const express = require("express");

const app = express();
const PORT = 3001;

app.get("/sample", (req, res) => {
  res.json({ message: "This is a sample GET route." });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
