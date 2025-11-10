import { DollarSign, Euro, PoundSterling, IndianRupee } from 'lucide-react';
import { useCurrency } from '../utils/currency';

interface CurrencyIconProps {
  className?: string;
}

export function CurrencyIcon({ className }: CurrencyIconProps) {
  const { currency } = useCurrency();

  switch (currency) {
    case 'EUR':
      return <Euro className={className} />;
    case 'GBP':
      return <PoundSterling className={className} />;
    case 'INR':
      return <IndianRupee className={className} />;
    case 'USD':
    default:
      return <DollarSign className={className} />;
  }
}
