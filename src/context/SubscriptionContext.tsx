import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserTier = 'free' | 'pro';

interface SubscriptionContextType {
  tier: UserTier;
  setTier: (tier: UserTier) => void;
  isPro: boolean;
  isUpgradeModalOpen: boolean;
  triggerUpgrade: () => void;
  closeUpgradeModal: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to 'pro' so you (the dev) have access, but can switch to 'free' to test
  const [tier, setTierState] = useState<UserTier>('pro');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  useEffect(() => {
    // Load saved preference from local storage
    const saved = localStorage.getItem('cinesketch_tier') as UserTier || 'pro';
    console.log('[SUBSCRIPTION] Loading tier:', saved);
    if (saved) {
      setTierState(saved);
    } else {
      console.log('[SUBSCRIPTION] No saved tier, using default: pro');
    }
  }, []);

  const setTier = (newTier: UserTier) => {
    console.log('[SUBSCRIPTION] Tier changing from', tier, 'to', newTier);
    setTierState(newTier);
    localStorage.setItem('cinesketch_tier', newTier);
  };

  const triggerUpgrade = () => setIsUpgradeModalOpen(true);
  const closeUpgradeModal = () => setIsUpgradeModalOpen(false);

  const isPro = tier === 'pro';

  return (
    <SubscriptionContext.Provider value={{ tier, setTier, isPro, isUpgradeModalOpen, triggerUpgrade, closeUpgradeModal }}>
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