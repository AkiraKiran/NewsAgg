const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export const authService = {
  register: async (email: string, username: string, password: string): Promise<AuthResponse> => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password })
      });
      return res.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return res.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  loginWithGoogle: async (googleToken: string): Promise<AuthResponse> => {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: googleToken })
      });
      return res.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  getToken: () => localStorage.getItem('authToken'),
  
  setToken: (token: string) => localStorage.setItem('authToken', token),
  
  getUser: (): User | null => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  
  setUser: (user: User) => localStorage.setItem('user', JSON.stringify(user)),

  isAuthenticated: () => !!localStorage.getItem('authToken')
};
