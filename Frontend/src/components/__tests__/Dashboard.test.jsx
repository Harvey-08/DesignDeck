import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Plus: () => <div data-testid="icon-plus" />,
    Layout: () => <div data-testid="icon-layout" />,
    Clock: () => <div data-testid="icon-clock" />,
    User: () => <div data-testid="icon-user" />,
    ArrowRight: () => <div data-testid="icon-arrow-right" />,
    Trash2: () => <div data-testid="icon-trash" />,
    LogOut: () => <div data-testid="icon-logout" />,
    Search: () => <div data-testid="icon-search" />,
    Grid: () => <div data-testid="icon-grid" />,
    List: () => <div data-testid="icon-list" />,
    Settings: () => <div data-testid="icon-settings" />,
    Users: () => <div data-testid="icon-users" />,
    Star: () => <div data-testid="icon-star" />,
    Filter: () => <div data-testid="icon-filter" />,
    SortAsc: () => <div data-testid="icon-sort-asc" />,
    SortDesc: () => <div data-testid="icon-sort-desc" />,
}));

const renderDashboard = () => {
    return render(
        <BrowserRouter>
            <Dashboard />
        </BrowserRouter>
    );
};

describe('Dashboard Visibility Flow', () => {
    const mockUser = { _id: 'user-123', name: 'Test User' };

    const mockCanvases = [
        {
            canvasId: 'canvas-owned',
            name: 'My Private Design',
            owner: 'user-123',
            updatedAt: new Date().toISOString(),
            isFavorite: false,
        },
        {
            canvasId: 'canvas-shared',
            name: 'Shared Team Project',
            owner: 'other-user',
            updatedAt: new Date().toISOString(),
            isFavorite: false,
            members: [{ user: 'user-123', role: 'editor' }],
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('token', 'fake-token');
        localStorage.setItem('user', JSON.stringify(mockUser));

        axios.get.mockResolvedValue({ data: mockCanvases });
    });

    it('should show both owned and shared canvases in the dashboard', async () => {
        renderDashboard();

        await waitFor(() => {
            const titles = screen.getAllByRole('heading', { level: 3 });

            expect(
                titles.some(t => t.textContent === 'My Private Design')
            ).toBe(true);

            expect(
                titles.some(t => t.textContent === 'Shared Team Project')
            ).toBe(true);
        });

        expect(axios.get).toHaveBeenCalledWith(
            expect.stringContaining('/api/canvas/my-canvases'),
            expect.any(Object)
        );
    });

    it('should render the correct number of canvas cards', async () => {
        renderDashboard();

        await waitFor(() => {
            const canvasTitles = screen.getAllByRole('heading', { level: 3 });
            expect(canvasTitles).toHaveLength(2);

            const titleTexts = canvasTitles.map(t => t.textContent);

            expect(titleTexts).toContain('My Private Design');
            expect(titleTexts).toContain('Shared Team Project');
        });
    });
});
