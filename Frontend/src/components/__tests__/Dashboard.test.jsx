import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Mock lucide-react icons
vi.mock('lucide-react', () => {
    const customMocks = {
        Plus: (props) => <div data-testid="icon-plus" {...props} />,
        Layout: (props) => <div data-testid="icon-layout" {...props} />,
        Clock: (props) => <div data-testid="icon-clock" {...props} />,
        User: (props) => <div data-testid="icon-user" {...props} />,
        ArrowRight: (props) => <div data-testid="icon-arrow-right" {...props} />,
        Trash2: (props) => <div data-testid="icon-trash" {...props} />,
        LogOut: (props) => <div data-testid="icon-logout" {...props} />,
        Search: (props) => <div data-testid="icon-search" {...props} />,
        Grid: (props) => <div data-testid="icon-grid" {...props} />,
        List: (props) => <div data-testid="icon-list" {...props} />,
        Settings: (props) => <div data-testid="icon-settings" {...props} />,
        Users: (props) => <div data-testid="icon-users" {...props} />,
        Star: (props) => <div data-testid="icon-star" {...props} />,
        Filter: (props) => <div data-testid="icon-filter" {...props} />,
        SortAsc: (props) => <div data-testid="icon-sort-asc" {...props} />,
        SortDesc: (props) => <div data-testid="icon-sort-desc" {...props} />,
    };
    return new Proxy(customMocks, {
        get: (target, prop) => {
            if (prop in target) return target[prop];
            if (typeof prop === 'string' && /^[A-Z]/.test(prop)) {
                target[prop] = (props) => <div data-testid={`icon-${prop.toLowerCase()}`} {...props} />;
                return target[prop];
            }
            return target[prop];
        }
    });
});

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

    it('should show owned canvases under My Canvases and shared under Shared With Me', async () => {
        renderDashboard();

        // 1. Click "My Canvases" tab
        await waitFor(() => {
            const myCanvasesTab = screen.getByRole('button', { name: /My Canvases/i });
            myCanvasesTab.click();
        });

        await waitFor(() => {
            expect(screen.getByText('My Private Design')).toBeInTheDocument();
            expect(screen.queryByText('Shared Team Project')).not.toBeInTheDocument();
        });

        // 2. Click "Shared With Me" tab
        const sharedTab = screen.getByRole('button', { name: /Shared With Me/i });
        sharedTab.click();

        await waitFor(() => {
            expect(screen.getByText('Shared Team Project')).toBeInTheDocument();
            expect(screen.queryByText('My Private Design')).not.toBeInTheDocument();
        });

        expect(axios.get).toHaveBeenCalledWith(
            expect.stringContaining('/api/canvas/my-canvases'),
            expect.any(Object)
        );
    });

    it('should render the correct canvases when tabs are selected', async () => {
        renderDashboard();

        // Click "My Canvases"
        await waitFor(() => {
            screen.getByRole('button', { name: /My Canvases/i }).click();
        });

        await waitFor(() => {
            const canvasTitles = screen.getAllByRole('heading', { level: 3 });
            const titleTexts = canvasTitles.map(t => t.textContent);
            expect(titleTexts).toContain('My Private Design');
            expect(titleTexts).not.toContain('Shared Team Project');
        });
    });
});
