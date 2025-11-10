import { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, RefreshCw, Loader2, CreditCard, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { client } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { useCurrency } from '../utils/currency';

export function ClientWallet() {
  const { currencySymbol } = useCurrency();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      setLoading(true);
      console.log('Loading wallet...');
      const response = await client.getWallet();
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

  const handleAddMoney = async () => {
    try {
      const amountNum = parseFloat(amount);
      if (!amountNum || amountNum <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      setProcessing(true);
      console.log('Adding money:', { amount: amountNum, paymentMethod });
      
      const response = await client.addMoney(amountNum, paymentMethod, `payment_${Date.now()}`);
      console.log('Money added:', response);
      
      setWallet(response.wallet);
      setTransactions(prev => [response.transaction, ...prev]);
      setAmount('');
      setAddMoneyOpen(false);
      toast.success(`${currencySymbol}${amountNum.toFixed(2)} added to wallet successfully!`);
    } catch (error: any) {
      console.error('Error adding money:', error);
      toast.error('Failed to add money to wallet');
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-blue-900">My Wallet</h3>
          <p className="text-gray-600">Manage your wallet balance and transactions</p>
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
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Wallet className="w-5 h-5" />
                <span>Available Balance</span>
              </div>
              <div className="text-4xl font-bold text-blue-900">
                {currencySymbol}{(wallet?.balance || 0).toFixed(2)}
              </div>
            </div>
            <Dialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add Money
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-blue-900">Add Money to Wallet</DialogTitle>
                  <DialogDescription>
                    Choose your payment method and enter the amount you want to add to your wallet.
                  </DialogDescription>
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
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger id="payment-method" className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="card">Credit/Debit Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="netbanking">Net Banking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleAddMoney} 
                    disabled={processing}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5 mr-2" />
                        Add {currencySymbol}{amount || '0.00'}
                      </>
                    )}
                  </Button>
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
              <p className="text-sm text-gray-500 mt-1">Add money to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}