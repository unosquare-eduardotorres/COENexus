import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import YearSelector from './YearSelector';

describe('YearSelector', () => {
  it('should render all year buttons from 2026 to 2014 plus 2013 & Older', () => {
    render(<YearSelector selectedYear={null} onYearChange={() => {}} />);

    for (let y = 2014; y <= 2026; y++) {
      expect(screen.getByText(String(y))).toBeInTheDocument();
    }
    expect(screen.getByText('2013 & Older')).toBeInTheDocument();
  });

  it('should fire onYearChange with the clicked year', () => {
    const onChange = vi.fn();
    render(<YearSelector selectedYear={null} onYearChange={onChange} />);

    fireEvent.click(screen.getByText('2024'));
    expect(onChange).toHaveBeenCalledWith(2024);
  });

  it('should fire onYearChange with 2013 when clicking 2013 & Older', () => {
    const onChange = vi.fn();
    render(<YearSelector selectedYear={null} onYearChange={onChange} />);

    fireEvent.click(screen.getByText('2013 & Older'));
    expect(onChange).toHaveBeenCalledWith(2013);
  });

  it('should highlight the selected year with accent ring', () => {
    render(<YearSelector selectedYear={2025} onYearChange={() => {}} />);

    const selected = screen.getByText('2025');
    expect(selected.className).toContain('ring-2');
    expect(selected.className).toContain('ring-accent-500');
  });

  it('should apply disabled styling when disabled is true', () => {
    const { container } = render(
      <YearSelector selectedYear={2025} onYearChange={() => {}} disabled />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('opacity-60');
    expect(wrapper.className).toContain('pointer-events-none');
  });
});
