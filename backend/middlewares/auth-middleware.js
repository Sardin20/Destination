import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/utils.js';
import { ApiError } from '../utils/api-error.js';
import { HTTP_STATUS, RESPONSE_MESSAGES } from '../utils/constants.js';
import User from '../models/user.js';
import { Role } from '../types/role-type.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.access_token;

    if (!token) {
      return next(
        new ApiError({
          status: HTTP_STATUS.BAD_REQUEST,
          message: RESPONSE_MESSAGES.USERS.RE_LOGIN,
        })
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded._id);
    next();
  } catch (error) {
    console.log('Token verification error:', error);
    return next(
      new ApiError({
        status: HTTP_STATUS.FORBIDDEN,
        message: RESPONSE_MESSAGES.USERS.INVALID_TOKEN,
      })
    );
  }
};

export const isAdminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== Role.Admin) {
    return next(
      new ApiError({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: RESPONSE_MESSAGES.USERS.UNAUTHORIZED_USER,
      })
    );
  }
  next();
};
