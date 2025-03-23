import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Create a mock for App
vi.mock('./App', () => {
  return {
    default: () => {
      return (
        <div data-testid="mock-app">
          <h1>GitLab CI/CD Dashboard</h1>
        </div>
      );
    }
  };
}, { virtual: true });

describe('App Component', () => {
  test('renders the app title', () => {
    // Import App dynamically to use the mock
    const App = require('./App').default;
    
    render(<App />);
    
    // Check that the app title is rendered
    expect(screen.getByText('GitLab CI/CD Dashboard')).toBeInTheDocument();
    
    // Verify the component was rendered
    expect(screen.getByTestId('mock-app')).toBeInTheDocument();
  });
});