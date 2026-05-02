const supabase = require("../config/supabase");

const getAllDoctors = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("doctors")
      .select("*");

    if (error) {
      return res.status(500).json({
        message: "Error fetching doctors",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Doctors fetched successfully",
      doctors: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("doctors")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(404).json({
        message: "Doctor not found",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Doctor fetched successfully",
      doctor: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const createDoctor = async (req, res) => {
  try {
    const {
      user_id,
      specialty,
      bio,
      clinic_address,
      latitude,
      longitude,
    } = req.body;

    if (!user_id || !specialty || !clinic_address) {
      return res.status(400).json({
        message: "user_id, specialty, and clinic_address are required",
      });
    }

    const { data, error } = await supabase
      .from("doctors")
      .insert([
        {
          user_id,
          specialty,
          bio,
          clinic_address,
          latitude,
          longitude,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        message: "Error creating doctor",
        error: error.message,
      });
    }

    return res.status(201).json({
      message: "Doctor created successfully",
      doctor: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

module.exports = {
    getAllDoctors,
    getDoctorById,
    createDoctor,
};