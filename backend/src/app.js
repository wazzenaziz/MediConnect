const express = require("express");
const supabase = require("./config/supabase");

const app = express();

app.use(express.json());

app.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .limit(1);

  if (error) {
    return res.status(500).json({
      message: "Supabase connection failed",
      error: error.message,
    });
  }

  res.json({
    message: "Supabase connected",
    data,
  });
});

module.exports = app;