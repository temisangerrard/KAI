"use client"

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, DollarSign, Coins } from 'lucide-react';
import { TokenPackage } from '@/lib/types/token';

interface TokenPackageFormData {
  name: string;
  tokens: number;
  priceUSD: number;
  bonusTokens: number;
  sortOrder: number;
}

export function TokenPackageManager() {
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<TokenPackage | null>(null);
  const [formData, setFormData] = useState<TokenPackageFormData>({
    name: '',
    tokens: 0,
    priceUSD: 0,
    bonusTokens: 0,
    sortOrder: 0
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/tokens/packages');
      if (response.ok) {
        const data = await response.json();
        setPackages(data.packages || []);
      } else {
        console.error('Failed to fetch packages');
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/tokens/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchPackages();
        setIsCreateModalOpen(false);
        resetForm();
      } else {
        console.error('Failed to create package');
      }
    } catch (error) {
      console.error('Error creating package:', error);
    }
  };

  const handleUpdatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage) return;

    try {
      const response = await fetch('/api/admin/tokens/packages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPackage.id,
          ...formData
        })
      });

      if (response.ok) {
        await fetchPackages();
        setIsEditModalOpen(false);
        setEditingPackage(null);
        resetForm();
      } else {
        console.error('Failed to update package');
      }
    } catch (error) {
      console.error('Error updating package:', error);
    }
  };

  const handleToggleActive = async (packageId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/admin/tokens/packages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: packageId,
          isActive: !isActive
        })
      });

      if (response.ok) {
        await fetchPackages();
      } else {
        console.error('Failed to toggle package status');
      }
    } catch (error) {
      console.error('Error toggling package status:', error);
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;

    try {
      const response = await fetch(`/api/admin/tokens/packages?id=${packageId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchPackages();
      } else {
        console.error('Failed to delete package');
      }
    } catch (error) {
      console.error('Error deleting package:', error);
    }
  };

  const openEditModal = (pkg: TokenPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      tokens: pkg.tokens,
      priceUSD: pkg.priceUSD,
      bonusTokens: pkg.bonusTokens,
      sortOrder: pkg.sortOrder
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      tokens: 0,
      priceUSD: 0,
      bonusTokens: 0,
      sortOrder: 0
    });
  };

  const calculateTokenValue = (tokens: number, bonusTokens: number, priceUSD: number) => {
    const totalTokens = tokens + bonusTokens;
    return totalTokens > 0 ? (priceUSD / totalTokens).toFixed(3) : '0.000';
  };

  const PackageForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void, submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Package Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Starter Pack"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tokens">Base Tokens</Label>
          <Input
            id="tokens"
            type="number"
            value={formData.tokens}
            onChange={(e) => setFormData({ ...formData, tokens: parseInt(e.target.value) || 0 })}
            min="1"
            required
          />
        </div>
        <div>
          <Label htmlFor="bonusTokens">Bonus Tokens</Label>
          <Input
            id="bonusTokens"
            type="number"
            value={formData.bonusTokens}
            onChange={(e) => setFormData({ ...formData, bonusTokens: parseInt(e.target.value) || 0 })}
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priceUSD">Price (USD)</Label>
          <Input
            id="priceUSD"
            type="number"
            step="0.01"
            value={formData.priceUSD}
            onChange={(e) => setFormData({ ...formData, priceUSD: parseFloat(e.target.value) || 0 })}
            min="0.01"
            required
          />
        </div>
        <div>
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Input
            id="sortOrder"
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
            min="0"
          />
        </div>
      </div>

      {formData.tokens > 0 && formData.priceUSD > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Total Tokens:</strong> {formData.tokens + formData.bonusTokens} 
            ({formData.tokens} base + {formData.bonusTokens} bonus)
          </p>
          <p className="text-sm text-gray-600">
            <strong>Value per Token:</strong> ${calculateTokenValue(formData.tokens, formData.bonusTokens, formData.priceUSD)}
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
            resetForm();
          }}
        >
          Cancel
        </Button>
        <Button type="submit" className="bg-kai-600 hover:bg-kai-700">
          {submitLabel}
        </Button>
      </div>
    </form>
  );

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Token Packages</h3>
            <p className="text-sm text-gray-600">Manage available token purchase packages</p>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-kai-600 hover:bg-kai-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Package
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Token Package</DialogTitle>
              </DialogHeader>
              <PackageForm onSubmit={handleCreatePackage} submitLabel="Create Package" />
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Value/Token</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{pkg.name}</p>
                      <p className="text-sm text-gray-500">Order: {pkg.sortOrder}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Coins className="w-4 h-4 text-kai-600" />
                      <span className="font-medium">{pkg.tokens.toLocaleString()}</span>
                      {pkg.bonusTokens > 0 && (
                        <span className="text-sm text-green-600">+{pkg.bonusTokens}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-medium">{pkg.priceUSD.toFixed(2)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      ${calculateTokenValue(pkg.tokens, pkg.bonusTokens, pkg.priceUSD)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={pkg.isActive ? "default" : "secondary"}>
                        {pkg.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Switch
                        checked={pkg.isActive}
                        onCheckedChange={() => handleToggleActive(pkg.id, pkg.isActive)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(pkg)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePackage(pkg.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {packages.length === 0 && (
          <div className="text-center py-8">
            <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No token packages found</p>
            <p className="text-sm text-gray-400">Create your first package to get started</p>
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Token Package</DialogTitle>
          </DialogHeader>
          <PackageForm onSubmit={handleUpdatePackage} submitLabel="Update Package" />
        </DialogContent>
      </Dialog>
    </div>
  );
}