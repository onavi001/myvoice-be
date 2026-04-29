import { Router } from 'express';
import { login, verifyToken, forgotPassword, resetPassword } from '../controllers/authController';

const router = Router();
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLoginRequest'
 *     responses:
 *       200:
 *         description: Login exitoso
 *       401:
 *         description: Credenciales inválidas
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * /api/auth/verify:
 *   get:
 *     tags: [Auth]
 *     summary: Verificar token y obtener usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido
 *       401:
 *         description: Token inválido o faltante
 *       404:
 *         description: Usuario no encontrado
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Solicitar restablecimiento de contraseña
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Mensaje genérico enviado
 *       400:
 *         description: Correo requerido
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Restablecer contraseña con token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *       400:
 *         description: Token inválido o datos faltantes
 */
router.post('/login', login);
router.get('/verify', verifyToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
