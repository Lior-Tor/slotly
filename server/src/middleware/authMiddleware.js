import supabase from '../supabaseClient.js';

/**
 * Middleware that verifies a Supabase JWT from the Authorization header.
 * On success, attaches the Supabase user object to req.user so downstream
 * controllers can access the authenticated user's id without re-validating.
 *
 * Middleware sits between the route and the controller — it runs first,
 * and calls next() to hand off to the next handler only if auth passes.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authMiddleware = async (req, res, next) => {
  // The Axios interceptor in the frontend sets this header to: "Bearer <jwt_token>"
  const authHeader = req.headers.authorization;

  // Reject if header is missing or malformed
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Extract the JWT from the header
  const token = authHeader.split(' ')[1];

  // Validate the JWT against Supabase Auth — returns the user if valid
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Attach user to request so controllers can use req.user.id without re-validating the token
  req.user = user;
  
  next();
};

export default authMiddleware;
