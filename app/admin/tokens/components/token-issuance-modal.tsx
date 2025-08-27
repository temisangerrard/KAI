"use client"

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, AlertTriangle, CheckCircle } from 'lucide-react';
import { UserSelector } from './user-selector';

interface TokenIssuanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedUser?: {
    userId: string;
    userEmail: string;
    displayName: string;
  } | null;
}

interface IssuanceFormData {
  userId: string;
  userEmail: string;
  userDisplayName: string;
  amount: number | '';
  reason: string;
  requiresApproval: boolean;
}

export function TokenIssuanceModal({ isOpen, onClose, onSuccess, preselectedUser }: TokenIssuanceModalProps) {
  const [formData, setFormData] = useState<IssuanceFormData>({
    userId: preselectedUser?.userId || '',
    userEmail: preselectedUser?.userEmail || '',
    userDisplayName: preselectedUser?.displayName || '',
    amount: '',
    reason: '',
    requiresApproval: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Update form data when preselected user changes
  useEffect(() => {
    if (preselectedUser) {
      setFormData(prev => ({
        ...prev,
        userId: preselectedUser.userId,
        userEmail: preselectedUser.userEmail,
        userDisplayName: preselectedUser.displayName
      }));
    }
  }, [preselectedUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amount = typeof formData.amount === 'string' ? parseInt(formData.amount) : formData.amount;

    if (!formData.userId || !amount || !formData.reason) {
      setError('Please fill in all required fields');
      return;
    }

    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setLoading(true);
      
      const requestData = {
        ...formData,
        amount: amount,
        adminId: 'admin-user-id', // TODO: Get from auth context
        adminName: 'Admin User' // TODO: Get from auth context
      };

      console.log('Sending token issuance request:', requestData);
      
      const response = await fetch('/api/admin/tokens/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      console.log('Token issuance response:', { status: response.status, data });

      if (response.ok) {
        setSuccess(data.message || 'Tokens issued successfully');
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      } else {
        setError(data.error || 'Failed to issue tokens');
      }
    } catch (error) {
      console.error('Error issuing tokens:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      userId: '',
      userEmail: '',
      userDisplayName: '',
      amount: '',
      reason: '',
      requiresApproval: false
    });
    setError('');
    setSuccess('');
    onClose();
  };

  const handleUserSelect = (userId: string, userEmail: string, displayName: string) => {
    setFormData(prev => ({
      ...prev,
      userId,
      userEmail,
      userDisplayName: displayName
    }));
  };

  const presetReasons = [
    'Welcome bonus for new user',
    'Compensation for technical issue',
    'Promotional campaign reward',
    'Customer service resolution',
    'Beta testing participation',
    'Community contribution reward'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-kai-600" />
            Issue Tokens to User
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="userId">Select User *</Label>
            <UserSelector
              selectedUserId={formData.userId}
              selectedUserEmail={formData.userEmail}
              onUserSelect={handleUserSelect}
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Search and select the user to receive tokens
            </p>
          </div>

          <div>
            <Label htmlFor="amount">Token Amount *</Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => {
                const value = e.target.value;
                setFormData({ 
                  ...formData, 
                  amount: value === '' ? '' : parseInt(value) || ''
                });
              }}
              placeholder="Enter token amount"
              min="1"
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of tokens to issue to the user
            </p>
          </div>

          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Enter reason for token issuance"
              required
              disabled={loading}
              rows={3}
            />
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-2">Quick reasons:</p>
              <div className="flex flex-wrap gap-1">
                {presetReasons.map((reason, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setFormData({ ...formData, reason })}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                    disabled={loading}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="requiresApproval" className="text-sm font-medium">
                Requires Approval
              </Label>
              <p className="text-xs text-gray-500">
                If enabled, another admin must approve this issuance
              </p>
            </div>
            <Switch
              id="requiresApproval"
              checked={formData.requiresApproval}
              onCheckedChange={(checked) => setFormData({ ...formData, requiresApproval: checked })}
              disabled={loading}
            />
          </div>

          {formData.amount && formData.userId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-1">Issuance Summary</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>User:</strong> {formData.userDisplayName || formData.userEmail || 'Not specified'}</p>
                <p><strong>Email:</strong> {formData.userEmail}</p>
                <p><strong>Amount:</strong> {(typeof formData.amount === 'string' ? parseInt(formData.amount) : formData.amount)?.toLocaleString()} tokens</p>
                <p><strong>Processing:</strong> {formData.requiresApproval ? 'Requires approval' : 'Immediate'}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-kai-600 hover:bg-kai-700"
              disabled={loading}
            >
              {loading ? 'Processing...' : (formData.requiresApproval ? 'Submit for Approval' : 'Issue Tokens')}
            </Button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium">Important Notes:</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• Token issuance is irreversible once processed</li>
                <li>• All issuances are logged for audit purposes</li>
                <li>• Large amounts may trigger additional security checks</li>
                <li>• Users will be notified of token credits to their account</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}