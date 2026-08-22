'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, Family, FamilyMember } from '@/types';

interface AuthContextType {
  user: User | null;
  family: Family | null;
  member: FamilyMember | null;
  allMemberships: { family: Family; member: FamilyMember }[];
  isLoading: boolean;
  isAuthenticated: boolean;
  hasFamily: boolean;
  refreshUser: () => Promise<void>;
  switchFamily: (familyId: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  family: null,
  member: null,
  allMemberships: [],
  isLoading: true,
  isAuthenticated: false,
  hasFamily: false,
  refreshUser: async () => {},
  switchFamily: async () => false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [allMemberships, setAllMemberships] = useState<{ family: Family; member: FamilyMember }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
          setFamily(data.family || null);
          setMember(data.member || null);
          setAllMemberships(data.allMemberships || []);
        } else {
          setUser(null);
          setFamily(null);
          setMember(null);
          setAllMemberships([]);
        }
      } else {
        setUser(null);
        setFamily(null);
        setMember(null);
        setAllMemberships([]);
      }
    } catch (err) {
      console.error('Failed to fetch auth session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Route protection
  useEffect(() => {
    if (isLoading) return;

    const publicRoutes = ['/login', '/register'];
    const isPublicRoute = publicRoutes.includes(pathname);

    if (!user && !isPublicRoute) {
      router.push('/login');
    } else if (user && isPublicRoute) {
      if (!family) {
        router.push('/onboarding');
      } else {
        router.push('/');
      }
    } else if (user && !family && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
  }, [user, family, isLoading, pathname, router]);

  const switchFamily = async (familyId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId }),
      });
      if (res.ok) {
        await refreshUser();
        window.location.reload();
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setFamily(null);
      setMember(null);
      setAllMemberships([]);
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        family,
        member,
        allMemberships,
        isLoading,
        isAuthenticated: !!user,
        hasFamily: !!family,
        refreshUser,
        switchFamily,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
