import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, CheckCircle2, ShieldCheck, TrendingUp } from "lucide-react";

const DISMISS_KEY = "connectWalletPromptSeen";

export default function ConnectWalletPrompt() {
  const { address, connect, isConnecting } = useWallet();
  const [open, setOpen] = useState(false);

  // Open once on first visit if not connected
  useEffect(() => {
    const seen = localStorage.getItem(DISMISS_KEY) === "1";
    if (!address && !seen) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [address]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  const handleConnect = async (type: 'keplr' | 'leap') => {
    try {
      await connect(type);
      setOpen(false);
    } catch (err) {
      // keep dialog open so user can try the other wallet
      console.error("Wallet connect failed:", err);
    }
  };

  // Never render if already connected
  if (address) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect your wallet
          </DialogTitle>
          <DialogDescription>
            Connect Keplr or Leap to unlock better functionality: personalized balances, direct actions, and seamless interactions.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 text-sm mt-2">
          <li className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            One-click actions on pools and protocols
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-blue-500" />
            Safer, on-chain interactions with your wallet
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            View balances and yields tailored to you
          </li>
        </ul>

        <DialogFooter className="mt-4 flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1 flex gap-2">
            <Button
              className="flex-1"
              variant="default"
              onClick={() => handleConnect('keplr')}
              disabled={isConnecting}
            >
              Connect Keplr
            </Button>
            <Button
              className="flex-1"
              variant="secondary"
              onClick={() => handleConnect('leap')}
              disabled={isConnecting}
            >
              Connect Leap
            </Button>
          </div>
          <Button variant="ghost" onClick={handleDismiss}>Not now</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
