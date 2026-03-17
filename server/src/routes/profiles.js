import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { createProfile, checkUsername, getProfile, updateProfile } from '../controllers/profilesController.js';

const router = Router();

// Public — check if a username is already taken before signup
router.get('/check-username/:username', checkUsername);

// Protected — get the logged-in user's profile
router.get('/me', authMiddleware, getProfile);

// Protected — update the logged-in user's profile
router.put('/me', authMiddleware, updateProfile);

// Protected — create profile row after Supabase auth signup
router.post('/', authMiddleware, createProfile);

export default router;
