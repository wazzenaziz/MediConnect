const supabase = require("../config/supabase");

const getAllPatients = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "patient");

    if (error) {
      return res.status(500).json({
        message: "Error fetching patients",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Patient fetched successfully",
      patients: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .eq("role", "patient")
      .single();

    if (error) {
      return res.status(404).json({
        message: "Patient not found",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Patient fetched successfully",
      patient: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const createPatient = async (req, res) => {
  try {
    const {
      id,
      full_name,
      email,
      phone,
    } = req.body;

    if (!id || !full_name || !email) {
      return res.status(400).json({
        message: "id, full_name, and email are required",
      });
    }

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          id,
          full_name,
          email,
          phone,
          role : "patient",
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          message: "This user already exists",
          error: error.message,
        });
      }

      return res.status(500).json({
        message: "Error creating patient",
        error: error.message,
      });
    }

    return res.status(201).json({
      message: "Patient created successfully",
      patient: data,
    });

  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};


module.exports = {
    getAllPatients,
    getPatientById,
    createPatient,
};