// utils/errors.js - Error handling utilities

export class APIError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

export const getErrorMessage = (error) => {
  if (error instanceof APIError) {
    switch (error.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Unauthorized. Please log in again.';
      case 403:
        return 'Forbidden. You don\'t have permission to do this.';
      case 404:
        return 'Not found.';
      case 409:
        return 'This resource already exists.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error.message || 'An error occurred.';
    }
  }
  return error.message || 'An unexpected error occurred.';
};

export const handleAPIError = (error) => {
  console.error('API Error:', error);
  const message = getErrorMessage(error);
  return message;
};
