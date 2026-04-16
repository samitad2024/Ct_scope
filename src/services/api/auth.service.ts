import axiosClient from './axios-client';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  LoginRequest, 
  SignupRequest, 
  VerifyOtpRequest, 
  AuthResponse,
  authResponseSchema,
  ApiErrorClass
} from '../../types/api';
import { parseApiResponse, extractErrorMessage } from './response-parser';

// Helper to validate auth responses
const validateAuthResponse = (data: unknown): AuthResponse => {
  try {
    return authResponseSchema.parse(data);
  } catch (error) {
    throw new ApiErrorClass(
      'Invalid authentication response from server',
      'INVALID_RESPONSE',
      500,
      { validationError: error }
    );
  }
};

export const authService = {
  login: async (data: LoginRequest) => {
    try {
      const response = await axiosClient.post<any>('/auth/login', data);
      const parsed = parseApiResponse(response.data, {
        context: 'auth.login'
      });
      return validateAuthResponse(parsed);
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error;
      throw new ApiErrorClass(
        'Login failed',
        'LOGIN_ERROR',
        500,
        { originalError: error }
      );
    }
  },

  signup: async (data: SignupRequest) => {
    try {
      const response = await axiosClient.post('/auth/signup', data);
      const parsed = parseApiResponse(response.data, {
        context: 'auth.signup'
      });
      return parsed;
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error;
      throw new ApiErrorClass(
        'Signup failed',
        'SIGNUP_ERROR',
        500,
        { originalError: error }
      );
    }
  },

  signupAdmin: async (data: SignupRequest) => {
    try {
      const response = await axiosClient.post('/auth/signup-admin', data);
      const parsed = parseApiResponse(response.data, {
        context: 'auth.signupAdmin'
      });
      return parsed;
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error;
      throw new ApiErrorClass(
        'Admin signup failed',
        'SIGNUP_ADMIN_ERROR',
        500,
        { originalError: error }
      );
    }
  },

  signupEmployee: async (data: SignupRequest) => {
    try {
      const response = await axiosClient.post('/auth/signup-employee', data);
      const parsed = parseApiResponse(response.data, {
        context: 'auth.signupEmployee'
      });
      return parsed;
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error;
      throw new ApiErrorClass(
        'Employee signup failed',
        'SIGNUP_EMPLOYEE_ERROR',
        500,
        { originalError: error }
      );
    }
  },

  verifyOtp: async (data: VerifyOtpRequest) => {
    try {
      // Backend expects: { phone, code }
      const response = await axiosClient.post<any>('/auth/verify-signup', {
        phone: data.phone,
        code: data.otp,
      });
      const parsed = parseApiResponse(response.data, {
        context: 'auth.verifyOtp'
      });
      return validateAuthResponse(parsed);
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error;
      throw new ApiErrorClass(
        'OTP verification failed',
        'VERIFY_OTP_ERROR',
        500,
        { originalError: error }
      );
    }
  },

  resendSignupOtp: async (phone: string) => {
    try {
      const response = await axiosClient.post('/auth/resend-signup-otp', { phone });
      const parsed = parseApiResponse(response.data, {
        context: 'auth.resendSignupOtp'
      });
      return parsed;
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error;
      throw new ApiErrorClass(
        'Failed to resend OTP',
        'RESEND_OTP_ERROR',
        500,
        { originalError: error }
      );
    }
  },

  logout: async () => {
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      const response = await axiosClient.post('/auth/logout', {
        refreshToken: refreshToken || undefined,
      });
      const parsed = parseApiResponse(response.data, {
        context: 'auth.logout'
      });
      return parsed;
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error;
      throw new ApiErrorClass(
        'Logout failed',
        'LOGOUT_ERROR',
        500,
        { originalError: error }
      );
    }
  },

  refreshToken: async (token: string) => {
    try {
      const response = await axiosClient.post('/auth/refresh', { refreshToken: token });
      const parsed = parseApiResponse(response.data, {
        context: 'auth.refreshToken'
      });
      return validateAuthResponse(parsed);
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error;
      throw new ApiErrorClass(
        'Token refresh failed',
        'REFRESH_TOKEN_ERROR',
        500,
        { originalError: error }
      );
    }
  },

  forgotPassword: async (phone: string) => {
    try {
      const response = await axiosClient.post('/auth/forgot-password', { phone });
      const parsed = parseApiResponse(response.data, {
        context: 'auth.forgotPassword'
      });
      return parsed;
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error;
      throw new ApiErrorClass(
        'Failed to send password reset OTP',
        'FORGOT_PASSWORD_ERROR',
        500,
        { originalError: error }
      );
    }
  },

  resetPassword: async (data: any) => {
    try {
      // UI passes { phone, otp, password }
      const response = await axiosClient.post('/auth/reset-password', {
        phone: data.phone,
        code: data.otp,
        new_password: data.password,
      });
      const parsed = parseApiResponse(response.data, {
        context: 'auth.resetPassword'
      });
      return parsed;
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error;
      throw new ApiErrorClass(
        'Password reset failed',
        'RESET_PASSWORD_ERROR',
        500,
        { originalError: error }
      );
    }
  },

  changePassword: async (data: any) => {
    try {
      const response = await axiosClient.post('/auth/change-password', {
        current_password: data.oldPassword,
        new_password: data.newPassword,
      });
      const parsed = parseApiResponse(response.data, {
        context: 'auth.changePassword'
      });
      return parsed;
    } catch (error) {
      if (error instanceof ApiErrorClass) throw error;
      throw new ApiErrorClass(
        'Password change failed',
        'CHANGE_PASSWORD_ERROR',
        500,
        { originalError: error }
      );
    }
  }
};
