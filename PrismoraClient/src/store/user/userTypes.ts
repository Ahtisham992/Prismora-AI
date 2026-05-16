export interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  bio?: string | null;
  email: string;
  phoneNumber?: string | null;
  profilePhoto?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSlice {
  profile: UserProfile | null;
  loadingUser: boolean;

  fetchMyProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  updateUsername: (username: string) => Promise<boolean>;
  updatePhoto: (url: string) => Promise<boolean>;
}
