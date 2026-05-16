// src/store/auth/authTypes.ts

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  provider: string;
  profilePhoto?: string | null;
}

export interface AuthSlice {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;

  loadStoredAuth: () => Promise<void>;
  registerUser: (payload: any) => Promise<boolean>;
  loginUser: (payload: any) => Promise<boolean>;
  googleLoginUser: (googleToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
}
