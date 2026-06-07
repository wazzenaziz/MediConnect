const express = require("express");
const router = express.Router();
const { validate } = require("../middleware/validate.middleware");
const authMiddleware = require("../middleware/auth.middleware");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleSignInSchema,
  changePasswordSchema,
} = require("../schemas/auth.schemas");

const {
  register,
  login,
  forgotPassword,
  resetPassword,
  googleSignIn,
  changePassword,
} = require("../controllers/auth.controller");

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/google", validate(googleSignInSchema), googleSignIn);
router.post(
  "/change-password",
  authMiddleware,
  validate(changePasswordSchema),
  changePassword,
);

module.exports = router;