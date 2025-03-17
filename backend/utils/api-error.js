import { Error as MongooseError } from 'mongoose';
import { RESPONSE_MESSAGES } from './constants.js';

class ApiError extends MongooseError {
  constructor({ status, message, errors = [], stack = '' }) {
    super(message || RESPONSE_MESSAGES.COMMON.SOMETHING_WRONG);
    this.status = status;
    this.data = null;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
