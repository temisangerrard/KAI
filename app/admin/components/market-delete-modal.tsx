"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle, Users, Coins, Loader2 } from 'lucide-react';

interface MarketDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  market: {
    id: string;
    title: string;
    totalParticipants: number;
    totalTokensCommitted: number;
  };
  loading?: boolean;
  error?: string | null;
}

export function MarketDeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  market, 
  loading = false,
  error = null
}: MarketDeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const expectedText = 'DELETE';
  const canDelete = confirmText === expectedText;

  const handleClose = () => {
    if (!loading) {
      setConfirmText('');
      onClose();
    }
  };

  // Reset confirmation text when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (canDelete && !loading) {
      onConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            Delete Market
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Warning Alert */}
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">
              This action cannot be undone. This will permanently delete the market and all associated data.
            </AlertDescription>
          </Alert>

          {/* Market Details */}
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-900">Market to Delete:</h4>
              <p className="text-sm text-gray-600 mt-1 p-2 bg-gray-50 rounded border">
                {market.title}
              </p>
            </div>

            {/* Impact Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                <Users className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {market.totalParticipants}
                  </div>
                  <div className="text-xs text-gray-500">Participants</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                <Coins className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {market.totalTokensCommitted.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Tokens Staked</div>
                </div>
              </div>
            </div>

            {/* Additional Warning for Active Markets */}
            {(market.totalParticipants > 0 || market.totalTokensCommitted > 0) && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  This market has active participants and committed tokens. Deleting it will affect user balances and commitments.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              Type <span className="font-mono bg-gray-100 px-1 rounded">{expectedText}</span> to confirm deletion:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Type DELETE to confirm"
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canDelete || loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Market
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}