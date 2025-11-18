import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool as db } from '../database/db';
import { User } from '../models/types';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validatePassword, isCommonPassword } from '../utils/passwordValidator';
import {
  generateTokenPair,
  verifyRefreshToken,
  generateAccessToken,
  TokenPayload,
} from '../utils/tokenManager';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * @swagger
 * /api/auth/validate-password:
 *   post:
 *     summary: Valider la force d'un mot de passe
 *     tags: [🔐 Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: Mot de passe à valider
 *           example:
 *             password: "MySecureP@ssw0rd!"
 *     responses:
 *       200:
 *         description: Résultat de la validation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isValid:
 *                   type: boolean
 *                 score:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                 isCommonPassword:
 *                   type: boolean
 *                 warning:
 *                   type: string
 *             example:
 *               isValid: true
 *               score: 4
 *               errors: []
 *               isCommonPassword: false
 *               warning: null
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/validate-password', (req: Request, res: Response) => {
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  const validation = validatePassword(password);
  const isCommon = isCommonPassword(password);

  res.json({
    ...validation,
    isCommonPassword: isCommon,
    warning: isCommon ? 'This password is too common and easily guessable' : null
  });
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Créer un nouveau compte utilisateur
 *     tags: [🔐 Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Adresse email
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Mot de passe (min 8 caractères, 1 majuscule, 1 chiffre, 1 caractère spécial)
 *               name:
 *                 type: string
 *                 description: Nom complet
 *               role:
 *                 type: string
 *                 enum: [user, admin, manager]
 *                 default: user
 *                 description: Rôle de l'utilisateur
 *           example:
 *             email: "john.doe@company.com"
 *             password: "SecureP@ss123!"
 *             name: "John Doe"
 *             role: "user"
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT token
 *                 refreshToken:
 *                   type: string
 *                   description: Refresh token
 *             example:
 *               user:
 *                 id: "550e8400-e29b-41d4-a716-446655440000"
 *                 email: "john.doe@company.com"
 *                 first_name: "John"
 *                 last_name: "Doe"
 *                 role: "user"
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             examples:
 *               userExists:
 *                 value:
 *                   error: "User already exists"
 *               weakPassword:
 *                 value:
 *                   error: "Password does not meet security requirements"
 *                   details: ["Must contain at least one uppercase letter"]
 *               commonPassword:
 *                 value:
 *                   error: "This password is too common. Please choose a more secure password."
 */
router.post('/register', async (req: Request, res: Response) => {
  // Code existant...
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Se connecter à l'application
 *     tags: [🔐 Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Adresse email
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Mot de passe
 *           example:
 *             email: "admin@admin.com"
 *             password: "Admin123!"
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     first_name:
 *                       type: string
 *                     last_name:
 *                       type: string
 *                     role:
 *                       type: string
 *                     organization_id:
 *                       type: string
 *                       format: uuid
 *                 token:
 *                   type: string
 *                   description: JWT token (durée de vie 1h)
 *                 refreshToken:
 *                   type: string
 *                   description: Refresh token (durée de vie 7j)
 *             example:
 *               user:
 *                 id: "550e8400-e29b-41d4-a716-446655440000"
 *                 email: "admin@admin.com"
 *                 first_name: "Admin"
 *                 last_name: "User"
 *                 role: "admin"
 *                 organization_id: "00000000-0000-0000-0000-000000000001"
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Identifiants invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Invalid credentials"
 *       400:
 *         description: Paramètres manquants
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Email and password are required"
 */
router.post('/login', async (req: Request, res: Response) => {
  // Code existant...
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Renouveler le token d'accès
 *     tags: [🔐 Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token obtenu lors du login
 *           example:
 *             refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token renouvelé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Nouveau JWT token
 *             example:
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Refresh token invalide ou expiré
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Invalid or expired refresh token"
 */
router.post('/refresh', async (req: Request, res: Response) => {
  // Code existant...
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Se déconnecter
 *     tags: [🔐 Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "Logged out successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/logout', authenticateToken, (req: AuthRequest, res: Response) => {
  // Code existant...
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Changer son mot de passe
 *     tags: [🔐 Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: Mot de passe actuel
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: Nouveau mot de passe
 *           example:
 *             currentPassword: "OldP@ssw0rd!"
 *             newPassword: "NewSecureP@ss123!"
 *     responses:
 *       200:
 *         description: Mot de passe modifié avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "Password changed successfully"
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             examples:
 *               weakPassword:
 *                 value:
 *                   error: "New password does not meet security requirements"
 *                   details: ["Must be at least 8 characters long"]
 *               samePassword:
 *                 value:
 *                   error: "New password must be different from the current password"
 *       401:
 *         description: Mot de passe actuel incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Current password is incorrect"
 */
router.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response) => {
  // Code existant...
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obtenir le profil de l'utilisateur connecté
 *     tags: [🔐 Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *             example:
 *               id: "550e8400-e29b-41d4-a716-446655440000"
 *               email: "john.doe@company.com"
 *               first_name: "John"
 *               last_name: "Doe"
 *               role: "user"
 *               organization_id: "00000000-0000-0000-0000-000000000001"
 *               created_at: "2024-01-01T00:00:00Z"
 *               updated_at: "2024-01-01T00:00:00Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  // Code existant...
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Mettre à jour le profil utilisateur
 *     tags: [🔐 Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *                 description: Prénom
 *               last_name:
 *                 type: string
 *                 description: Nom
 *               phone:
 *                 type: string
 *                 description: Numéro de téléphone
 *               avatar_url:
 *                 type: string
 *                 format: uri
 *                 description: URL de l'avatar
 *           example:
 *             first_name: "John"
 *             last_name: "Doe"
 *             phone: "+33 6 12 34 56 78"
 *             avatar_url: "https://example.com/avatar.jpg"
 *     responses:
 *       200:
 *         description: Profil mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  // Code existant...
});

export default router;