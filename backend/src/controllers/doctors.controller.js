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

    // 1. Check if the user exists and has role doctor
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.role !== "doctor") {
      return res.status(400).json({
        message: "This user is not a doctor",
      });
    }

    // 2. Create the doctor profile
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
      if (error.code === "23505") {
        return res.status(409).json({
          message: "Doctor profile already exists for this user",
          error: error.message,
        });
      }

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

const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existingDoctor, error: doctorError } = await supabase
      .from("doctors")
      .select("id, user_id")
      .eq("id", id)
      .single();
    
    if (doctorError || !existingDoctor) {
      return res.status(404).json({
        message: "Doctor not found",
      });
    }

    if (req.user.role === "doctor" && existingDoctor.user_id !== req.user.id) {
      return res.status(403).json({
        message: "You can only update your own doctor profile",
      });
    }

    const {
      specialty,
      bio,
      clinic_address,
      latitude,
      longitude,
    } = req.body;

    const { data, error } = await supabase
      .from("doctors")
      .update({
        specialty,
        bio,
        clinic_address,
        latitude,
        longitude,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        message: "Error updating doctor",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Doctor updated successfully",
      doctor: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("doctors")
      .delete()
      .eq("id", id);

    if (error) {
      if (error.code === "23503") {
        return res.status(409).json({
          message: "Cannot delete this doctor because they have existing appointments or medical records",
        });
      }
      return res.status(400).json({
        message: "Error deleting doctor",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Doctor deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const getNearbyDoctors = async (req, res) => {
  try {
    const { lat, lng, radius_km, specialty } = req.validatedQuery;

    const { data, error } = await supabase.rpc("nearby_doctors", {
      lat,
      lng,
      radius_km,
      specialty_filter: specialty || null,
    });

    if (error) {
      return res.status(500).json({
        message: "Error fetching nearby doctors",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Nearby doctors fetched successfully",
      count: data?.length || 0,
      doctors: data || [],
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
    getNearbyDoctors,
    createDoctor,
    updateDoctor,
    deleteDoctor
};