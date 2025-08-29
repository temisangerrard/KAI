"use client"

import { AdminManagement } from '../components/admin-management';

export default function ManageAdminsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
        <p className="text-gray-600 mt-2">
          Manage administrator access and permissions
        </p>
      </div>

      {/* Admin Management Component */}
      <AdminManagement />
    </div>
  );
}