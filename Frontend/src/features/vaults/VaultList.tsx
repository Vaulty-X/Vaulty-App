'use client';

import { useState } from 'react';
import { Plus, Lock, Calendar, TrendingUp } from 'lucide-react';
import { VaultEmptyState } from './VaultEmptyState';

interface Vault {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  lockPeriod: number;
  maturityDate: string;
  apy: number;
}

export function VaultList() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Your Vaults</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Create Vault
        </button>
      </div>

      {vaults.length === 0 ? (
        <VaultEmptyState onCreateVault={() => setShowCreateModal(true)} />
      ) : (
        <div className="grid gap-4">
          {vaults.map((vault) => (
            <div
              key={vault.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{vault.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Lock size={16} />
                    <span>Locked for {vault.lockPeriod} days</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-600">
                    ${vault.currentAmount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    of ${vault.targetAmount.toLocaleString()} goal
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(vault.currentAmount / vault.targetAmount) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar size={16} />
                  <span>Matures: {new Date(vault.maturityDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <TrendingUp size={16} />
                  <span>{vault.apy}% APY</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Create New Vault</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Vault Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Emergency Fund"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target Amount ($)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lock Period (days)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="30"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button className="btn-primary flex-1">Create Vault</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
