import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserTier = 'free' | 'pro';

interface SubscriptionContextType {
  tier: UserTier;
  setTier: (tier: UserTier) => void;
  isPro: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to 'pro' so you (the dev) have access, but can switch to 'free' to test
  const [tier, setTierState] = useState<UserTier>('pro'); 

  useEffect(() => {
    // Load saved preference from local storage
    const saved = localStorage.getItem('cinesketch_tier') as UserTier;
    if (saved) {
      setTierState(saved);
    }
  }, []);

  const setTier = (newTier: UserTier) => {
    setTierState(newTier);
    localStorage.setItem('cinesketch_tier', newTier);
  };

  const isPro = tier === 'pro';

  return (
    <SubscriptionContext.Provider value={{ tier, setTier, isPro }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};