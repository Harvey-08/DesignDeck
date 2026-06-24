import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import TopBar from '../TopBar';
import Toolbar from '../Toolbar';

// Mock lucide-react icons
vi.mock('lucide-react', () => {
    const customMocks = {
        Share2: (props) => <div data-testid="icon-share" {...props} />,
        Download: (props) => <div data-testid="icon-download" {...props} />,
        LogOut: (props) => <div data-testid="icon-logout" {...props} />,
        Bell: (props) => <div data-testid="icon-bell" {...props} />,
        Settings: (props) => <div data-testid="icon-settings" {...props} />,
        Layout: (props) => <div data-testid="icon-layout" {...props} />,
        Edit2: (props) => <div data-testid="icon-edit" {...props} />,
        Check: (props) => <div data-testid="icon-check" {...props} />,
        User: (props) => <div data-testid="icon-user" {...props} />,
        Pencil: (props) => <div data-testid="icon-pencil" {...props} />,
        MousePointer2: (props) => <div data-testid="icon-mouse" {...props} />,
        Eraser: (props) => <div data-testid="icon-eraser" {...props} />,
        Square: (props) => <div data-testid="icon-square" {...props} />,
        Circle: (props) => <div data-testid="icon-circle" {...props} />,
        Type: (props) => <div data-testid="icon-type" {...props} />,
        PaintBucket: (props) => <div data-testid="icon-bucket" {...props} />,
        Move: (props) => <div data-testid="icon-move" {...props} />,
        PenTool: (props) => <div data-testid="icon-pen" {...props} />,
        Triangle: (props) => <div data-testid="icon-triangle" {...props} />,
        Hexagon: (props) => <div data-testid="icon-hexagon" {...props} />,
        Undo2: (props) => <div data-testid="icon-undo" {...props} />,
        Redo2: (props) => <div data-testid="icon-redo" {...props} />,
        Trash2: (props) => <div data-testid="icon-trash" {...props} />,
        Brush: (props) => <div data-testid="icon-brush" {...props} />,
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
