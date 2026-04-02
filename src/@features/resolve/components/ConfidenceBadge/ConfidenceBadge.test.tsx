import { render, screen } from '@testing-library/react';
import { ConfidenceBadge } from '@features/resolve/components/ConfidenceBadge';

describe('ConfidenceBadge', () => {
  describe('when unresolved', () => {
    it('renders "Unresolved" chip when isResolved is false', () => {
      render(<ConfidenceBadge score={85} isResolved={false} />);
      expect(screen.getByText('Unresolved')).toBeInTheDocument();
    });

    it('renders "Unresolved" regardless of score value', () => {
      render(<ConfidenceBadge score={100} isResolved={false} />);
      expect(screen.getByText('Unresolved')).toBeInTheDocument();
    });
  });

  describe('high confidence (score >= 90)', () => {
    it('renders "High (100%)" for a perfect score', () => {
      render(<ConfidenceBadge score={100} isResolved={true} />);
      expect(screen.getByText('High (100%)')).toBeInTheDocument();
    });

    it('renders "High (90%)" at the boundary', () => {
      render(<ConfidenceBadge score={90} isResolved={true} />);
      expect(screen.getByText('High (90%)')).toBeInTheDocument();
    });

    it('applies success color for high confidence', () => {
      const { container } = render(<ConfidenceBadge score={95} isResolved={true} />);
      const chip = container.querySelector('.MuiChip-colorSuccess');
      expect(chip).toBeInTheDocument();
    });
  });

  describe('medium confidence (70 <= score < 90)', () => {
    it('renders "Medium (75%)" for mid-range score', () => {
      render(<ConfidenceBadge score={75} isResolved={true} />);
      expect(screen.getByText('Medium (75%)')).toBeInTheDocument();
    });

    it('renders "Medium (70%)" at the lower boundary', () => {
      render(<ConfidenceBadge score={70} isResolved={true} />);
      expect(screen.getByText('Medium (70%)')).toBeInTheDocument();
    });

    it('renders "Medium (89%)" at the upper boundary', () => {
      render(<ConfidenceBadge score={89} isResolved={true} />);
      expect(screen.getByText('Medium (89%)')).toBeInTheDocument();
    });

    it('applies warning color for medium confidence', () => {
      const { container } = render(<ConfidenceBadge score={75} isResolved={true} />);
      const chip = container.querySelector('.MuiChip-colorWarning');
      expect(chip).toBeInTheDocument();
    });
  });

  describe('low confidence (score < 70)', () => {
    it('renders "Low (50%)" for a low score', () => {
      render(<ConfidenceBadge score={50} isResolved={true} />);
      expect(screen.getByText('Low (50%)')).toBeInTheDocument();
    });

    it('renders "Low (69%)" just below medium boundary', () => {
      render(<ConfidenceBadge score={69} isResolved={true} />);
      expect(screen.getByText('Low (69%)')).toBeInTheDocument();
    });

    it('applies error color for low confidence', () => {
      const { container } = render(<ConfidenceBadge score={50} isResolved={true} />);
      const chip = container.querySelector('.MuiChip-colorError');
      expect(chip).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('renders "Low (0%)" when score is null', () => {
      render(<ConfidenceBadge score={null} isResolved={true} />);
      expect(screen.getByText('Low (0%)')).toBeInTheDocument();
    });

    it('renders "Low (0%)" when score is 0', () => {
      render(<ConfidenceBadge score={0} isResolved={true} />);
      expect(screen.getByText('Low (0%)')).toBeInTheDocument();
    });
  });
});
