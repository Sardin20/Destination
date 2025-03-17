import User from '../models/user.js';
import jwt from 'jsonwebtoken';
import { HTTP_STATUS, RESPONSE_MESSAGES } from '../utils/constants.js';
import { cookieOptions } from '../utils/cookie_options.js';
import { JWT_SECRET } from '../config/utils.js';
import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';


export const signUpWithEmail = asyncHandler(async (req, res) => {
  const { userName, fullName, email, password } = req.body;

  if (!userName || !fullName || !email || !password) {
    throw new ApiError({
      status: HTTP_STATUS.BAD_REQUEST,
      message: RESPONSE_MESSAGES.COMMON.REQUIRED_FIELDS,
    });
  }

  const existingUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existingUser) {
    if (existingUser.userName === userName) {
      throw new ApiError({
        status: HTTP_STATUS.BAD_REQUEST,
        message: RESPONSE_MESSAGES.USERS.USER_USERNAME_EXISTS,
      });
    }
    if (existingUser.email === email) {
      throw new ApiError({
        status: HTTP_STATUS.BAD_REQUEST,
        message: RESPONSE_MESSAGES.USERS.USER_EMAIL_EXISTS,
      });
    }
  }

  const user = new User({ userName, fullName, email, password });

  try {
    await user.validate();
  } catch (error) {
    const validationErrors = Object.values(error.errors).map((err) => err.message);
    throw new ApiError({
      status: HTTP_STATUS.BAD_REQUEST,
      errors: validationErrors.join(', '),
    });
  }

  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();
  user.password = undefined;

  res
    .status(HTTP_STATUS.OK)
    .cookie('access_token', accessToken, cookieOptions)
    .cookie('refresh_token', refreshToken, cookieOptions)
    .json(new ApiResponse(HTTP_STATUS.OK, { accessToken, refreshToken, user }, RESPONSE_MESSAGES.USERS.SIGNED_UP));
});


export const signInWithEmailOrUsername = asyncHandler(async (req, res) => {
  const { userNameOrEmail, password } = req.body;
  if (!userNameOrEmail || !password) {
    throw new ApiError({
      status: HTTP_STATUS.BAD_REQUEST,
      message: RESPONSE_MESSAGES.COMMON.REQUIRED_FIELDS,
    });
  }

  const user = await User.findOne({
    $or: [{ email: userNameOrEmail }, { userName: userNameOrEmail }],
  }).select('+password');

  if (!user || !(await user.isPasswordCorrect(password))) {
    throw new ApiError({
      status: HTTP_STATUS.UNAUTHORIZED,
      message: RESPONSE_MESSAGES.USERS.INVALID_PASSWORD,
    });
  }

  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();
  user.password = undefined;

  res
    .status(HTTP_STATUS.OK)
    .cookie('access_token', accessToken, cookieOptions)
    .cookie('refresh_token', refreshToken, cookieOptions)
    .json(new ApiResponse(HTTP_STATUS.OK, { accessToken, refreshToken, user }, RESPONSE_MESSAGES.USERS.SIGNED_IN));
});


export const signOutUser = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user?._id, { $set: { refreshToken: '' } }, { new: true });

  req.logout((err) => {
    if (err) {
      return next(new ApiError({ status: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: 'Logout failed' }));
    }

    res
      .status(HTTP_STATUS.OK)
      .clearCookie('access_token', cookieOptions)
      .clearCookie('refresh_token', cookieOptions)
      .clearCookie('jwt', cookieOptions)
      .json(new ApiResponse(HTTP_STATUS.OK, '', RESPONSE_MESSAGES.USERS.SIGNED_OUT));
  });
});


export const isLoggedIn = asyncHandler(async (req, res) => {
  let access_token = req.cookies?.access_token;
  let refresh_token = req.cookies?.refresh_token;
  const { _id } = req.params;

  if (!_id) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(new ApiResponse(HTTP_STATUS.BAD_REQUEST, '', 'User ID is required'));
  }

  if (access_token) {
    try {
      if (JWT_SECRET) {
        await jwt.verify(access_token, JWT_SECRET);
      }
      return res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, access_token, RESPONSE_MESSAGES.USERS.VALID_TOKEN));
    } catch (error) {
      console.log('Access token verification error:', error.message);
    }
  }

  if (refresh_token) {
    try {
      if (JWT_SECRET) {
        await jwt.verify(refresh_token, JWT_SECRET);
      }
      const user = await User.findById(_id);
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(new ApiResponse(HTTP_STATUS.NOT_FOUND, '', RESPONSE_MESSAGES.USERS.USER_NOT_EXISTS));
      }
      access_token = await user.generateAccessToken();
      return res
        .status(HTTP_STATUS.OK)
        .cookie('access_token', access_token, cookieOptions)
        .json(new ApiResponse(HTTP_STATUS.OK, access_token, RESPONSE_MESSAGES.USERS.VALID_TOKEN));
    } catch (error) {
      console.log('Refresh token verification error:', error.message);
    }
  }

  const user = await User.findById(_id);
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(new ApiResponse(HTTP_STATUS.NOT_FOUND, '', RESPONSE_MESSAGES.USERS.USER_NOT_EXISTS));
  }

  const { refreshToken } = user;
  if (!refreshToken) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(new ApiResponse(HTTP_STATUS.UNAUTHORIZED, '', RESPONSE_MESSAGES.USERS.INVALID_TOKEN));
  }

  try {
    if (JWT_SECRET) {
      await jwt.verify(refreshToken, JWT_SECRET);
    }
    access_token = await user.generateAccessToken();
    refresh_token = await user.generateRefreshToken();

    user.refreshToken = refresh_token;
    await user.save();

    return res
      .status(HTTP_STATUS.OK)
      .cookie('access_token', access_token, cookieOptions)
      .cookie('refresh_token', refresh_token, cookieOptions)
      .json(new ApiResponse(HTTP_STATUS.OK, access_token, RESPONSE_MESSAGES.USERS.VALID_TOKEN));
  } catch (error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(new ApiResponse(HTTP_STATUS.UNAUTHORIZED, error.message, RESPONSE_MESSAGES.USERS.INVALID_TOKEN));
  }
});
