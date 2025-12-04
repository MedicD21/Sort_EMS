/**
 * Authentication service
 */
import apiClient from "./api";
import { ENDPOINTS, TOKEN_KEY, REFRESH_TOKEN_KEY } from "./config";
import type { AuthTokens, LoginCredentials, User } from "../types";

export const authService = {
  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    // OAuth2 expects form data, not JSON
    const formData = new URLSearchParams();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    const response = await apiClient.post<AuthTokens>(
      ENDPOINTS.LOGIN,
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const { access_token, refresh_token } = response.data;

    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);

    return response.data;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post(ENDPOINTS.LOGOUT);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>(ENDPOINTS.ME);
    return response.data;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await apiClient.post<AuthTokens>(ENDPOINTS.REFRESH, {
      refresh_token: refreshToken,
    });

    const { access_token, refresh_token: new_refresh_token } = response.data;
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, new_refresh_token);

    return response.data;
  },
};
