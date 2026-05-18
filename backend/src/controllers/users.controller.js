const supabase = require("../config/supabase");

const getAllPatients = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, email, phone, role, created_at")
      .eq("role", "patient");

    if (error) {
      return res.status(500).json({
        message: "Error fetching patients",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Patients fetched successfully",
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

    if (req.user.role === "patient" && req.user.id !== id) {
      return res.status(403).json({
        message: "You can only access your own profile",
      });
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, email, phone, role, created_at")
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

const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role === "patient" && req.user.id !== id) {
      return res.status(403).json({
        message: "You can only update your own profile",
      });
    }

    const {
      full_name,
      email,
      phone,
    } = req.body;

    const { data, error } = await supabase
      .from("users")
      .update({
        full_name,
        email,
        phone,
      })
      .eq("id", id)
      .eq("role", "patient")
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        message: "Error updating patient",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Patient updated successfully",
      patient: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id)
      .eq("role", "patient");

    if (error) {
      if (error.code === "23503") {
        return res.status(409).json({
          message: "Cannot delete this patient because they have existing appointments or medical records.",
        });
      }
      return res.status(400).json({
        message: "Error deleting patient",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Patient deleted successfully",
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
    updatePatient,
    deletePatient
};