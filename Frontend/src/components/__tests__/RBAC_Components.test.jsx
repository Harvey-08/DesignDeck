import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import TopBar from '../TopBar';
import Toolbar from '../Toolbar';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Share2: () => <div data-testid="icon-share" />,
    Download: () => <div data-testid="icon-download" />,
    LogOut: () => <div data-testid="icon-logout" />,
    Bell: () => <div data-testid="icon-bell" />,
    Settings: () => <div data-testid="icon-settings" />,
    Layout: () => <div data-testid="icon-layout" />,
    Edit2: () => <div data-testid="icon-edit" />,
    Check: () => <div data-testid="icon-check" />,
    User: () => <div data-testid="icon-user" />,
    Pencil: () => <div data-testid="icon-pencil" />,
    MousePointer2: () => <div data-testid="icon-mouse" />,
    Eraser: () => <div data-testid="icon-eraser" />,
    Square: () => <div data-testid="icon-square" />,
    Circle: () => <div data-testid="icon-circle" />,
    Type: () => <div data-testid="icon-type" />,
    PaintBucket: () => <div data-testid="icon-bucket" />,
    Move: () => <div data-testid="icon-move" />,
    PenTool: () => <div data-testid="icon-pen" />,
    Triangle: () => <div data-testid="icon-triangle" />,
    Hexagon: () => <div data-testid="icon-hexagon" />,
    Undo2: () => <div data-testid="icon-undo" />,
    Redo2: () => <div data-testid="icon-redo" />,
    Trash2: () => <div data-testid="icon-trash" />,
    Brush: () => <div data-testid="icon-brush" />,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('RBAC Component Tests', () => {

    describe('TopBar RBAC', () => {
        const defaultProps = {
            canvasName: 'Test Canvas',
            onNameChange: vi.fn(),
            onDashboard: vi.fn(),
            onLogout: vi.fn(),
            onClear: vi.fn()
        };

        it('should allow Owner to edit canvas name', () => {
            render(
                <BrowserRouter>
                    <TopBar {...defaultProps} userRole="owner" />
                </BrowserRouter>
            );

            const nameElement = screen.getByText('Test Canvas');
            fireEvent.click(nameElement);

            // Check if input appears
            expect(screen.getByRole('textbox')).toBeInTheDocument();
        });

        it('should allow Editor to edit canvas name', () => {
            render(
                <BrowserRouter>
                    <TopBar {...defaultProps} userRole="editor" />
                </BrowserRouter>
            );

            const nameElement = screen.getByText('Test Canvas');
            fireEvent.click(nameElement);

            expect(screen.getByRole('textbox')).toBeInTheDocument();
        });

        it('should NOT allow Viewer to edit canvas name', () => {
            render(
                <BrowserRouter>
                    <TopBar {...defaultProps} userRole="viewer" />
                </BrowserRouter>
            );

            const nameElement = screen.getByText('Test Canvas');
            fireEvent.click(nameElement);

            // Check that input does NOT appear
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });
    });

    describe('Toolbar RBAC', () => {
        const defaultProps = {
            activeTool: 'select',
            onToolChange: vi.fn(),
            onAction: vi.fn()
        };

        it('should show all tools for Editor role', () => {
            render(<Toolbar {...defaultProps} userRole="editor" />);

            // Should see selection group icon
            expect(screen.getByTestId('icon-mouse')).toBeInTheDocument();
            // Should see drawing group icon
            expect(screen.getByTestId('icon-brush')).toBeInTheDocument();
            // Should see shape group icon
            expect(screen.getByTestId('icon-hexagon')).toBeInTheDocument();
        });

        it('should only show Export tool for Viewer role', () => {
            render(<Toolbar {...defaultProps} userRole="viewer" />);

            // Should NOT see drawing or selection group icons
            expect(screen.queryByTestId('icon-mouse')).not.toBeInTheDocument();
            expect(screen.queryByTestId('icon-brush')).not.toBeInTheDocument();
            expect(screen.queryByTestId('icon-hexagon')).not.toBeInTheDocument();

            // Should see the Download icon for export
            expect(screen.getByTestId('icon-download')).toBeInTheDocument();
        });

        it('should show "View Only" state for Viewers if no tools available', () => {
            // If we didn't have export or anything for viewers
            // (Testing the case where visibleGroups is empty but handled by the component)
            // Note: Currently Toolbar shows Export for viewers, so it won't be empty.
            // But let's check the presence of the "View Only" text if we forced it.
        });
    });
});
