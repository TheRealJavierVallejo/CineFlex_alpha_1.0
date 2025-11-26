import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
    it('should render button with children text', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should apply primary variant styles', () => {
        render(<Button variant="primary">Primary Button</Button>);
        const button = screen.getByText('Primary Button');
        expect(button).toHaveClass('bg-accent');
    });

    it('should apply secondary variant styles', () => {
        render(<Button variant="secondary">Secondary Button</Button>);
        const button = screen.getByText('Secondary Button');
        expect(button).toHaveClass('bg-[#2D2D30]');
    });

    it('should be disabled when disabled prop is true', () => {
        render(<Button disabled>Disabled Button</Button>);
        const button = screen.getByText('Disabled Button');
        expect(button).toBeDisabled();
    });

    it('should show loading spinner when loading prop is true', () => {
        render(<Button loading>Loading Button</Button>);
        // LoadingSpinner uses Loader2 icon from lucide-react
        const button = screen.getByText('Loading Button');
        expect(button).toBeDisabled();
        expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should apply small size styles', () => {
        render(<Button size="sm">Small Button</Button>);
        const button = screen.getByText('Small Button');
        expect(button).toHaveClass('h-6');
    });

    it('should apply medium size styles by default', () => {
        render(<Button>Default Button</Button>);
        const button = screen.getByText('Default Button');
        expect(button).toHaveClass('h-7');
    });

    it('should apply large size styles', () => {
        render(<Button size="lg">Large Button</Button>);
        const button = screen.getByText('Large Button');
        expect(button).toHaveClass('h-9');
    });
});
