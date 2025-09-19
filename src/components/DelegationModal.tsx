import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/context/WalletContext';
import { useToast } from '@/hooks/use-toast';

interface ValidatorInfo {
  id: string;
  name: string;
  logoUrl: string | null;
  commission: number;
  votingPower: number;
  tags: string[];
  isHidden: boolean;
}

interface DelegationModalProps {
  isOpen: boolean;
  onClose: () => void;
  validator: ValidatorInfo | null;
  availableBalance?: string;
}

const DelegationModal: React.FC<DelegationModalProps> = ({
  isOpen,
  onClose,
  validator,
  availableBalance = '0'
}) => {
  const [amount, setAmount] = useState<string>('');
  const [isStaking, setIsStaking] = useState(false);
  const [error, setError] = useState<string>('');
  const { client, address } = useWallet();
  const { toast } = useToast();

  const balance = parseFloat(availableBalance) / 1e6;
  const maxStakeAmount = Math.max(0, balance - 0.01); // Reserve 0.01 ATOM for gas

  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setError('');
    }
  }, [isOpen]);

  const handleMaxClick = () => {
    setAmount(maxStakeAmount.toString());
    setError('');
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setError('Please enter a valid number');
    } else if (numValue <= 0) {
      setError('Amount must be greater than 0');
    } else if (numValue > maxStakeAmount) {
      setError('Insufficient balance (including gas fee)');
    } else {
      setError('');
    }
  };

  const handleDelegate = async () => {
    if (!client || !address || !validator || !amount || error) return;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > maxStakeAmount) {
      setError('Invalid amount');
      return;
    }

    setIsStaking(true);
    try {
      const msg = {
        typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
        value: {
          delegatorAddress: address,
          validatorAddress: validator.id,
          amount: {
            denom: "uatom",
            amount: (numAmount * 1000000).toString(),
          },
        },
      };

      const tx = await client.signAndBroadcast(
        address,
        [msg],
        {
          amount: [{ denom: "uatom", amount: "5000" }],
          gas: "200000",
        }
      );
      
      if (tx.code === 0) {
        toast({
          title: "Success!",
          description: `Successfully delegated ${numAmount} ATOM to ${validator.name}`,
        });
        onClose();
        setAmount('');
      } else {
        toast({
          title: "Delegation Failed",
          description: tx.rawLog || "Transaction failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Delegation error:', error);
      toast({
        title: "Delegation Failed",
        description: (error as Error).message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsStaking(false);
    }
  };

  if (!validator) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {validator.logoUrl ? (
                <AvatarImage src={validator.logoUrl} alt={validator.name} />
              ) : null}
              <AvatarFallback>{validator.name.charAt(0)}</AvatarFallback>
            </Avatar>
            Delegate to {validator.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Validator Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Commission</span>
              <span className="font-medium">{validator.commission.toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Voting Power</span>
              <span className="font-medium">{validator.votingPower.toLocaleString()} ATOM</span>
            </div>
            {validator.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {validator.tags.slice(0, 3).map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {validator.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">+{validator.tags.length - 3}</Badge>
                )}
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="amount">Amount (ATOM)</Label>
              <div className="text-sm text-muted-foreground">
                Available: {balance.toFixed(6)} ATOM
              </div>
            </div>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.000000"
                className="pr-16"
                step="0.000001"
                min="0"
                max={maxStakeAmount}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleMaxClick}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2 text-xs"
              >
                MAX
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isStaking}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelegate}
              disabled={!amount || error !== '' || isStaking || !client}
              className="flex-1"
            >
              {isStaking ? 'Delegating...' : 'Delegate'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DelegationModal;
