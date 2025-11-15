import { useState, useEffect } from 'react';
import { Wallet, ArrowDownLeft, ArrowUpRight, RefreshCw, Loader2, Building2, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { provider } from '../utils/api';
import { toast } from 'sonner';
import { useCurrency } from '../utils/currency';

export function ProviderWallet() {
  const { currencySymbol } = useCurrency();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      setLoading(true);
      console.log('Loading wallet...');
      const response = await provider.getWallet();
      console.log('Wallet loaded:', response);
      setWallet(response.wallet);
      setTransactions(response.transactions || []);
    } catch (error: any) {
      console.error('Error loading wallet:', error);
      toast.error('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      const amountNum = parseFloat(amount);
      if (!amountNum || amountNum <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      if (!bankAccount || !accountHolder) {
        toast.error('Please enter bank account details');
        return;
      }

      if (amountNum > (wallet?.balance || 0)) {
        toast.error('Insufficient balance');
        return;
      }

      setProcessing(true);
      console.log('Withdrawing money:', { amount: amountNum, bankAccount, accountHolder });
      
      const response = await provider.withdrawMoney(amountNum, bankAccount, accountHolder);
      console.log('Withdrawal initiated:', response);
      
      setWallet(response.wallet);
      setTransactions(prev => [response.transaction, ...prev]);
      setAmount('');
      setBankAccount('');
      setAccountHolder('');
      setWithdrawOpen(false);
      toast.success(`Withdrawal of ${currencySymbol}${amountNum.toFixed(2)} initiated successfully!`);
    } catch (error: any) {
      console.error('Error withdrawing money:', error);
      toast.error(error.error || 'Failed to withdraw money');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-green-900">My Earnings</h3>
          <p className="text-gray-600">Manage your wallet balance and withdrawals</p>
        </div>
        <Button
          variant="outline"
          onClick={loadWallet}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Wallet Balance Card */}
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Wallet className="w-5 h-5" />
                <span>Available Balance</span>
              </div>
              <div className="text-4xl font-bold text-green-900">
                {currencySymbol}{(wallet?.balance || 0).toFixed(2)}
              </div>
            </div>
            <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white h-12 px-6 flex items-center gap-2"
                  disabled={(wallet?.balance || 0) <= 0}
                >
                  <ArrowUpRight className="w-5 h-5" />
                  Withdraw
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-green-900">Withdraw Money</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-10 h-12"
                        min="0"
                        max={wallet?.balance || 0}
                        step="0.01"
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      Max: {currencySymbol}{(wallet?.balance || 0).toFixed(2)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-holder">Account Holder Name</Label>
                    <Input
                      id="account-holder"
                      type="text"
                      placeholder="John Doe"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank-account">Bank Account Number</Label>
                    <Input
                      id="bank-account"
                      type="text"
                      placeholder="XXXX-XXXX-XXXX"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <Button 
                    onClick={handleWithdraw} 
                    disabled={processing}
                    className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Building2 className="w-5 h-5 mr-2" />
                        Withdraw {currencySymbol}{amount || '0.00'}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Withdrawals are typically processed within 3-5 business days
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="bg-gray-50 border-b-2 border-gray-200">
          <CardTitle className="text-gray-900">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {transactions.map((txn) => (
                <div key={txn.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        txn.type === 'credit' 
                          ? 'bg-green-100' 
                          : 'bg-red-100'
                      }`}>
                        {txn.type === 'credit' ? (
                          <ArrowDownLeft className="w-5 h-5 text-green-600" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-gray-900">{txn.description}</p>
                        <p className="text-sm text-gray-500">{formatDate(txn.timestamp)}</p>
                        {txn.status && (
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                            txn.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : txn.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {txn.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${
                        txn.type === 'credit' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {txn.type === 'credit' ? '+' : '-'}{currencySymbol}{txn.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">Balance: {currencySymbol}{txn.balance.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No transactions yet</p>
              <p className="text-sm text-gray-500 mt-1">Complete jobs to earn money</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
