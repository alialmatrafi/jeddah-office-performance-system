declare global {
  namespace Express {
    interface Request {
      user?: import('../lib/auth-types.js').AuthUser;
    }
  }
}

export {};
