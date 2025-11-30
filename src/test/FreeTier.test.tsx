import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShotEditor } from '../components/features/ShotEditor';
import { AssetManager } from '../components/features/AssetManager';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { Project, Shot } from '../types';
import * as imageGen from '../services/imageGen';

// --- MOCKS ---

// Mock the context to force 'free' tier
vi.mock('../context/SubscriptionContext', async () => {
    const actual = await vi.importActual('../context/SubscriptionContext');
    return {
        ...actual,
        useSubscription: () => ({ tier: 'free', isPro: false, setTier: vi.fn() })
    };
});

// Mock Storage
vi.mock('../services/storage', () => ({
    getCharacters: vi.fn().mockResolvedValue([]),
    getOutfits: vi.fn().mockResolvedValue([]),
    getLocations: vi.fn().mockResolvedValue([]),
    getImageLibrary: vi.fn().mockResolvedValue([]),
    addToImageLibrary: vi.fn().mockResolvedValue(true),
    saveImageLibrary: vi.fn(),
    toggleImageFavorite: vi.fn()
}));

// Mock Image Generation to spy on calls
const generateSpy = vi.spyOn(imageGen, 'generateHybridImage');

// --- DATA ---
const mockProject: Project = {
    id: 'p1',
    name: 'Free Tier Project',
    createdAt: Date.now(),
    lastModified: Date.now(),
    settings: {
        cinematicStyle: 'Action',
        era: 'Modern',
        lighting: 'Natural',
        timeOfDay: 'Day',
        aspectRatio: '16:9',
        location: 'City'
    },
    scenes: [],
    shots: []
};

const mockShot: Shot = {
    id: 's1',
    sequence: 1,
    description: 'A cat sitting on a wall',
    shotType: 'Wide Shot',
    characterIds: [],
    generationCandidates: [],
    notes: ''
};

// --- TESTS ---

describe('Free Tier / Student Mode Deep Tests', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Shot Editor Restrictions', () => {
        it('should default to Base View', () => {
            render(
                <ShotEditor
                    project={mockProject}
                    activeShot={mockShot}
                    onClose={vi.fn()}
                    onUpdateShot={vi.fn()}
                    showToast={vi.fn()}
                />
            );

            // Check for Base View specific elements
            expect(screen.getByText(/Base/i)).toBeInTheDocument();
            // Check that Description is visible
            expect(screen.getByPlaceholderText(/Describe the visual.../i)).toBeInTheDocument();
            // Check that Advanced/Pro toggles are NOT visible/accessible in Base mode
            expect(screen.queryByText(/Camera & Style/i)).not.toBeInTheDocument();
        });

        it('should show lock overlay when switching to Pro View', async () => {
            render(
                <ShotEditor
                    project={mockProject}
                    activeShot={mockShot}
                    onClose={vi.fn()}
                    onUpdateShot={vi.fn()}
                    showToast={vi.fn()}
                />
            );

            // Click "Pro" toggle
            const proButton = screen.getByText(/Pro/i);
            fireEvent.click(proButton);

            // Expect Lock Overlay
            expect(await screen.findByText(/Pro Studio Locked/i)).toBeInTheDocument();
            expect(screen.getByText(/Upgrade to Pro/i)).toBeInTheDocument();

            // Check that inputs behind the lock are effectively disabled/hidden
            // (In our implementation, we use a blurring overlay div)
            expect(screen.getByText(/Upgrade to unlock/i)).toBeInTheDocument();
        });

        it('should show "Student Mode" badge in preview header', () => {
            render(
                <ShotEditor
                    project={mockProject}
                    activeShot={mockShot}
                    onClose={vi.fn()}
                    onUpdateShot={vi.fn()}
                    showToast={vi.fn()}
                />
            );
            expect(screen.getByText(/Student Mode/i)).toBeInTheDocument();
        });
    });

    describe('Generation Logic (Free)', () => {
        it('should call generateHybridImage with tier="free"', async () => {
            render(
                <ShotEditor
                    project={mockProject}
                    activeShot={mockShot}
                    onClose={vi.fn()}
                    onUpdateShot={vi.fn()}
                    showToast={vi.fn()}
                />
            );

            // Click Generate
            const generateBtn = screen.getByText(/Fast Generate/i);
            fireEvent.click(generateBtn);

            expect(generateSpy).toHaveBeenCalledWith(
                'free', // The critical check
                expect.objectContaining({ id: 's1' }),
                expect.any(Object),
                expect.any(Array),
                expect.any(Array),
                undefined,
                expect.any(Object)
            );
        });

        it('should disable generation if Pro View is active (Locked)', async () => {
            render(
                <ShotEditor
                    project={mockProject}
                    activeShot={mockShot}
                    onClose={vi.fn()}
                    onUpdateShot={vi.fn()}
                    showToast={vi.fn()}
                />
            );

            // Switch to Pro View
            fireEvent.click(screen.getByText(/Pro/i));

            // Button should change state
            const lockBtn = await screen.findByText(/Unlock Pro to Render/i);
            expect(lockBtn).toBeDisabled();
        });
    });

    describe('Asset Manager Restrictions', () => {
        it('should show lock screen instead of content', () => {
            render(
                <AssetManager
                    projectId="p1"
                    projectShots={[]}
                    showToast={vi.fn()}
                />
            );

            expect(screen.getByText(/Asset Management Locked/i)).toBeInTheDocument();
            expect(screen.queryByText(/Add Character/i)).not.toBeInTheDocument();
        });
    });
});