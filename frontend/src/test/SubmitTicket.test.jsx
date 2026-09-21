import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SubmitTicket from '../pages/SubmitTicket';

// Mock api
vi.mock('../services/api', () => ({
  default: { post: vi.fn() },
}));

// Mock ReCAPTCHA
vi.mock('react-google-recaptcha', () => ({
  default: React.forwardRef((props, ref) => <div data-testid="recaptcha" />),
}));

// Mock RichTextEditor
vi.mock('../components/RichTextEditor', () => ({
  default: ({ onChange }) => <textarea data-testid="rte" onChange={e => onChange(e.target.value)} />,
}));

// Mock FileUpload
vi.mock('../components/FileUpload', () => ({
  default: () => <div data-testid="file-upload" />,
}));

function renderPage() {
  return render(<MemoryRouter><SubmitTicket /></MemoryRouter>);
}

describe('SubmitTicket', () => {
  it('renders form fields', () => {
    renderPage();
    expect(screen.getByText('Submit a ticket')).toBeInTheDocument();
    expect(screen.getByText(/Subject/)).toBeInTheDocument();
    expect(screen.getByText(/Requester/)).toBeInTheDocument();
    expect(screen.getByText(/Priority/)).toBeInTheDocument();
    expect(screen.getByText(/Description/)).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => {
      expect(screen.getByText('Subject is required')).toBeInTheDocument();
      expect(screen.getByText('Requester email is required')).toBeInTheDocument();
    });
  });

  it('shows email validation error for invalid email', async () => {
    renderPage();
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Test subject' } });
    fireEvent.change(inputs[1], { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });
});
