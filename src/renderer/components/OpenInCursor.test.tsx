import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OpenInCursor } from './OpenInCursor';

describe('OpenInCursor', () => {
  beforeEach(() => {
    // Mock window.flowrider.cursor
    (window as any).flowrider = {
      cursor: {
        checkInstalled: vi.fn().mockResolvedValue({ installed: true }),
        open: vi.fn().mockResolvedValue({ success: true }),
      },
    };
  });

  it('should render button when Cursor is installed', async () => {
    render(<OpenInCursor workingDir="/test/path" />);

    await waitFor(() => {
      expect(screen.getByText('Open in Cursor')).toBeInTheDocument();
    });
  });

  it('should not render button when Cursor is not installed', async () => {
    (window as any).flowrider.cursor.checkInstalled = vi.fn().mockResolvedValue({ installed: false });

    const { container } = render(<OpenInCursor workingDir="/test/path" />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should call cursor.open when button is clicked', async () => {
    const mockOpen = vi.fn().mockResolvedValue({ success: true });
    (window as any).flowrider.cursor.open = mockOpen;

    render(<OpenInCursor workingDir="/test/path" />);

    await waitFor(() => {
      expect(screen.getByText('Open in Cursor')).toBeInTheDocument();
    });

    const button = screen.getByText('Open in Cursor');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledWith('/test/path');
    });
  });

  it('should show error alert when opening fails', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    (window as any).flowrider.cursor.open = vi.fn().mockResolvedValue({
      success: false,
      error: 'Cursor CLI not installed',
    });

    render(<OpenInCursor workingDir="/test/path" />);

    await waitFor(() => {
      expect(screen.getByText('Open in Cursor')).toBeInTheDocument();
    });

    const button = screen.getByText('Open in Cursor');
    fireEvent.click(button);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Cursor CLI not installed');
    });

    alertMock.mockRestore();
  });

  it('should show "Opening..." text while opening', async () => {
    let resolveOpen: (value: any) => void;
    const openPromise = new Promise((resolve) => {
      resolveOpen = resolve;
    });
    (window as any).flowrider.cursor.open = vi.fn().mockReturnValue(openPromise);

    render(<OpenInCursor workingDir="/test/path" />);

    await waitFor(() => {
      expect(screen.getByText('Open in Cursor')).toBeInTheDocument();
    });

    const button = screen.getByText('Open in Cursor');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Opening...')).toBeInTheDocument();
    });

    // Resolve the promise to clean up
    resolveOpen!({ success: true });
  });
});
