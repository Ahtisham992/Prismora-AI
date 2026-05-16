// src/store/index.ts
import { create } from 'zustand';
import { AuthSlice, createAuthSlice } from './auth/authSlice';
import { createUserSlice } from './user/userSlice';
import { UserSlice } from './user/userTypes';
import { createPostSlice } from './posts/postsSlice';
import { PostSlice } from './posts/postsTypes';


export type RootState = AuthSlice & UserSlice & PostSlice;

export const useStore = create<RootState>()((...args) => ({
  ...createAuthSlice(...args),
  ...createUserSlice(...args),
  ...createPostSlice(...args),

}));
