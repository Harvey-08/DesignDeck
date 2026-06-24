import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ShareDialog from '../ShareDialog';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Mock lucide-react (to simplify the DOM and avoid icon rendering issues in tests)
vi.mock('lucide-react', () => {
    const customMocks = {
        X: (props) => <div data-testid="icon-x" {...props} />,
        UserPlus: (props) => <div data-testid="icon-user-plus" {...props} />,
        Mail: (props) => <div data-testid="icon-mail" {...props} />,
        User: (props) => <div data-testid="icon-user" {...props} />,
        Trash2: (props) => <div data-testid="icon-trash" {...props} />,
        Loader2: (props) => <div data-testid="icon-loader" {...props} />,
        ShieldCheck: (props) => <div data-testid="icon-shield" {...props} />,
        Crown: (props) => <div data-testid="icon-crown" {...props} />,
        Share2: (props) => <div data-testid="icon-share" {...props} />,
        Copy: (props) => <div data-testid="icon-copy" {...props} />,
        Check: (props) => <div data-testid="icon-check" {...props} />,
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

describe('ShareDialog Component', () => {
    const mockOnClose = vi.fn();
    const mockOnUpdate = vi.fn();
    const mockOwner = { _id: 'owner-123', name: 'Original Owner' };
    const mockCurrentUser = { _id: 'owner-123', name: 'Original Owner' };
    const mockMembers = [
        { user: { _id: 'member-1', name: 'Collaborator 1' }, role: 'editor' }
    ];
    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        canvasId: 'canvas-123',
        owner: mockOwner,
        members: mockMembers,
        onUpdate: mockOnUpdate
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup localStorage mocks
        const storage = {
            token: 'fake-token',
            user: JSON.stringify(mockCurrentUser)
        };
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => storage[key]);

        // Mock clipboard
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockImplementation(() => Promise.resolve()),
            },
        });

        // Mock confirm
        vi.spyOn(window, 'confirm').mockImplementation(() => true);
    });

    it('should not render when isOpen is false', () => {
        render(<ShareDialog {...defaultProps} isOpen={false} />);
        expect(screen.queryByText(/Share Room/i)).not.toBeInTheDocument();
    });

    it('should render correctly when isOpen is true', () => {
        render(<ShareDialog {...defaultProps} />);
        expect(screen.getByText(/Share Room/i)).toBeInTheDocument();
        expect(screen.getByText(/Collaboration Settings/i)).toBeInTheDocument();
        expect(screen.getByText('Original Owner')).toBeInTheDocument();
    });

    it('should copy the room link to clipboard', async () => {
        render(<ShareDialog {...defaultProps} />);
        const copyButton = screen.getByRole('button', { name: /copy/i });

        fireEvent.click(copyButton);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href);
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
    });

    it('should show the invite form for the owner', () => {
        render(<ShareDialog {...defaultProps} />);
        expect(screen.getByText(/Invite Collaborator/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/User Email/i)).toBeInTheDocument();
    });

    it('should hide invite form and show message for non-owners', () => {
        const nonOwnerProps = {
            ...defaultProps,
            owner: { _id: 'different-owner', name: 'Some Other Guy' }
        };
        // Mock currentUser as different from owner
        const storage = {
            token: 'fake-token',
            user: JSON.stringify({ _id: 'user-456', name: 'Guest' })
        };
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => storage[key]);

        render(<ShareDialog {...nonOwnerProps} />);

        expect(screen.getByText(/Only the room owner can manage collaborators/i)).toBeInTheDocument();
        expect(screen.queryByPlaceholderText(/User Email/i)).not.toBeInTheDocument();
    });

    it('should successfully send an invite', async () => {
        axios.post.mockResolvedValueOnce({ data: { success: true } });
        render(<ShareDialog {...defaultProps} />);

        const emailInput = screen.getByPlaceholderText(/User Email/i);
        const sendButton = screen.getByRole('button', { name: /send invite/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/canvas/canvas-123/invite'),
                { email: 'test@example.com', role: 'editor' },
                expect.any(Object)
            );
            expect(screen.getByText(/Invite sent to test@example.com!/i)).toBeInTheDocument();
            expect(mockOnUpdate).toHaveBeenCalled();
        });
    });

    it('should successfully send an invite with editor role', async () => {
        axios.post.mockResolvedValueOnce({ data: { success: true } });
        render(<ShareDialog {...defaultProps} />);

        const emailInput = screen.getByPlaceholderText(/User Email/i);
        const roleSelect = screen.getAllByRole('combobox')[0];
        const sendButton = screen.getByRole('button', { name: /send invite/i });

        fireEvent.change(emailInput, { target: { value: 'editor@example.com' } });
        fireEvent.change(roleSelect, { target: { value: 'editor' } });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/canvas/canvas-123/invite'),
                { email: 'editor@example.com', role: 'editor' },
                expect.any(Object)
            );
            expect(screen.getByText(/Invite sent to editor@example.com!/i)).toBeInTheDocument();
        });
    });

    it('should successfully send an invite with viewer role', async () => {
        axios.post.mockResolvedValueOnce({ data: { success: true } });
        render(<ShareDialog {...defaultProps} />);

        const emailInput = screen.getByPlaceholderText(/User Email/i);
        const roleSelect = screen.getAllByRole('combobox')[0];
        const sendButton = screen.getByRole('button', { name: /send invite/i });

        fireEvent.change(emailInput, { target: { value: 'viewer@example.com' } });
        fireEvent.change(roleSelect, { target: { value: 'viewer' } });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/canvas/canvas-123/invite'),
                { email: 'viewer@example.com', role: 'viewer' },
                expect.any(Object)
            );
            expect(screen.getByText(/Invite sent to viewer@example.com!/i)).toBeInTheDocument();
        });
    });

    it('should show error message if invite fails', async () => {
        axios.post.mockRejectedValueOnce({
            response: { data: { message: 'User not found' } }
        });
        render(<ShareDialog {...defaultProps} />);

        const emailInput = screen.getByPlaceholderText(/User Email/i);
        const sendButton = screen.getByRole('button', { name: /send invite/i });

        fireEvent.change(emailInput, { target: { value: 'invalid@example.com' } });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(screen.getByText(/User not found/i)).toBeInTheDocument();
        });
    });

    it('should remove a member when trash icon is clicked', async () => {
        axios.delete.mockResolvedValueOnce({});

        render(<ShareDialog {...defaultProps} />);

        fireEvent.click(screen.getByTestId('icon-trash'));


        expect(window.confirm).toHaveBeenCalled();

        await waitFor(() => {
            expect(screen.getByText(/Collaborator removed/i)).toBeInTheDocument();
            expect(mockOnUpdate).toHaveBeenCalled();
        });
    });
});
